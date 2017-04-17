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
	
	static initClass({ cls, key, desc: {readonly} }) {
		assert(cls.isResource);
		if (cls.prototype.hasOwnProperty(key)) { return }
		cls.prototype::defineProperty(key, {
			get() { return this.fields[key].get() },
			...(readonly ? {} : {
				set(val) { this.fields[key].set(val) }
			}),
			enumerable:   true,
			configurable: false
		});
	}
	
	static [$$entriesIn](cls) {
		if (!cls.isResource) { return [] }
		return cls.relationships::entries()
             .filter(([,desc]) => desc.cardinality.max === 1)
             .map(([key, desc]) => ({
                 key,
                 desc,
                 relatedKeys: desc.shortcutKey ? [desc.shortcutKey] : []
             }));
	}
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { owner, key, desc, initialValue, waitUntilConstructed, constructingOwner, related } = options;
		
		/* you cannot give a value as an actual relation and as a shortcut at the same time */
		let givenShortcutInitialValue = related::get([desc.shortcutKey, 'initialValue']);
		constraint(!initialValue || !givenShortcutInitialValue, humanMsg`
			You cannot set the fields '${key}' and '${desc.shortcutKey}'
			at the same time for a ${this.constructor.singular}.
		`);
		
		/* set the initial value */
		this[$$initSet](
			[initialValue, () => this.jsonToValue(initialValue)],
			[givenShortcutInitialValue],
			// TODO: remove following commented code; no longer doing auto-create
			// [desc.options.auto && !owner.isPlaceholder, () => {
			// 	let otherEntity = desc.codomain.resourceClass.new({}, {
			// 		forcedDependencies: [owner.originCommand]
			// 	});
			// 	return desc.relationshipClass.new({
			// 		[desc.keyInRelationship]         : owner,
			// 		[desc.codomain.keyInRelationship]: otherEntity
			// 	}, {
			// 		forcedDependencies: [owner.originCommand]
			// 	});
			// }],
			[desc.options.default, () => {
				let otherEntity = desc.options.default::callOrReturn({
					forcedDependencies: [owner.originCommand]
				}); // TODO: do defaults need to go through jsonToValue?
				return desc.relationshipClass.new({
					[desc.keyInRelationship]         : owner,
					[desc.codomain.keyInRelationship]: otherEntity
				}, {
					forcedDependencies: [owner.originCommand]
				});
			}],
			[desc.cardinality.min === 0, null]
		);
		
		/* pull in values set in sub-fields */
		constructingOwner.subscribe({complete: ()=>{
			for (let subCls of desc.relationshipClass.extendedBy) {
				const subFieldKey = subCls.keyInResource[desc.keyInRelationship];
				const subField = owner.fields[subFieldKey];
				if (!subField) { continue }
				subField.p('value').subscribe( this.p('value') );
			}
		}});
		
		/* keep the relationship up to date with changes here */
		this.p('value')
			::waitUntilConstructed()
			.startWith(null)
			.pairwise()
			.subscribe(([prev, curr]) => {
				// TODO: prev or curr being placeholders may be a complex situation; model it properly
				if (prev && !prev.isPlaceholder) { prev.fields[desc.keyInRelationship].set(null,  { createEditCommand: false }) }
				if (curr && !curr.isPlaceholder) { curr.fields[desc.keyInRelationship].set(owner, { createEditCommand: false }) }
			});
		
		
		// TODO: This was causing a bug; it's no longer relevant after the refactoring
		// /* set the value of this field to null when the relationship replaces this resource */
		// this.p('value')
		// 	::waitUntilConstructed()
		// 	.filter(_isObject)
		// 	.switchMap(newRel => newRel.p('fieldsInitialized').filter(v=>!!v).map(()=>newRel))
		// 	.switchMap(newRel => newRel.fields[desc.keyInRelationship].p('value'))
		// 	.filter(res => res !== owner)
		// 	.map(()=>null)
		// 	.subscribe( this.p('value') );
	}
	
	static valueToJSON(value, {requireClass, ...options} = {}) {
		// const {entityToTemporaryId = new Map} = options;
		if (!value) { return value }
		if (requireClass && requireClass !== value.class) { return undefined }
		const Entity = value.constructor.Entity;
		return Entity.normalizeAddress(value, options);
	}
	
	jsonToValue(json, options = {}) {
		if (json === null) { return null }
		const Entity = this[$$owner].constructor.Entity;
		let result = Entity.getLocal(json, options);
		if (!result) { result = Entity.setPlaceholder(json, options) }
		return result;
	}
	
	[$$destruct]() {
		this.set(null, {
			ignoreReadonly:   true,
			ignoreValidation: true,
			// updatePristine:   true,// TODO: remove all 'pristine' related stuff from the field classes
			createEditCommand:  false
		});
		super[$$destruct]();
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
		const expectedRelationshipClass = this[$$desc].relationshipClass;
		const hasCompatibleType = expectedRelationshipClass.hasInstance(val);
		constraint(notGiven || hasCompatibleType, humanMsg`
			Invalid value '${val}' given for field ${this[$$owner].constructor.name}#${this[$$key]}.
		`);
		
		// TODO: these should not be assertions, but proper constraint-checks,
		//     : recording errors, possibly allowing them temporarily, etc.
	}
	
});
