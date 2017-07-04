import {inRange, get, size, entries} from 'lodash-bound';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import ObservableSet from '../ObservableSet';
import {humanMsg, callOrReturn} from 'utilities';
import {constraint, setEquals} from '../util/misc';

import RelField_factory from './RelField.js';

import {
	$$owner,
	$$key,
	$$desc,
	$$value,
	$$entriesIn,
	$$destruct, $$initSet
} from './symbols';


/** @wrapper */
export default (env) => {
	
	const RelField = RelField_factory(env);
	
	class Rel$Field extends RelField {
		
		// this[$$owner] instanceof Resource
		// this[$$key]   instanceof "-->ContainsMaterial" | "-->HasPart" | "<--FlowsTo" | ...
		// this[$$value] instanceof Set<IsRelatedTo>
		
		////////////
		// static //
		////////////
		
		static initClass({ cls, key, aliases, desc: {readonly} }) {
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
		
		static isEqual: setEquals;
		
		
		//////////////
		// instance //
		//////////////
		
		constructor(options) {
			super({ ...options, setValueThroughSignal: false });
			const { owner, desc, initialValue, related } = options;
			
			/* initialize an empty observable set */
			this::defineProperty($$value, { value: new ObservableSet });
			
			/* set the initial value */
			const initialScValue = related::get([desc.shortcutKey, 'initialValue']);
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
		
		getAll() {
			return new Set(this.get());
		}
		
		set(newValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
			constraint(ignoreReadonly || !this[$$desc].readonly);
			newValue = new Set(newValue);
			if (!ignoreValidation) { this.validate(newValue, ['set']) }
			this[$$value].overwrite(newValue);
		}
		
		add(newSubValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
			constraint(ignoreReadonly || !this[$$desc].readonly);
			if (!ignoreValidation) {
				this.validateCardinality(this[$$value]::size() + 1, ['set']);
				this.validateElement(newSubValue, ['set']);
			}
			this.get().add(newSubValue);
		}
		
		delete(subValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
			constraint(ignoreReadonly || !this[$$desc].readonly);
			if (!ignoreValidation) {
				this.validateCardinality(this[$$value]::size() - 1, ['set']);
			}
			this.get().delete(subValue);
		}
		
		static valueToJSON(value, {requireClass, ...options} = {}) {
			return [...value].map(e => {
				if (requireClass && requireClass !== e.class) { return undefined }
				return env.Entity.normalizeAddress(e, options);
			}).filter(v=>!!v);
		}
		
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
			
		[$$destruct]() {
			this.set(new Set(), {
				ignoreReadonly:    true,
				ignoreValidation:  true,
				createEditCommand: false
			});
			super[$$destruct]();
		}
		
		validate(val, stages = []) {
			constraint(val[Symbol.iterator], humanMsg`
				The value ${val} given for ${this[$$owner].constructor.name}#${this[$$key]}
				is not an iterable collection (like array or set).
			`);
			this.validateCardinality(val::size(), stages);
			val.forEach(::this.validateElement, stages);
		}
		
		validateCardinality(cardinality, stages = []) {
			if (stages.includes('commit')) {
				const {min, max} = this[$$desc].cardinality;
				constraint(cardinality::inRange(min, max + 1), humanMsg`
					The number of values in field ${this[$$owner].constructor.name}#${this[$$key]}
					is not within the expected range [${min}, ${max}].
				`);
			}
		}
		
		validateElement(element, stages = []) {
			/* the value must be of the proper domain */
			if (!this[$$desc].codomain.resourceClass.hasInstance(element)) {
				throw new Error(humanMsg`
					Invalid value ${element} given as element for
					${this[$$owner].constructor.name}#${this[$$key]}.
				`);
			}
		}
		
	}
	
	return env.registerFieldClass('Rel$Field', Rel$Field);
	
}
