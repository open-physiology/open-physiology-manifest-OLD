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
	 */
	class PropertyField extends Field {
		
		// this[$$owner]   instanceof   RelatedTo | Resource
		// this[$$key]     instanceof   "name" | "class" | "id" | ...
		// this[$$value]   instanceof   any
		
		////////////
		// static //
		////////////
		
		/**
		 * Equip an `Entity` subclass `cls` with a particular property field.
		 * @param {Object}   options
		 * @param {Class}    options.cls - a subclass of `Entity` still under construction
		 * @param {string}   options.key - the key for the field to put in
		 * @param {Object}  [options.desc]
		 * @param {boolean} [options.desc.readonly] - whether this field should be read-only
		 */
		static initClass(options) {
			const {cls, key, desc} = options;
			if (cls.prototype.hasOwnProperty(key)) { return }
			const {readonly} = desc;
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
		
		/**
		 * Create a new instance of this field on a specific entity.
		 * @protected
		 * @param {Object}    options
		 * @param {Entity}    options.owner                       - the entity on which to create this field
		 * @param {string}    options.key                         - the key on that entity corresponding to this field
		 * @param {Object}    options.desc                        - the descriptor for what kind of field this is
		 * @param {string}   [options.initialValue]               - the initial value for this field
		 * @param {Iterable} [options.aliases=[]]                 - other keys to which this field should answer
		 * @param {boolean}  [options.setValueThroughSignal=true] - whether signals sent to `field.p('value')` should be accepted
		 * @param {Object}   [options.valueTrackerOptions={}]     - the `ValueTracker` options to use for each field's observable properties
		 */
		constructor(options) {
			super(options);
			const { owner, desc, initialValue } = options;
			
			/* set the initial value */
			this[$$initSet](
				[!initialValue::isUndefined(), () => initialValue::callOrReturn(owner)::cloneDeep()],
				['default' in desc,            () => desc.default::callOrReturn(owner)::cloneDeep()],
				['value'   in desc,            () => desc.value  ::callOrReturn(owner)::cloneDeep()],
				[!desc.required]
			);
		}
		
		/**
		 * How to properly convert a value in this field to JSON (plain data).
		 * @param {*}        value                             - the value to convert to JSON
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.flattenFieldValues=false] - whether `Object` or `Array` field values should be avoided in the output (for example, Neo4j does not accept nested objects)
		 * @returns {*} a plain-data value representing `value` that can go inside a JSON object
		 */
		static valueToJSON(value, options = {}) {
			const {flattenFieldValues = false} = options;
			if (flattenFieldValues) { value = JSON.stringify(value) }
			return value;
		}
		
		/**
		 * How to properly convert a JSON value to a value appropriate for this type of field.
		 * @param {*}        json                              - the JSON value to convert
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.flattenFieldValues=false] - whether field values are strings that should be run through `JSON.parse`
		 */
		static jsonToValue(json, options = {}) {
			const {flattenFieldValues = false} = options;
			if (flattenFieldValues) { json = JSON.parse(value) }
			return json;
		}
		
		/**
		 * Validate a certain value as appropriate for this field.
		 * Throws an exception if the value is invalid. Otherwise does nothing.
		 * @param {*}     val    - the value to test
		 * @param {Array} stages - the validation stages to validate for (e.g., 'commit')
		 */
		validate(val, stages = []) {
			
			if (stages.includes('commit')) {
				constraint(!this[$$desc].required || !val::isUndefined(), humanMsg`
				    No value given for required field
				    '${this[$$owner].constructor.name}#${this[$$key]}'.
				`);
			}
			
			// TODO: CHECK CONSTRAINT: given property value conforms to JSON schema
			// TODO: CHECK ADDITIONAL (PROPERTY-SPECIFIC) CONSTRAINTS:
			//     : e.g., if this is a template, does it conform to the specs of its corresponding type?
			
		}
		
	}
	
	return env.registerFieldClass('PropertyField', PropertyField);
};
