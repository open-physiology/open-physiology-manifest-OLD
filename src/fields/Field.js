import {pick, mapValues, isUndefined, values} from 'lodash-bound';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {ValueTracker, property, callOrReturn, humanMsg} from 'utilities';

import {
	$$owner,
	$$key,
	$$desc,
	$$value,
	$$initSet,
	$$entriesIn
} from './symbols';
const $$fieldsInitialized = Symbol('$$fieldsInitialized');
const $$aliases           = Symbol('$$aliases');

import {constraint} from "../util/misc";

/** @wrapper */
export default (env) => {
	/**
	 * A class that represents specific fields on an `Entity`.
	 * @public
	 */
	class Field extends ValueTracker {
		
		////////////
		// static //
		////////////
		
		/**
		 * Equip an `Entity` subclass `cls` with its particular fields,
		 * optionally only for a particular key.
		 * @param {Class}   cls         - a subclass of `Entity` still under construction
		 * @param {string} [onlyForKey] - the only key for which to initialize the field
		 */
		static augmentClass(cls, onlyForKey) {
			/* allow each kind of field to perform its initializations */
			for (let FieldClass of env.fieldClasses::values()) {
				if (!FieldClass[$$entriesIn]) { continue }
				for (let { key, desc, aliases } of FieldClass[$$entriesIn](cls)) {
					if (!onlyForKey || onlyForKey === key) {
						FieldClass.initClass({ cls, key, aliases, desc });
					}
				}
			}
		}
		
		/**
		 * Initialize the fields of a particular `Entity` instance.
		 * @param {Entity} owner                    - the entity to initialize
		 * @param {Object} initialValues            - the initial values for the entity's fields
		 * @param {Object} [valueTrackerOptions={}] - the `ValueTracker` options to use for each field's observable properties
		 */
		static initializeEntity(owner, initialValues, valueTrackerOptions = {}) {
			if (owner.fields) { return }
			owner::defineProperty('fields', { value: {} });
			
			/* initialize all fields */
			const keyDescs = {};
			for (let FieldClass of env.fieldClasses::values()) {
				if (!FieldClass[$$entriesIn]) { continue }
				for (let entry of FieldClass[$$entriesIn](owner.constructor)) {
					const { key, aliases = [] } = entry;
					const candidateKeys  = [key, ...aliases].filter(v => !initialValues[v]::isUndefined());
					constraint(candidateKeys.length <= 1, humanMsg`
						You cannot set the fields '${candidateKeys.join("', '")}'
						at the same time for a ${owner.constructor.singular}.
					`);
					keyDescs[key] = {
						...entry,
						owner,
						key,
						initialValue: initialValues[candidateKeys[0]],
						FieldClass
					};
				}
			}
			
			/* add related initial values to each description */
			for (let entry of keyDescs::values()) {
				entry.aliasInitialValues = keyDescs::pick(entry.relatedKeys)::mapValues(d => d.initialValue);
			}
			
			/* create a field for each description */
			for (let entry of keyDescs::values()) {
				let { FieldClass } = entry;
				delete entry.FieldClass;
				new FieldClass({ ...entry, valueTrackerOptions });
			}
			
			/* notify completion of field initialization */
			owner.pSubject('fieldsInitialized').next(true);
		}
		
		/**
		 * The function used for testing the values of this field for equality.
		 * Can be overwritten by specific field classes (e.g., `Rel$Field`).
		 * @returns {boolean} - whether `a` and `b` are considered equal values
		 */
		static isEqual(a, b) { return a === b }
		
		
		/////////////////////////
		// events & properties //
		/////////////////////////
		
		/**
		 * The current value of this field. It can be read and written to
		 * directly, or observed with `field.p('value')`.
		 */
		@property() value;
		
		
		//////////////
		// instance //
		//////////////
		
		/**
		 * Making this field recognizable when converted to a string.
		 * @returns {string} a string like `Field: Lyph#name = "Heart"`
		 */
		get [Symbol.toStringTag]() {
			return `Field: ${this[$$owner].constructor.name}#${this[$$key]} = ${this.valueToJSON()}`;
		}
		
		/**
		 * Create a new instance of this field on a specific entity.
		 * @protected
		 * @param {Object}    options
		 * @param {Entity}    options.owner                       - the entity on which to create this field
		 * @param {string}    options.key                         - the key on that entity corresponding to this field
		 * @param {Object}    options.desc                        - the descriptor for what kind of field this is
		 * @param {Iterable} [options.aliases=[]]                 - other keys to which this field should answer
		 * @param {boolean}  [options.setValueThroughSignal=true] - whether signals sent to `field.p('value')` should be accepted
		 * @param {Object}   [options.valueTrackerOptions={}]     - the `ValueTracker` options to use for each field's observable properties
		 */
		constructor(options) {
			super();
			this.setValueTrackerOptions(options.valueTrackerOptions);
			const {
				owner,
				key,
				desc,
				aliases = [],
				setValueThroughSignal = true
			} = options;
			owner.fields[key] = this;
			for (let alias of aliases) {
				owner.fields[alias] = this;
			}
			/** @private */ this[$$owner]   = owner;
			/** @private */ this[$$key]     = key;
			/** @private */ this[$$desc]    = desc;
			/** @private */ this[$$aliases] = aliases;
			if (setValueThroughSignal) {
				this.p('value').subscribe(::this.set);
			}
		}
		
		/**
		 * Convert this field's value to JSON (plain data).
		 * @param {Object} [options={}]
		 * @returns {*}
		 */
		valueToJSON(options = {}) { return this.constructor.valueToJSON(this.value, options) }
		
		/**
		 * How to properly convert a value in this field to JSON (plain data).
		 * @param {*}        value                             - the value to convert to JSON
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.flattenFieldValues=false] - whether `Object` or `Array` field values should be avoided in the output (for example, Neo4j does not accept nested objects)
		 * @abstract
		 */
		static valueToJSON(value, options) {
			assert(false, humanMsg`Field.valueToJSON must be implemented in subclasses.`);
		}
		
		/**
		 * How to properly convert a JSON value to a value appropriate for this type of field.
		 * @param {*}         json              - the JSON value to convert
		 * @param {Object}    options
		 * @param {boolean}  [options.flattenFieldValues=false] - whether field values are strings that should be run through `JSON.parse`
		 * @param {Function}  options.getEntity                 - a function that returns an entity corresponding to a given address
		 */
		static jsonToValue(json, options) {
			assert(false, humanMsg`Field.jsonToValue must be implemented in subclasses.`);
		}
		
		/**
		 * @returns {*} this field's value
		 */
		get() { return this[$$value] }
		
		/**
		 * Set this field to a new value.
		 * @param {*}        newValue - the new value for this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new value
		 */
		set(newValue, options = {}) {
			if (!this.constructor.isEqual(this[$$value], newValue)) {
				const {
			        ignoreReadonly   = false,
			        ignoreValidation = false
		        } = options;
				constraint(ignoreReadonly || !this[$$desc].readonly, humanMsg`
					Tried to set the readonly field
					'${this[$$owner].constructor.name}#${this[$$key]}'.
				`);
				if (!ignoreValidation) { this.validate(newValue, ['set']) }
				/** @private */ this[$$value] = newValue;
				this.pSubject('value').next(newValue);
			}
		}
		
		/**
		 * Validate a certain value as appropriate for this field.
		 * Throws an exception if the value is invalid. Otherwise does nothing.
		 * Should be overwritten by specific `Field` subclasses.
		 * @param {*}     val    - the value to test
		 * @param {Array} stages - the validation stages to validate for (e.g., 'commit')
		 */
		validate(val, stages = []) {
		} // to be implemented in subclasses
		
		/** @private */
		[$$initSet](...alternatives) {
			for (let [guard, value] of alternatives) {
				if (guard::callOrReturn(this)) {
					if (value::isUndefined()) { return }
					value = value::callOrReturn();
					this.validate(value, ['initialize', 'set']);
					this.set(value, {
						ignoreReadonly:   true,
						ignoreValidation: true
					});
					return;
				}
			}
		}
		
	}
	
	return env.registerFieldClass('Field', Field);
}
