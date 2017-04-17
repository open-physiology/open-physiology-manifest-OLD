import {Observable, Subject} from '../libs/rxjs.js';
// TODO: make sure we don't need to import this anymore: map;
// TODO: make sure we don't need to import anymore: concat
// import 'rxjs/add/operator/do';

import pick        from 'lodash-bound/pick';
import isFunction  from 'lodash-bound/isFunction';
import isUndefined from 'lodash-bound/isUndefined';
import values      from 'lodash-bound/values';
import entries     from 'lodash-bound/entries';
import defaults    from 'lodash-bound/defaults';

import {defineProperties, defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {ValueTracker, event, property} from 'utilities';
import {humanMsg, assign} from "../util/misc";

import {
	$$registerFieldClass,
	$$fieldClasses,
	$$owner,
	$$key,
	$$desc,
	$$value,
	// $$pristine, // TODO: remove all 'pristine' related stuff from the field classes
	$$initSet,
	$$entriesIn,
	$$initialized,
	$$destruct,
	$$id
} from './symbols';
import {constraint} from "../util/misc";

const $$fieldsInitialized = Symbol('$$fieldsInitialized');

export class Field extends ValueTracker {
	
	////////////
	// static //
	////////////
	
	static [$$registerFieldClass](FieldClass) {
		if (!this[$$fieldClasses]) { this[$$fieldClasses] = new Set() }
		this[$$fieldClasses].add(FieldClass);
	}
	
	static augmentClass(cls, onlyForKey) {
		if (!this[$$fieldClasses]) { this[$$fieldClasses] = new Set() }
		
		/* allow each kind of field to perform its initializations */
		for (let FieldClass of this[$$fieldClasses]) {
			for (let {key, desc} of FieldClass[$$entriesIn](cls)) {
				if (!onlyForKey || onlyForKey === key) {
					FieldClass.initClass({ cls, key, desc });
				}
			}
		}
		
		/* only initialize a class once */
		if (cls[$$initialized]) { return }
		cls[$$initialized] = true;
		
	}
	
	/** only use for Entity instances when they are not placeholders (anymore) */
	static initializeEntity(owner, initialValues) {
		if (owner.fields) { return }
		owner::defineProperty('fields', { value: {} });
		
		/* allow specific field-init code to wait until all fields are initialized */
		const constructingOwner = new Subject(); // TODO: remove; obsolete
		const waitUntilConstructed = function (entity = owner) {
			if (entity === owner) { // TODO: remove; obsolete
				return Observable.concat(constructingOwner, this);
			} else {
				return Observable.concat(entity.p('fieldsInitialized'), this);
			}
		};
		
		/* initialize all fields */
		const keyDescs = {};
		for (let FieldClass of this[$$fieldClasses]) {
			for (let entry of FieldClass[$$entriesIn](owner.constructor)) {
				const {key} = entry;
				keyDescs[key] = {
					...entry,
					waitUntilConstructed,
					constructingOwner,
					owner,
					key,
					initialValue: initialValues[key],
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
			let {FieldClass} = entry;
			delete entry.FieldClass;
			delete entry.relatedKeys;
			new FieldClass(entry);
		}
		
		/* notify completion of field initialization */
		constructingOwner.complete(); // TODO: remove; obsolete
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
	
	@event()    commitEvent;
	@event()    rollbackEvent;
	@property() value;
	
	
	//////////////
	// instance //
	//////////////
	
	//noinspection JSDuplicatedDeclaration // (to suppress Webstorm bug)
	get [Symbol.toStringTag]() {
		return `Field: ${this[$$owner].constructor.name}#${this[$$key]}`;
	}
	
	constructor({ owner, key, desc, setValueThroughSignal = true }) {
		super();
		owner.fields[key] = this;
		this[$$owner] = owner;
		this[$$key]   = key;
		this[$$desc]  = desc;
		if (setValueThroughSignal) {
			// allow signal-push to change value
			this.p('value').subscribe((v) => {
				this.set(v, { createEditCommand: false });
			});
		}
		// this.p('value') // TODO: remove all 'pristine' related stuff from the field classes
		// 	.map(v => this.constructor.isEqual(v, this[$$pristine]))
		// 	.subscribe( this.pSubject('isPristine') );
	}
	
	static valueToJSON() { assert(false, humanMsg`Field.valueToJSON must be implemented in subclasses.`) }
	
	valueToJSON(options = {}) { return this.constructor.valueToJSON(this.value, options) }
	
	//noinspection JSDuplicatedDeclaration // (to suppress warning due to Webstorm bug)
	get() { return this[$$value] }
	
	set(newValue, options = {}) {
		options::defaults({ createEditCommand: true });
		
		if (options.createEditCommand) {
			
			this[$$owner].edit({ [this[$$key]]: newValue }, options);
			
		} else if (!this.constructor.isEqual(this[$$value], newValue)) {
			
			const {
				ignoreReadonly    = false,
				ignoreValidation  = false,
				createEditCommand = true
			} = options;
			
			constraint(ignoreReadonly || !this[$$desc].readonly, humanMsg`
				Tried to set the readonly field
				'${this[$$owner].constructor.name}#${this[$$key]}'.
			`);
			if (this.jsonToValue::isFunction()) {
				// TODO: should we check whether newValue is plain before converting?
				newValue = this.jsonToValue(newValue, options);
			}
			if (!ignoreValidation) { this.validate(newValue, ['set']) }
			this[$$value] = newValue;
			this.pSubject('value').next(newValue);
			
		}
	}
	
	[$$destruct]() {
		// to be implemented in subclasses
	}
	
	[$$initSet](...alternatives) {
		for (let [guard, value] of alternatives) {
			if (guard::isFunction() ? guard() : guard) {
				if (value::isUndefined()) { return }
				let val = value::isFunction() ? value() : value;
				if (this.constructor.isEqual(this[$$value], val)) { return }
				this.validate(val, ['initialize', 'set']);
				this.set(val, {
					ignoreReadonly:    true,
					ignoreValidation:  true,
					createEditCommand: false
				});
				return;
			}
		}
	}
	
	isInvalid(val) {
		try {
			let valueToValidate = val::isUndefined() ? this[$$value] : val;
			this.validate(valueToValidate, ['set', 'commit']);
			return false;
		} catch (err) {
			return err;
		}
	}
	
	validate(val, stages = []) {}
	
	// async commit() {
	// 	this.validate(this[$$value], ['commit']);
	// 	this[$$pristine] = this[$$value];
	// 	this.pSubject('isPristine').next(true);
	// }
	//
	// rollback() {
	// 	this.set(this[$$pristine]);
	// 	this.pSubject('isPristine').next(true);
	// }
	
}

export class RelField extends Field {
	
	/////////////////////////
	// events & properties //
	/////////////////////////
	
	@property({ readonly: true }) possibleValues;
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { desc } = options;
		
		/* manage the 'possibleValues' property */
		desc.codomain.resourceClass.p('all')
		    .subscribe(this.pSubject('possibleValues'));
		// TODO: use smarter filtering for the possible values
	}
	
}
