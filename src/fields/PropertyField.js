import {isUndefined, entries, cloneDeep} from 'lodash-bound';
import {defineProperty}                  from 'bound-native-methods';
import {humanMsg, callOrReturn}          from 'utilities';

import {constraint} from "../util/misc";

import Field_factory from './Field.js';

import {
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn
} from './symbols';

const $$ignoreReadonly = Symbol('$$ignoreReadonly');


/** @wrapper */
export default (env) => {
	
	const Field = Field_factory(env);
	
	/**
	 * A field on an `Entity` representing a simple data-type.
	 * @public
	 */
	class PropertyField extends Field {
		
		// this[$$owner]   instanceof   RelatedTo | Resource
		// this[$$key]     instanceof   "name" | "class" | "id" | ...
		// this[$$value]   instanceof   any
		
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
		
		/** @private */
		static [$$entriesIn](cls) {
			return cls.properties::entries()
				.map(([key, desc])=>({
					key,
					desc
				}));
		}
		
		
		//////////////
		// instance //
		//////////////
		
		constructor(options) {
			super(options);
			const { owner, desc, initialValue } = options;
			
			/* set the initial value */
			this.p('isPlaceholder').filter(v=>!v).take(1).subscribe(() => {
				this[$$initSet](
					[!initialValue::isUndefined(), () => initialValue::callOrReturn(owner)::cloneDeep()],
					['default' in desc,            () => desc.default::callOrReturn(owner)::cloneDeep()],
					['value'   in desc,            () => desc.value  ::callOrReturn(owner)::cloneDeep()],
					[!desc.required]
				);
			});
		}
		
		static valueToJSON(value, {flattenFieldValues = false} = {}) {
			if (flattenFieldValues) { value = JSON.stringify(value) }
			return value;
		}
		
		static jsonToValue(json, {flattenFieldValues = false} = {}) {
			if (flattenFieldValues) { json = JSON.parse(value) }
			return json;
		}
		
		validate(val, stages = []) {
			
			if (stages.includes('commit')) {
				constraint(!this[$$desc].required || !val::isUndefined(), humanMsg`
				    No value given for required field
				    '${this[$$owner].constructor.name}#${this[$$key]}'.
				`);
			}
			
			// TODO: CHECK CONSTRAINT: given property value conforms to JSON schema
			// TODO: CHECK ADDITIONAL (PROPERTY-SPECIFIC) CONSTRAINTS:
			//     : e.g., if this is a template, does it conform to its corresponding type?
			
		}
		
	}
	
	return env.registerFieldClass('PropertyField', PropertyField);
};
