// TODO: make sure we don't need to import this anymore: switchMap;
// TODO: make sure we don't need to import this anymore: startWith;
// TODO: make sure we don't need to import this anymore: pairwise;
// import 'rxjs/add/operator/do';

import inRange     from 'lodash-bound/inRange';
import get         from 'lodash-bound/get';
import size        from 'lodash-bound/size';
import entries     from 'lodash-bound/entries';
import isUndefined from 'lodash-bound/isUndefined';
import isArray     from 'lodash-bound/isArray';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import ObservableSet, {setEquals, copySetContent} from '../util/ObservableSet';
import {humanMsg, constraint} from '../util/misc';
import {map, filter} from 'lodash-bound';

import {Field, RelField} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$value,
	$$entriesIn,
	$$destruct, $$initSet
} from './symbols';
import {callOrReturn} from 'utilities';


Field[$$registerFieldClass](class Rel$Field extends RelField {
	
	// this[$$owner] instanceof Resource
	// this[$$key]   instanceof "-->ContainsMaterial" | "-->HasPart" | "<--FlowsTo" | ...
	// this[$$value] instanceof Set<IsRelatedTo>
	
	////////////
	// static //
	////////////
	
	static initClass({ cls, key, aliases, desc: {readonly} }) {
			
		// console.log('Rel$Field.initClass:', cls.name, key, aliases);
	
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
	
	static [$$entriesIn](cls) {
		if (!cls.isResource) { return [] }
		return cls.relationships::entries()
			.filter(([,rel]) => rel.cardinality.max > 1)
			.map(([key, desc]) => ({
				key,
				desc,
				aliases:     desc.shortcutKey ? [desc.shortcutKey] : [],
				relatedKeys: desc.shortcutKey ? [desc.shortcutKey] : [] // TODO (MANIFEST): still need this?
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
		
		/***/
		this.p('isPlaceholder').filter(v=>!v).take(1).subscribe(() => {
			
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
			owner.p('fieldsInitialized').filter(v=>!!v).take(1).subscribe(() => {
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
			
		});
	}
	
	getAll() {
		return new Set(this.get());
	}
	
	set(newValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
		constraint(ignoreReadonly || !this[$$desc].readonly);
		// if (newValue::isArray()) { newValue = this.jsonToValue(newValue) }
		// TODO (MANIFEST): Maybe remove jsonToValue from the manifest?
		if (!ignoreValidation) { this.validate(newValue, ['set']) }
		copySetContent(this[$$value], newValue);
	}
	
	add(newSubValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
		constraint(ignoreReadonly || !this[$$desc].readonly);
		if (!ignoreValidation) { this.validateElement(newSubValue, ['set']) }
		// TODO: validate whether this exceeds max cardinality?
		this.get().add(newSubValue);
	}
	
	delete(subValue, { ignoreReadonly = false, ignoreValidation = false } = {}) {
		constraint(ignoreReadonly || !this[$$desc].readonly);
		// if (!ignoreValidation) {}
		// TODO: validate whether this exceeds max cardinality?
		this.get().delete(subValue);
	}
	
	static valueToJSON(value, {requireClass, ...options} = {}) {
		return [...value].map(e => {
			const Entity = e.constructor.Entity;
			if (requireClass && requireClass !== e.class) { return undefined }
			return Entity.normalizeAddress(e, options);
		}).filter(v=>!!v);
	}
	
	// jsonToValue(json, options = {}) { // TODO (MANIFEST): We're not keeping track of entities in the manifest; do this in the model library
	// 	const Entity = this[$$owner].constructor.Entity;
	// 	let result = new Set;
	// 	for (let thing of json) {
	// 		let entity = Entity.getLocal(thing, options);
	// 		if (!entity) { entity = Entity.setPlaceholder(thing, options) }
	// 		result.add(entity);
	// 	}
	// 	return result;
	// }
		
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
		if (stages.includes('commit')) {
			const {min, max} = this[$$desc].cardinality;
			constraint(val::size()::inRange(min, max + 1), humanMsg`
				The number of values in field ${this[$$owner].constructor.name}#${this[$$key]}
				is not within the expected range [${min}, ${max}].
			`);
		}
		val.forEach(::this.validateElement);
	}
	
	validateElement(element) {
		/* the value must be of the proper domain */
		if (!this[$$desc].codomain.resourceClass.hasInstance(element)) {
			throw new Error(humanMsg`
				Invalid value ${element} given as element for
				${this[$$owner].constructor.name}#${this[$$key]}.
			`);
		}
	}
	
});
