import {defaults, isInteger, isObject, entries, assign} from 'lodash-bound';
import assert from 'power-assert';

import {humanMsg, definePropertiesByValue, babelHelpers, ValueTracker, event,
	property, flag
} from 'utilities';

import {constraint} from './util/misc';

const $$allowInvokingConstructor = Symbol('$$allowInvokingConstructor');

////////////////////////////////////////////////////////////////////////////////

/** @wrapper */
export default (env) => {
	/**
	 * The base-class of all entities described in the manifest.
	 * @public
	 */
	class Entity extends ValueTracker {
		
		static get environment() { return env }
		
		static get Entity() { return Entity }
		
		static normalizeAddress(address, options = {}) {
			const {entityToTemporaryId = new Map} = options;
			if (address::isInteger()) { return { class: this.name, id: address } }
			if (address::isObject()) {
				let id = address.id || entityToTemporaryId.get(address);
				return { class: address.class || this.name, id };
			}
			assert(false, humanMsg`${JSON.stringify(address)} is not a valid entity identifier.`);
		}
		
		////////////////////////////////////////////////////////////
		////////// STATIC (building Entity-based classes) //////////
		////////////////////////////////////////////////////////////
		
		static createClass(config): Class<Entity> {
			/* create the class with the right name, constructor and static content */
			const {name, ...rest} = config;
			
			/* create the new class */
			// using Function constructor to give the class a dynamic name
			// http://stackoverflow.com/a/9947842/681588
			// (and using babel-technique to build it, rather than using class
			//  expression, so that it can be extended by babel-compiled code)
			const EntitySubclass = new Function('Entity', `
				'use strict';
				${babelHelpers};
				return function (_Entity) {
					_inherits(${name}, _Entity);
					function ${name}() {
						_classCallCheck(this, ${name});
						return _possibleConstructorReturn(this, Object.getPrototypeOf(${name}).apply(this, arguments));
					}
					return ${name};
				}(Entity);
			`)(Entity);
			
			/* populate it with the necessary data and behavior */
			EntitySubclass::assign(rest);
			EntitySubclass::definePropertiesByValue({ name });
			
			/***/
			return EntitySubclass;
		}
		
		
				
		///////////////////////////////////////////////////
		////////// STATIC CLASS ANALYSIS METHODS //////////
		///////////////////////////////////////////////////
		
		static hasInstance(instance) {
			if (!instance) { return false }
			return this.hasSubclass(instance.constructor);
		}
		
		static hasSubclass(otherClass) {
			if (!otherClass || otherClass.Entity !== this.Entity) { return false }
			if (this === this.Entity)                             { return true  }
			if (otherClass === this)                              { return true  }
			for (let SubClass of this.extendedBy) {
				if (SubClass.hasSubclass(otherClass)) {
					return true;
				}
			}
			return false;
		}
		
		static allSubclasses() {
			let result = [this];
			for (let subClass of this.extendedBy) {
				result = [...result, ...subClass.allSubclasses()];
			}
			return new Set(result);
		}
		
		static [Symbol.hasInstance](instance) {
			return this.hasInstance(instance);
		}
		
		
		///////////////////////////////
		////////// INSTANCES //////////
		///////////////////////////////
		
		static new(
			initialValues: {} = {},
		    options:       {} = {}
		) : this {
			if (this.isRelationship) {
				throw new Error(humanMsg`
					You cannot instantiate ${this.name},
					because it is a Relationship subclass.
				`);
			}
			return new this(initialValues, {
				...options,
				[$$allowInvokingConstructor]: true
			});
		}
		
		
		@property({ readonly: true }) isPlaceholder;
		@property({ initial: false, readonly: true }) fieldsInitialized;
		@property({ initial: false, allowSynchronousAccess: true, isValid(v) { return v === false || !this.isPlaceholder } }) deleted;
		@property({ initial: false, allowSynchronousAccess: true, isValid(v) { return v === false || !this.isPlaceholder } }) silent;
		
		
		constructor(initialValues = {}, options = {}) {
			/* initialize value tracking */
			super();
			
			/* make sure this constructor was invoked under proper conditions */
			constraint(options[$$allowInvokingConstructor], humanMsg`
				Do not use 'new ${this.constructor.name}(...args)'.
				Instead, use '${this.constructor.name}.new(...args)'
				          or '${this.constructor.name}.get(...args)'.
			`);
			delete options[$$allowInvokingConstructor];
			
			/* init placeholder property */
			this.pSubject('isPlaceholder').next(options.isPlaceholder);
			
			/* stop signals after this entity is deleted */
			const valueTrackerOptions = {
				takeUntil: this.p('silent').filter(s=>!!s)
			};
			this.setValueTrackerOptions(valueTrackerOptions);
			
			/* set defaults for the core initial field values */
			initialValues::defaults({
				class: this.constructor.name
			});
			
			/* initialize all fields in this entity */
			this.constructor.environment.Field.initializeEntity(this, initialValues, valueTrackerOptions);
		}
		
		loadIntoPlaceholder(initialValues = {}) {
			//assert(this.isPlaceholder); // TODO: fix ValueTracker, so that this.isPlaceholder is available
			for (let [key, value] of initialValues::entries()) {
				if (!this.fields[key]) { continue }
				this.fields[key].set(value);
			}
			this.pSubject('isPlaceholder').next(false);
		}
		
		get [Symbol.toStringTag]() {
			const identifier = this.id || this.name || this.title; // <-- just some common candidates
			return `${this.constructor.name}${identifier ? ': '+identifier : ''}`;
		}
		
		p(...args) {
			if (!!this.fields && !!this.fields[args[0]]) {
				return this.fields[args[0]].p('value');
			} else if (this.hasProperty(...args)) {
				return super.p(...args);
			}
		}
		
		
		//// Deleting
		delete  () { this.pSubject('deleted').next(true)  }
		undelete() { this.pSubject('deleted').next(false) }
		
		silence() { this.pSubject('silent').next(true) }
		
		
		//// Transforming to/from JSON
		
		static objectToJSON(obj, options = {}) {
			let { sourceEntity } = options;
			// TODO: rather than sourceEntity, accept an entity CLASS,
			//     : which should have a good description of the fields
			//     : This is issue open-physiology/open-physiology-model#10
			let result = {};
			for (let [key, value] of obj::entries()) {
				const field = sourceEntity.fields[key];
				let opts;
				switch (field.constructor.name) {
					case 'Rel$Field': case 'Rel1Field': {
						opts = { ...options, requireClass: key.substring(3) };
					} break;
					case 'SideField': case 'PropertyField': {
						opts = options;
					} break;
					default: continue; // Don't put shortcut fields in JSON
				}
				let valueJSON = field.constructor.valueToJSON(value, opts);
				if (field.constructor.name === 'Rel$Field' && valueJSON.length === 0) { continue }
				if (field.constructor.name === 'Rel1Field' && valueJSON === null)     { continue }
				result[key] = valueJSON;
			}
			return result;
		}
		
		toJSON(options = {}) {
			let result = {};
			for (let [key, field] of this.fields::entries()) {
				result[key] = field.value;
			}
			return this.constructor.objectToJSON(result, { ...options, sourceEntity: this });
		}
		
		
		//// Setting / getting of fields
		
		get(key)                    { return this.fields[key].get()             }
		set(key, val, options = {}) { return this.fields[key].set(val, options) }
		
	}
	
	return env.Entity || Entity;
};
