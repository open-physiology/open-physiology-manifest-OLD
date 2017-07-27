import {inRange, size, entries, isFunction} from 'lodash-bound';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import ObservableSet from '../util/ObservableSet';
import {humanMsg, callOrReturn} from 'utilities';
import {constraint, setEquals} from '../util/misc';

import RelField_factory from './RelField.js';

import {
	$$owner,
	$$key,
	$$desc,
	$$value,
	$$entriesIn,
	$$initSet
} from './symbols';


/** @wrapper */
export default (env) => {
	
	const RelField = RelField_factory(env);
	
	/**
	 * A field on an `Entity` representing the 'many'-side
	 * of a many-to-many or many-to-one relationship.
	 * Therefore, its value is always a `Set`.
	 */
	class Rel$Field extends RelField {
		
		// this[$$owner] instanceof Resource
		// this[$$key]   instanceof "-->ContainsMaterial" | "-->HasPart" | "<--FlowsTo" | ...
		// this[$$value] instanceof Set<IsRelatedTo>
		
		////////////
		// static //
		////////////
		
		/**
		 * Equip an `Entity` subclass `cls` with a particular property field.
		 * @param {Object}   options
		 * @param {Class}    options.cls     - a subclass of `Entity` still under construction
		 * @param {string}   options.key     - the key for the field to put in
		 * @param {string}   options.aliases - additional keys for this field
		 * @param {Object}  [options.desc]
		 * @param {boolean} [options.desc.readonly] - whether this field should be read-only
		 */
		static initClass(options) {
			const { cls, key, aliases, desc: {readonly} } = options;
			assert(cls.isResource);
			if (cls.prototype.hasOwnProperty(key)) { return }
			for (let k of [key, ...aliases]) {
				cls.prototype::defineProperty(k, {
					get() { return this.fields[k].get() },
					...(readonly ? {} : {
						set(val) { this.fields[k].set(val)}
					}),
					enumerable:   true,
					configurable: false
				});
			}
		}
		
		/** @private */
		static [$$entriesIn](cls) {
			if (!cls.isResource) { return [] }
			return cls.relationships::entries()
				.filter(([,rel]) => rel.cardinality.max > 1)
				.map(([key, desc]) => ({
					key,
					desc,
					aliases: desc.shortcutKey ? [desc.shortcutKey] : []
				}));
		}
		
		/**
		 * The function used for testing the values of this field for set-equality.
		 * @param a
		 * @param b
		 * @returns {boolean}
		 */
		static isEqual = setEquals;
		
		
		//////////////
		// instance //
		//////////////
		
		/**
		 * Create a new instance of this field on a specific entity.
		 * @protected
		 * @param {Object}    options
		 * @param {Entity}    options.owner                       - the entity on which to create this field
		 * @param {string}    options.key                         - the key on that entity corresponding to this field
		 * @param {Object}    options.desc                        - the descriptor for what kind of field this is
		 * @param {string}   [options.initialValue]               - the initial value for this field
		 * @param {Iterable} [options.aliases=[]]                 - other keys to which this field should answer
		 * @param {Object}   [options.aliasInitialValues=[]]      - other keys to which this field should answer
		 * @param {boolean}  [options.setValueThroughSignal=true] - whether signals sent to `field.p('value')` should be accepted
		 * @param {Object}   [options.valueTrackerOptions={}]     - the `ValueTracker` options to use for each field's observable properties
		 */
		constructor(options) {
			super({ ...options, setValueThroughSignal: false });
			const {owner, desc, initialValue, aliasInitialValues} = options;
			
			/* initialize an empty observable set */
			this::defineProperty($$value, { value: new ObservableSet });
			
			/* set the initial value */
			const initialScValue = aliasInitialValues[desc.shortcutKey];
			constraint(!initialValue || !initialScValue, humanMsg`
				You cannot set the fields '${desc.keyInResource}' and '${desc.shortcutKey}'
				at the same time for a ${this.constructor.singular}.
			`);
			this[$$initSet](
				[initialValue   && initialValue  [Symbol.iterator], () => initialValue  ::callOrReturn(owner)],
				[initialScValue && initialScValue[Symbol.iterator], () => initialScValue::callOrReturn(owner)],
				[desc.cardinality.min === 0]
			);
			
			owner.p('fieldsInitialized').filter(v=>!!v).take(1).subscribe(() => {
				
				/* synchronize with the other side */
				this.get().e('add').switchMap(
					other => other.p('fieldsInitialized').filter(v=>!!v).take(1),
					other => other
				).subscribe((other) => {
					if (!other.fields[desc.codomain.keyInResource]) {
						debugger;
					}
					other.fields[desc.codomain.keyInResource].add(owner);
				});
				this.get().e('delete').subscribe((other) => {
					other.fields[desc.codomain.keyInResource].delete(owner);
				});
				
				/* mirror stuff that happens in sub-fields */
				for (let subCls of desc.relationshipClass.extendedBy) {
					const subFieldKey = subCls.keyInResource[desc.keyInRelationship];
					const subField    = owner.fields[subFieldKey];
					if (!subField) { continue }
					if (subField instanceof Rel$Field) {
						subField.get().e('add')   .subscribe( this.get().e('add')    );
						subField.get().e('delete').subscribe( this.get().e('delete') );
					} else { // Rel1Field
						subField.p('value')
							.startWith(null)
							.pairwise()
							.subscribe(([prev, curr]) => {
								if (prev) { this.get().delete(prev) }
								if (curr) { this.get().add   (curr) }
							});
					}
				}
				
			});
		
			/* emit 'value' signals (but note that setValueThroughSignal = false) */
			this[$$value].p('value')
				.sample(owner.p('fieldsInitialized').filter(v=>!!v))
				.subscribe( this.p('value') );
			
		}
		
		/**
		 * @return {Set} A new `Set` data-structure populated with
		 *               the entities in this field.
		 */
		getAll() {
			return new Set(this.get());
		}
		
		/**
		 * Set this field to a new collection of related entities.
		 * @param {Iterable} newValue - the new collection of entities to be put in this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new value
		 */
		set(newValue, options = {}) {
			const {ignoreReadonly = false, ignoreValidation = false} = options;
			constraint(ignoreReadonly || !this[$$desc].readonly);
			newValue = new Set(newValue);
			if (!ignoreValidation) { this.validate(newValue, ['set']) }
			this[$$value].overwrite(newValue);
		}
		
		/**
		 * Add an additional entity to this field.
		 * @param {Entity}   newSubValue - the new entity to be added into this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality or value
		 */
		add(newSubValue, options = {}) {
			const {ignoreReadonly = false, ignoreValidation = false} = options;
			constraint(ignoreReadonly || !this[$$desc].readonly);
			if (!ignoreValidation) {
				this.validateCardinality(this[$$value]::size() + 1, ['set']);
				this.validateElement(newSubValue, ['set']);
			}
			this.get().add(newSubValue);
		}
		
		/**
		 * Remove a specific entity from this field.
		 * @param {Entity}   subValue - the entity to be removed from this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality
		 */
		delete(subValue, options = {}) {
			const {ignoreReadonly = false, ignoreValidation = false} = options;
			constraint(ignoreReadonly || !this[$$desc].readonly);
			if (!ignoreValidation) {
				if (this[$$value].has(subValue)) {
					this.validateCardinality(this[$$value]::size() - 1, ['set']);
				}
			}
			this.get().delete(subValue);
		}
		
		/**
		 * How to properly convert a value in this field to JSON (plain data).
		 * @param {*}       value                 - the value to convert to JSON
		 * @param {Object} [options={}]
		 * @param {Class}  [options.requireClass] - the only `Entity` subclass accepted into the output, optionally
		 */
		static valueToJSON(value, options = {}) {
			let requireClass;
			({requireClass, ...options} = options);
			return [...value].map(e => {
				if (requireClass && requireClass !== e.class) { return undefined }
				return env.Entity.normalizeAddress(e, options);
			}).filter(v=>!!v);
		}
		
		/**
		 * How to properly convert a JSON value to a value appropriate for this type of field.
		 * @param {*}         json               - the JSON value to convert
		 * @param {Object}   [options={}]
		 * @param {Function} [options.getEntity] - a function that returns an entity corresponding to a given address
		 */
		static jsonToValue(json, options = {}) {
			let result = new Set;
			const {getEntity} = options;
			for (let thing of json) {
				let entity;
				if (thing instanceof env.Entity) {
					entity = thing;
				} else if (getEntity::isFunction()) {
					entity = getEntity(thing, options);
				}
				result.add(entity);
			}
			return result;
		}
		
		/**
		 * Validate a certain value as appropriate for this field.
		 * Throws an exception if the value is invalid. Otherwise does nothing.
		 * @param {*}     val    - the value to test
		 * @param {Array} stages - the validation stages to validate for (e.g., 'commit')
		 */
		validate(val, stages = []) {
			constraint(val[Symbol.iterator], humanMsg`
				The value ${val} given for ${this[$$owner].constructor.name}#${this[$$key]}
				is not an iterable collection (like array or set).
			`);
			this.validateCardinality(val::size(), stages);
			val.forEach(::this.validateElement, stages);
		}
		
		/**
		 * Validate a certain cardinality as appropriate for this field.
		 * Throws an exception if the cardinality is invalid. Otherwise does nothing.
		 * @param {number} cardinality - the cardinality to test
		 * @param {Array}  stages      - the validation stages to validate for (e.g., 'commit')
		 */
		validateCardinality(cardinality, stages = []) {
			if (stages.includes('commit')) {
				const {min, max} = this[$$desc].cardinality;
				constraint(cardinality::inRange(min, max + 1), humanMsg`
					The number of values in field ${this[$$owner].constructor.name}#${this[$$key]}
					is not within the expected range [${min}, ${max}].
				`);
			}
		}
		
		/**
		 * Validate a specific entity as appropriate to be included in this field.
		 * Throws an exception if the entity is invalid. Otherwise does nothing.
		 * @param {Entity} entity     - the entity to test
		 * @param {Array} [stages=[]] - the validation stages to validate for (e.g., 'commit')
		 */
		validateElement(entity, stages = []) {
			/* the value must be of the proper domain */
			if (!this[$$desc].codomain.resourceClass.hasInstance(entity)) {
				throw new Error(humanMsg`
					Invalid value ${entity} given as element for
					${this[$$owner].constructor.name}#${this[$$key]}.
				`);
			}
		}
		
	}
	
	return env.registerFieldClass('Rel$Field', Rel$Field);
	
}
