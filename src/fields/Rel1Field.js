// TODO: make sure we don't need to import this anymore: map;
// TODO: make sure we don't need to import this anymore: filter;
// TODO: make sure we don't need to import this anymore: pairwise;
// TODO: make sure we don't need to import this anymore: switchMap;
// TODO: make sure we don't need to import this anymore: startWith;
// import 'rxjs/add/operator/do';

import get         from 'lodash-bound/get';
import isUndefined from 'lodash-bound/isUndefined';
import isNull      from 'lodash-bound/isNull';
import entries     from 'lodash-bound/entries';

import _isObject from 'lodash/isObject';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {humanMsg, callOrReturn, constraint} from "../util/misc";

import {Field, RelField} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn,
	$$destruct
} from './symbols';


Field[$$registerFieldClass](class Rel1Field extends RelField {
	
	// this[$$owner] instanceof Resource
	// this[$$key]   instanceof "-->HasInnerBorder" | "<--HasPlusBorder" | ...
	// this[$$value] instanceof IsRelatedTo
	
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
	
	static [$$entriesIn](cls) {
		if (!cls.isResource) { return [] }
		return cls.relationships::entries()
             .filter(([,desc]) => desc.cardinality.max === 1)
             .map(([key, desc]) => ({
                 key,
                 desc,
	             aliases:     desc.shortcutKey ? [desc.shortcutKey] : [],
                 relatedKeys: desc.shortcutKey ? [desc.shortcutKey] : [] // TODO (MANIFEST): still need this?
             }));
	}
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { owner, key, desc, initialValue, related } = options;
		
		this.p('isPlaceholder').filter(v=>!v).take(1).subscribe(() => {
			
			/* set the initial value */
			const initialShortcutValue = related::get([desc.shortcutKey, 'initialValue']);
			constraint(!initialValue || !initialShortcutValue, humanMsg`
				You cannot set the fields '${key}' and '${desc.shortcutKey}'
				at the same time for a ${this.constructor.singular}.
			`);
			this[$$initSet](
				[!initialValue        ::isUndefined(), () => initialValue        ::callOrReturn(owner)],
				[!initialShortcutValue::isUndefined(), () => initialShortcutValue::callOrReturn(owner)],
				[desc.cardinality.min === 0,           () => null]
			);
			
			/* synchronize with the other side */
			this.p('value').startWith(null).distinctUntilChanged().pairwise().subscribe(([prev, curr]) => {
				if (prev) { prev.fields[desc.codomain.keyInResource].delete(owner) }
				if (curr) { curr.fields[desc.codomain.keyInResource].add   (owner) }
			});
		
			/* pull in values set in sub-fields */
			owner.p('fieldsInitialized').filter(v=>!!v).take(1).subscribe(() => {
				for (let subCls of desc.relationshipClass.extendedBy) {
					const subFieldKey = subCls.keyInResource[desc.keyInRelationship];
					const subField = owner.fields[subFieldKey];
					if (!subField) { continue }
					subField.p('value').subscribe( this.p('value') );
				}
			});
			
		});
	}
	
	static valueToJSON(value, {requireClass, ...options} = {}) {
		if (!value) { return value }
		if (requireClass && requireClass !== value.class) { return undefined }
		const Entity = value.constructor.Entity;
		return Entity.normalizeAddress(value, options);
	}
	
	// jsonToValue(json, options = {}) { // TODO (MANIFEST): We're not keeping track of entities in the manifest; do this in the model library
	// 	if (json === null) { return null }
	// 	const Entity = this[$$owner].constructor.Entity;
	// 	let result = Entity.getLocal(json, options);
	// 	if (!result) { result = Entity.setPlaceholder(json, options) }
	// 	return result;
	// }
	
	[$$destruct]() {
		this.set(null, {
			ignoreReadonly:   true,
			ignoreValidation: true
		});
		super[$$destruct]();
	}
	
	getAll() {
		let val = this.get();
		return new Set(val === null ? [] : [val]);
	}
	
	add(newValue, options) {
		this.set(newValue, options);
	}
	
	delete(oldValue, options) {
		if (this.get() === oldValue) {
			this.set(null, options);
		}
	}
	
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
	
	validateElement(element, options) {
		return this.validate(element, options);
	}
	
});
