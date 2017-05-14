import {pick, isFunction, isUndefined, values} from 'lodash-bound';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {ValueTracker, property, flag, callOrReturn, humanMsg} from 'utilities';

import {
	$$owner,
	$$key,
	$$desc,
	$$value,
	$$initSet,
	$$entriesIn,
	$$destruct
} from './symbols';
const $$fieldsInitialized = Symbol('$$fieldsInitialized');
const $$aliases           = Symbol('$$aliases');

import {constraint} from "../util/misc";

/** @private */
export default (env) => {
	/**
	 * A class that represents specific fields on an `Entity`.
	 * @public
	 */
	class Field extends ValueTracker {
		
		////////////
		// static //
		////////////
		
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
		
		static initializeEntity(owner, initialValues) {
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
			
			/* add related descriptions to each description */
			for (let entry of keyDescs::values()) {
				entry.related = keyDescs::pick(entry.relatedKeys);
			}
			
			/* create a field for each description */
			for (let entry of keyDescs::values()) {
				let { FieldClass } = entry;
				delete entry.FieldClass;
				new FieldClass(entry);
			}
			
			/* notify completion of field initialization */
			owner.pSubject('fieldsInitialized').next(true);
		}
		
		static destructEntity(owner) {
			for (let field of owner.fields::values()) {
				field[$$destruct]();
			}
		}
		
		static isEqual(a, b) { return a === b }
		
		
		/////////////////////////
		// events & properties //
		/////////////////////////
		
		@property()              value;
		@flag({ initial: true }) isPlaceholder;
		
		
		//////////////
		// instance //
		//////////////
		
		//noinspection JSDuplicatedDeclaration // (to suppress Webstorm bug)
		get [Symbol.toStringTag]() {
			return `Field: ${this[$$owner].constructor.name}#${this[$$key]}`;
		}
		
		constructor({ owner, key, desc, aliases = [], setValueThroughSignal = true, isPlaceholder = false }) {
			super();
			owner.fields[key] = this;
			for (let alias of aliases) {
				owner.fields[alias] = this;
			}
			this[$$owner]   = owner;
			this[$$key]     = key;
			this[$$desc]    = desc;
			this[$$aliases] = aliases;
			if (setValueThroughSignal) {
				this.p('value').subscribe(::this.set);
			}
			this.isPlaceholder = isPlaceholder;
		}
		
		static valueToJSON() { assert(false, humanMsg`Field.valueToJSON must be implemented in subclasses.`) }
		
		valueToJSON(options = {}) { return this.constructor.valueToJSON(this.value, options) }
		
		get() { return this[$$value] }
		
		set(newValue, options = {}) {
			if (!this.constructor.isEqual(this[$$value], newValue)) {
				const {
					      ignoreReadonly   = false,
					      ignoreValidation = false
				      }                    = options;
				constraint(ignoreReadonly || !this[$$desc].readonly, humanMsg`
					Tried to set the readonly field
					'${this[$$owner].constructor.name}#${this[$$key]}'.
				`);
				if (!ignoreValidation) { this.validate(newValue, ['set']) }
				this[$$value] = newValue;
				this.pSubject('value').next(newValue);
			}
		}
		
		validate(val, stages = []) {
			// to be implemented in subclasses
		}
		
		[$$destruct]() {
			// to be implemented in subclasses
		}
		
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
	return Field;
}
