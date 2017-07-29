import {isUndefined, isNull, entries, isFunction} from 'lodash-bound';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {humanMsg, callOrReturn} from 'utilities';

import {constraint} from "../util/misc";

import RelField_factory from './RelField.js';

import {
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn
} from './symbols';


/** @wrapper */
export default (env) => {
	
	const RelField = RelField_factory(env);
	
	/**
	 * A field on an `Entity` representing the 'one'-side
	 * of a one-to-one or one-to-many relationship.
	 * Therefore, its value is always an `Entity` or `null`.
	 */
	class Rel1Field extends RelField {
		
		// this[$$owner] instanceof Resource
		// this[$$key]   instanceof "-->HasInnerBorder" | "<--HasPlusBorder" | ...
		// this[$$value] instanceof IsRelatedTo
		
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
			const {cls, key, aliases, desc: {readonly}} = options;
			assert(cls.isResource);
			if (cls.prototype.hasOwnProperty(key)) { return }
			for (let k of [key, ...aliases]) {
				cls.prototype::defineProperty(k, {
					get() { return this.fields[k].get() },
					...(readonly ? {} : {
						set(val) { this.fields[k].set(val) }
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
	             .filter(([,desc]) => desc.cardinality.max === 1)
	             .map(([key, desc]) => ({
	                 key,
	                 desc,
		             aliases: desc.shortcutKey ? [desc.shortcutKey] : []
	             }));
		}
		
		
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
			super(options);
			const { owner, key, desc, initialValue, aliasInitialValues } = options;
			
			/* set the initial value */
			const initialShortcutValue = aliasInitialValues[desc.shortcutKey];
			constraint(!initialValue || !initialShortcutValue, humanMsg`
				You cannot set the fields '${key}' and '${desc.shortcutKey}'
				at the same time for a ${this.constructor.singular}.
			`);
			this[$$initSet](
				[!initialValue        ::isUndefined(), () => initialValue        ::callOrReturn(owner)],
				[!initialShortcutValue::isUndefined(), () => initialShortcutValue::callOrReturn(owner)],
				[desc.cardinality.min === 0,           () => null]
			);
			
			owner.p('fieldsInitialized').filter(v=>!!v).take(1).subscribe(() => {
			
				/* synchronize with the other side */
				this.p('value').startWith(null).distinctUntilChanged().pairwise().subscribe(([prev, curr]) => {
					if (prev) { prev.fields[desc.codomain.keyInResource].delete(owner) }
					if (curr) { curr.fields[desc.codomain.keyInResource].add   (owner) }
				});
			
				/* pull in values set in sub-fields */
				for (let subCls of desc.relationshipClass.extendedBy) {
					const subFieldKey = subCls.keyInResource[desc.keyInRelationship];
					const subField = owner.fields[subFieldKey];
					if (!subField) { continue }
					subField.p('value').subscribe( this.p('value') );
				}
				
			});
		}
		
		/**
		 * @return {Set} A new `Set` data-structure populated with
		 *               the entity in this field, or empty.
		 */
		getAll() {
			let val = this.get();
			return new Set(val === null ? [] : [val]);
		}
		
		/**
		 * Set this field to a new entity, removing the previous one.
		 * @param {Entity}   newValue - the new entity to be put in this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality or value
		 */
		add(newValue, options) {
			this.set(newValue, options);
		}
		
		/**
		 * Set this field to `null` if the given entity corresponds to the entity currently in this field.
		 * @param {Entity}   oldValue - the entity to be removed from this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality
		 */
		delete(oldValue, options) {
			if (this.get() === oldValue) {
				this.set(null, options);
			}
		}
		
		/**
		 * How to properly convert a value in this field to JSON (plain data).
		 * @param {*}       value               - the value to convert to JSON
		 * @param {Object} [options={}]
		 * @param {Class}  [options.getAddress] - a function that returns an address corresponding to a given entity
		 */
		static valueToJSON(value, options = {}) {
			if (!value) { return null }
			const { getAddress = e=>e::pick('class', 'id') } = options;
			return getAddress(value);
		}
		
		/**
		 * How to properly convert a JSON value to a value appropriate for this type of field.
		 * @param {*}         json               - the JSON value to convert
		 * @param {Object}   [options={}]
		 * @param {Function} [options.getEntity] - a function that returns an entity corresponding to a given address
		 */
		static jsonToValue(json, options = {}) {
			if (json === null) { return null }
			const {getEntity} = options;
			if (json instanceof env.classes.Entity) {
				return json;
			} else if (getEntity::isFunction()) {
				return getEntity(json);
			}
		}
		
		/**
		 * Validate a certain value as appropriate for this field.
		 * Throws an exception if the value is invalid. Otherwise does nothing.
		 * @param {*}      val        - the value to test
		 * @param {Array} [stages=[]] - the validation stages to validate for (e.g., 'commit')
		 */
		validate(val, stages = []) {
			
			const notGiven = val::isNull() || val::isUndefined();
			
			if (stages.includes('commit')) {
				/* if there's a minimum cardinality, a value must have been given */
				constraint(!notGiven || this[$$desc].cardinality.min === 0, humanMsg`
					No value given for required field
					${this[$$owner].constructor.name}#${this[$$key]}.
				`);
			}
			
			/* the value must be of the proper domain */
			const expectedResourceClass = this[$$desc].codomain.resourceClass;
			const hasCompatibleType = expectedResourceClass.hasInstance(val);
			constraint(notGiven || hasCompatibleType, humanMsg`
				Invalid value '${val}' given for field ${this[$$owner].constructor.name}#${this[$$key]}.
			`);
			
		}
		
		/**
		 * Validate a certain value as appropriate for this field.
		 * Throws an exception if the value is invalid. Otherwise does nothing.
		 * @param {Entity}  element    - the value to test
		 * @param {Array}  [stages=[]] - the validation stages to validate for (e.g., 'commit')
		 */
		validateElement(element, stages = []) {
			return this.validate(element, stages);
		}
		
	}
	
	return env.registerFieldClass('Rel1Field', Rel1Field);
};
