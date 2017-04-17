import isUndefined from 'lodash-bound/isUndefined';
import entries     from 'lodash-bound/entries';
import cloneDeep   from 'lodash-bound/cloneDeep';

import {defineProperty} from 'bound-native-methods';
// TODO: make sure we don't need to import this anymore: take;

import {humanMsg, assign, callOrReturn} from "../util/misc";

import {Field} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn,
	$$id
} from './symbols';
import {constraint} from "../util/misc";


Field[$$registerFieldClass](class PropertyField extends Field {
	
	// this[$$owner] instanceof RelatedTo | Resource
	// this[$$key]   instanceof "name" | "class" | "id" | ...
	// this[$$value] instanceof any
	
	////////////
	// static //
	////////////
	
	static initClass({ cls, key, desc: {readonly} }) {
		if (cls.prototype.hasOwnProperty(key)) { return }
		cls.prototype::defineProperty(key, {
			get() { return this.fields[key].get() },
			...(readonly ? {} : {
				set(val) { this.fields[key].set(val)}
			}),
			enumerable:   true,
			configurable: false
		});
	}
	
	static [$$entriesIn](cls) {
		return cls.properties::entries()
			.map(([key, desc])=>({
				key,
				desc,
				relatedKeys: []
			}));
	}
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { owner, key, desc, initialValue } = options;
		
		/* sanity checks */
		constraint(desc.value::isUndefined() || initialValue::isUndefined(), humanMsg`
			You tried to manually assign a value ${JSON.stringify(initialValue)}
			to ${owner.constructor.name}#${key},
			but it already has a fixed value of ${JSON.stringify(desc.value)}.
		`);
		
		/* set the initial value */
		owner.p('isPlaceholder').filter(v=>!v).take(1).subscribe(() => {
			// this[$$initSet](
			// 	[!initialValue::isUndefined(), initialValue::callOrReturn(owner)::cloneDeep()],
			// 	['default' in desc,            desc.default::callOrReturn(owner)::cloneDeep()],
			// 	['value'   in desc,            desc.value  ::callOrReturn(owner)::cloneDeep()],
			// 	[!desc.required]
			// );
			this[$$initSet](
				[!initialValue::isUndefined(), initialValue::callOrReturn(owner)::cloneDeep()],
				['default' in desc],
				['value'   in desc],
				[!desc.required   ]
			);
		});
	}
	
	get() {
		/* lazy loading of default or constant value */
		// TODO: also lazy-load when subscription is taken
		let value = super.get();
		if (value::isUndefined()) {
			if ('default' in this[$$desc]) {
				this.set(this[$$desc].default::callOrReturn(this[$$owner])::cloneDeep(), {createEditCommand: false});
			} else if ('value' in this[$$desc]) {
				this.set(this[$$desc].value::callOrReturn(this[$$owner])::cloneDeep(), {createEditCommand: false});
			}
		}
		return super.get();
	}
	
	static valueToJSON(value, {flattenFieldValues = false} = {}) {
		if (flattenFieldValues) { value = JSON.stringify(value) }
		return value;
	}
	
	validate(val, stages = []) {
		
		if (stages.includes('commit')) {
			constraint(!this[$$desc].required || !val::isUndefined(), humanMsg`
			    No value given for required field
			    '${this[$$owner].constructor.name}#${this[$$key]}'.
			`);
		}
		
		// TODO: CHECK CONSTRAINT: given property value conforms to JSON schema
		// TODO: CHECK ADDITIONAL (PROPERTY-SPECIFIC) CONSTRAINTS: e.g., if this
		//     : is a template, does it conform to its corresponding type?
		
	}
	
});
