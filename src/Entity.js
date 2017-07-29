import {isInteger, isObject, entries, assign} from 'lodash-bound';
import assert from 'power-assert';

import {humanMsg, definePropertiesByValue, babelHelpers, ValueTracker, property} from 'utilities';

const $$allowInvokingConstructor = Symbol('$$allowInvokingConstructor');

////////////////////////////////////////////////////////////////////////////////

/** @wrapper */
export default (env) => {
	/**
	 * The base-class of all entities described in the manifest.
	 * @public
	 */
	class Entity extends ValueTracker {
		
		/** access to the `Entity` base class (to be used from any of its subclasses) */
		static get Entity() { return Entity }
		
		////////////////////////////////////////////////////////////
		////////// STATIC (building Entity-based classes) //////////
		////////////////////////////////////////////////////////////
		
		/**
		 * Create a new `Entity` subclass with the given configuration.
		 * @param {Object} config      - a set of static properties for the new class
		 * @param {string} config.name - the name of the new class
		 * @return {Class} a new subclass of `Entity`
		 */
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
			EntitySubclass::definePropertiesByValue({ name });
			
			/* populate it with the requested data and behavior */
			EntitySubclass::assign(rest);
			
			/***/
			return EntitySubclass;
		}
		
		
				
		///////////////////////////////////////////////////
		////////// STATIC CLASS ANALYSIS METHODS //////////
		///////////////////////////////////////////////////
		
		/**
		 * Test whether the given entity is an instance of this class.
		 * This is a polymorphic check; call it on `Entity` subclasses.
		 * @param {Entity} entity - the entity to test
		 * @return {boolean} whether the given entity is an instance of this class
		 */
		static hasInstance(entity) {
			if (!entity) { return false }
			return this.hasSubclass(entity.constructor);
		}
		
		/**
		 * Test whether the given class is a subclass of this class.
		 * This is a polymorphic check; call it on `Entity` subclasses.
		 * @param {Class} otherClass - the class to test
		 * @return {boolean} whether the given class is subclass of this class
		 */
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
		
		/**
		 * Returns all the subclasses of this class, both direct and indirect.
		 * This is a polymorphic check; call it on `Entity` subclasses.
		 * @return {Set<Class>} the set of subclasses of this class
		 */
		static allSubclasses() {
			let result = [this];
			for (let subClass of this.extendedBy) {
				result = [...result, ...subClass.allSubclasses()];
			}
			return new Set(result);
		}
		
		/**
		 * Overwriting the JavaScript `instanceof` operator to work with our improvised class hierarchy.
		 * @param {Entity} entity - the entity to test
		 * @return {boolean} whether the given entity is an instance of this class
		 * @see Entity.hasInstance
		 */
		static [Symbol.hasInstance](entity) {
			return this.hasInstance(entity);
		}
		
		
		///////////////////////////////
		////////// INSTANCES //////////
		///////////////////////////////
		
		/**
		 * A factory function for creating a new entity of some Entity subclass.
		 * This subclass can be determined polymorphically (e.g., by calling `Lyph.new()`),
		 * or by specifying `initialValues.class` (e.g., by calling `Entity.new({ class: 'Lyph' })`.
		 * @param {Object} [initialValues={}] - the initial values of (some of) the entity's fields
		 * @param {Object}  options
		 * @param {boolean} [options.isPlaceholder=false] - whether this new entity should be a placeholder
		 * @return {Entity} the new entity
		 */
		static new(
			initialValues: {} = {},
		    options:       {} = {}
		) : this {
				
			/* Determine the class. */
			let cls;
			if (initialValues.class) {
				cls = env.classes[initialValues.class];
				assert(this.hasSubclass(cls), humanMsg`
					The 'class' property in the initial values of a new entity has
					to represent a subclass of the base of the call.
					You cannot call \`${this.name}.new({ class: '${initialValues.class}' })\`.
				`);
			} else {
				cls = this;
				initialValues = {
					...initialValues,
					class: this.name
				};
			}
			
			/* Make sure we're not instantiating a relationship. */
			// Note that while relationships are still classes (for accessing
			// information about them statically), they were downgraded from
			// the status of first-class citizens. They should not be instantiated.
			// Perhaps the code-base can be simplified by not having them be classes
			// anymore. Any such change would mostly happen in `Module.js`.
			assert(!cls.isRelationship, humanMsg`
				You cannot instantiate ${this.name},
				because it is a Relationship subclass.
			`);
			
			/* Instantiate the class. */
			return new cls(initialValues, {
				...options,
				[$$allowInvokingConstructor]: true
			});
			
		}
		
		
		/**
		 * Whether this entity is considered a placeholder, i.e., an entity that has not (yet) loaded. Once it is `false`, it stays `false`.
		 * @type {boolean}
		 */
		@property({ readonly: true }) isPlaceholder;
		
		/**
		 * Whether the fields of this entity have been initialized. Once it is `true`, it stays `true`.
		 * @type {boolean}
		 */
		@property({ initial: false, readonly: true, isValid(v) { return !this.isPlaceholder || v === false } }) fieldsInitialized;
		
		/**
		 * Whether this entity has been deleted. Note that the entity can be 'undeleted'.
		 * @type {boolean}
		 */
		@property({ initial: false, readonly: true, allowSynchronousAccess: true, isValid(v) { return v === false || !this.isPlaceholder } }) deleted;
		
		/**
		 * Whether any `ValueTracker` based signals will still be emitted from this entity. Once it is set to `true`, it stays `true`.
		 * This should be done before discarding the entity for good.
		 * @type {boolean}
		 */
		@property({ initial: false, readonly: true, allowSynchronousAccess: true, isValid(v) { return !this.isPlaceholder || v === false } }) silent;
		
		/**
		 * The constructor is private. From the outside, call `Entity.new` instead.
		 * @private
		 * @param {Object}   initialValues
		 * @param {Object}   options
		 * @param {boolean} [options.isPlaceholder=false] - whether this new entity should be a placeholder
		 */
		constructor(initialValues = {}, options = {}) {
			/* initialize value tracking */
			super();
			
			/* make sure this constructor was invoked under proper conditions */
			assert(options[$$allowInvokingConstructor], humanMsg`
				Do not use 'new ${this.constructor.name}(...args)'.
				Instead, use '${this.constructor.name}.new(...args)'
				          or '${this.constructor.name}.get(...args)'.
			`);
			delete options[$$allowInvokingConstructor];
			
			/* init placeholder property */
			const {isPlaceholder=false} = options;
			this.pSubject('isPlaceholder').next(isPlaceholder);
			
			/* stop signals after this entity is deleted */
			const valueTrackerOptions = {
				takeUntil: this.p('silent').filter(s=>!!s)
			};
			this.setValueTrackerOptions(valueTrackerOptions);
			
			/* initialize all fields in this entity */
			env.Field.initializeEntity(this, initialValues, valueTrackerOptions);
		}
		
		/**
		 * Turn this from a placeholder into a fully realized entity,
		 * and set fields to the given initial values.
		 * @param {Object} [initialValues={}] - initial fields values
		 */
		loadIntoPlaceholder(initialValues = {}) {
			assert(this.isPlaceholder);
			for (let [key, value] of initialValues::entries()) {
				if (!this.fields[key]) { continue }
				this.fields[key].set(value);
			}
			this.pSubject('isPlaceholder').next(false);
		}
		
		/**
		 * Convey some useful information when converting this entity to a string.
		 * @return {string}
		 */
		get [Symbol.toStringTag]() {
			const identifier = this.id || this.name || this.title; // <-- just some common candidates
			return `${this.constructor.name}${identifier ? ': '+identifier : ''}`;
		}
		
		/**
		 * Augmented version of `ValueTracker#p` that also understands entity field-names.
		 * @example
		 *     let th1 = lyph.fields.thickness.p('value');
		 *     let th2 = lyph.p('thickness');
		 *     assert(th1 === th2);
		 * @param args
		 * @return {BehaviorSubject|Observable}
		 */
		p(...args) {
			if (!!this.fields && typeof args[0] === 'string' && !!this.fields[args[0]]) {
				return this.fields[args[0]].p('value');
			} else if (this.hasProperty(...args)) {
				return super.p(...args);
			}
		}
		
		
		//// Deleting
		
		/**
		 * Delete this entity.
		 * @see Entity#undelete
		 * @example
		 *     assert( !lyph.deleted );
		 *     lyph.delete();
		 *     assert(  lyph.deleted );
		 */
		delete  () { this.pSubject('deleted').next(true)  }
		
		/**
		 * Delete this entity.
		 * @see Entity#delete
		 * @example
		 *     assert(  lyph.deleted );
		 *     lyph.undelete();
		 *     assert( !lyph.deleted );
		 */
		undelete() { this.pSubject('deleted').next(false) }
		
		/**
		 * Silence this entity, so `ValueTracker` based events are no longer broadcast from this entity.
		 * Once this is done on an entity, it cannot be undone. It should be done before discarding
		 * an entity for good.
		 * @example
		 *     assert( !lyph.deleted );
		 *     lyph.delete();
		 *     assert(  lyph.deleted );
		 */
		silence() { this.pSubject('silent').next(true) }
		
		
		//// Transforming to/from JSON
		
		/** @private */
		static objectToJSON(obj, options = {}) {
			let { sourceEntity } = options;
			// TODO: rather than sourceEntity, accept an entity CLASS,
			//     : which should have a good description of the fields
			//     : This is issue open-physiology/open-physiology-model#10
		}
		
		/**
		 * Get a JSON (plain data) object of this entity and the values of all its fields.
		 * @param {Object}   options
		 * @param {boolean} [options.flattenFieldValues=false] - whether `Object` or `Array` property values should be flattened to a string in the output (for Neo4j, for example, which does not accept nested objects)
		 * @param {Class}   [options.getAddress] - a function that returns an address corresponding to a given entity; defaults to `{ class, id }`
		 * @return {Object} the JSON representation of this entity
		 */
		toJSON(options = {}) {
			let result = {};
			const {RelField, Rel$Field, Rel1Field} = env.classes;
			for (let [key, field] of this.fields::entries()) {
				if (field instanceof RelField) {
					if (key[0] !== '<' && key[0] !== '-')   { continue } // no shortcuts
					if (env.classes[key.slice(3)].abstract) { continue } // no abstract relationship fields
				}
				let valueJSON = field.constructor.valueToJSON(field.get(), options);
				if (field instanceof Rel$Field && valueJSON.length === 0)    { continue }
				if (field instanceof Rel1Field && valueJSON.length === null) { continue }
				result[key] = valueJSON;
			}
			// TODO: we can still remove more redundant info from the result here,
			//     : e.g., entities in result['-->HasLayer'] don't also have to appear in result['-->HasPart']
			return result;
		}
		
		
		//// Setting / getting of fields
		
		/**
		 * Synchronously access a field value.
		 * @param {string} key - the key of the field
		 */
		get(key) { return this.fields[key].get()             }
		
		/**
		 * Synchronously set a field to a new value.
		 * @param {string}   key      - the key of the field
		 * @param {*}        newValue - the new value for this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new value
		 */
		set(key, newValue, options = {}) { return this.fields[key].set(newValue, options) }
		
	}
	
	return env.classes['Entity'] || Entity;
};
