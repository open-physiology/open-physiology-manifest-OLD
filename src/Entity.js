import defaults    from 'lodash-bound/defaults';
import isString    from 'lodash-bound/isString';
import isInteger   from 'lodash-bound/isInteger';
import isArray     from 'lodash-bound/isArray';
import isSet       from 'lodash-bound/isSet';
import isObject    from 'lodash-bound/isObject';
import isUndefined from 'lodash-bound/isUndefined';
import pick        from 'lodash-bound/pick';
import entries     from 'lodash-bound/entries';
import reject      from 'lodash-bound/reject';

import {humanMsg, definePropertiesByValue, definePropertyByValue} from './util/misc';
import ObservableSet                   from './util/ObservableSet';
import {Field}                         from './fields/fields';
import {babelHelpers, ValueTracker, event, property} from 'utilities';
import {Observable, BehaviorSubject} from './libs/rxjs.js';

import {map} from 'lodash-bound';

import {defineProperties, defineProperty, assign, setPrototype} from 'bound-native-methods';

import {constraint}   from './util/misc';
import assert from 'power-assert';

const $$allowInvokingConstructor = Symbol('$$allowInvokingConstructor');

////////////////////////////////////////////////////////////////////////////////

export default (environment) => {
	
	class Entity extends ValueTracker {
		
		static get environment() { return environment } // TODO (MANIFEST): still need 'environment'?
		
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
			// TODO (MANIFEST): possibly invoke custom class behavior (like Lyph.new)
			return new this(initialValues, {
				...options,
				[$$allowInvokingConstructor]: true
			});
		}
		
		constructor(initialValues: {} = {}, options = {}) {
			/* initialize value tracking */
			super();
			
			/* make sure this constructor was invoked under proper conditions */
			constraint(options[$$allowInvokingConstructor], humanMsg`
				Do not use 'new ${this.constructor.name}(...args)'.
				Instead, use '${this.constructor.name}.new(...args)'
				          or '${this.constructor.name}.get(...args)'.
			`);
			delete options[$$allowInvokingConstructor];
			
			/* create fieldsInitialized property */
			// for some reason, I can't use @property here
			this.newProperty('fieldsInitialized', { initial: false, readonly: true });
			
			/* set defaults for the core initial field values */
			initialValues::defaults({
				id:    null, // TODO (MANIFEST): How to handle `id` if we don't keep track of entities? Just keep it as is? Make it readonly (but then how to write it later)?
				class: this.constructor.name
			});
			
			/* initialize all fields in this entity */
			Field.initializeEntity(this, initialValues);
		}
		
		get [Symbol.toStringTag]() {
			return `${this.constructor.name}: ${this.id}`; // TODO (MANIFEST): `id` is used here
		}
		
		p(...args) {
			if (!!this.fields && !!this.fields[args[0]]) {
				return this.fields[args[0]].p('value');
			} else if (this.hasProperty(...args)) {
				return super.p(...args);
			}
		}
		
		
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
			let { entityToTemporaryId = new Map } = options; // TODO (MANIFEST): Do we keep `entityToTemporaryId` in this library?
			let result = {};
			for (let [key, field] of this.fields::entries()) {
				const fieldIsShortcut = (
					field.constructor.name === 'RelShortcut$Field' ||
					field.constructor.name === 'RelShortcut1Field'
				);
				if (fieldIsShortcut) { continue }
				result[key] = field.value;
			}
			if (!result.id && entityToTemporaryId.has(this)) {
				result.id = entityToTemporaryId.get(this);
			}
			return this.constructor.objectToJSON(result, { ...options, sourceEntity: this });
		}
		
		
		//// Setting / getting of fields
		
		get(key)                    { return this.fields[key].get()             }
		set(key, val, options = {}) { return this.fields[key].set(val, options) } // TODO (MANIFEST): Do we still need options here?
		
	}

	return Entity;
}
