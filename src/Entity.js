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
import {ValueTracker, event, property} from 'utilities';
import {Observable, BehaviorSubject} from './libs/rxjs.js';
// TODO: make sure we don't need to import anymore: combineLatest
// TODO: make sure we don't need to import anymore: do

import {map} from 'lodash-bound';

import {defineProperties, defineProperty, assign, setPrototype} from 'bound-native-methods';

import {babelHelpers} from 'utilities';
import {constraint}   from './util/misc';
import assert from 'power-assert';

import command_newClassFactory    from './commands/Command_new';
import command_deleteClassFactory from './commands/Command_delete';
import command_editClassFactory   from './commands/Command_edit';
import command_loadClassFactory   from './commands/Command_load';

import {
	$$entitiesById,
	$$committedEntities,
	$$entities,
	// $$isPlaceholder
} from './symbols';
const $$newEntitySubject         = Symbol('$$newEntitySubject'   );
const $$deleted                  = Symbol('$$deleted'            );
const $$entitiesSubject          = Symbol('$$allSubject'         );
const $$committedEntitiesSubject = Symbol('$$allCommittedSubject');
const $$Command_load             = Symbol('$$Command_load');

////////////////////////////////////////////////////////////////////////////////

export default (environment) => {
	
	let {Command, TrackedCommand, Command_batch, backend} = environment;
	
	function createCommandClasses(cls) {
		cls::definePropertyByValue('Command',        Command                        );
		cls::definePropertyByValue('TrackedCommand', TrackedCommand                 );
		cls::definePropertyByValue('Command_batch',  Command_batch                  );
		cls::definePropertyByValue('Command_new',    command_newClassFactory   (cls));
		cls::definePropertyByValue('Command_delete', command_deleteClassFactory(cls));
		cls::definePropertyByValue('Command_edit',   command_editClassFactory  (cls));
		cls::definePropertyByValue($$Command_load,   command_loadClassFactory  (cls));
	}
	
	class Entity extends ValueTracker {
		
		static get environment() { return environment }
		
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
			// expression, so that it can be extended by babel-compiled code)
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
			EntitySubclass::definePropertiesByValue({
				name
			});
			
			/* maintaining <Class>.p('all') and <Class>.p('allCommitted') */
			for (let [$$set,               $$subject                 ] of [
				     [$$entities,          $$entitiesSubject         ],
				     [$$committedEntities, $$committedEntitiesSubject]
			]) {
				const localSet = new ObservableSet();
				Entity[$$set].e('add'   ).filter(::EntitySubclass.hasInstance).subscribe(localSet.e('add'   ));
				Entity[$$set].e('delete').filter(::EntitySubclass.hasInstance).subscribe(localSet.e('delete'));
				EntitySubclass::definePropertyByValue($$subject, localSet.p('value'));
			}
			
			/* introduce Command subclasses */
			createCommandClasses(EntitySubclass);
			
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
		
		static p(name) {
			switch (name) {
				case 'all':          return this[$$entitiesSubject];
				case 'allCommitted': return this[$$committedEntitiesSubject];
				default: constraint(false, humanMsg`
					The ${name} property does not exist on ${this.name}.
				`);
			}
		}
						
		//////////////////////////////////////////////////
		////////// EXPLICITLY CREATING COMMANDS //////////
		//////////////////////////////////////////////////
		
		//// new
		
		static commandNew(
			initialValues: {} = {},
		    options:       {} = {}
		) {
			return this.Command_new.create(initialValues, options);
		}
		
		//// edit
		
		static commandEdit(
			entity,
			newValues: Object = {},
		    options:   Object = {}
		) {
			return this.Command_edit.create(entity, newValues, options);
		}
		
		commandEdit(
			newValues: Object = {},
		    options:   Object = {}
		) {
			return this.constructor.commandEdit(this, newValues, options);
		}
		
		//// delete
		
		static commandDelete(
			entity,
		    options: Object = {}
		) {
			return this.Command_delete.create(entity, options);
		}
		
		commandDelete(
		    options: Object = {}
		) {
			return this.constructor.commandDelete(this, options);
		}
		
		////////////////////////////////////////////////////
		////////// Synchronous Model Manipulation //////////
		////////////////////////////////////////////////////
		
		static new(
			initialValues: {} = {},
		    options:       {} = {}
		) : this {
			return this.commandNew(initialValues, { ...options, run: true }).result;
		}
		
		edit(
			newValues: {},
		    options:   {} = {}
		) {
			this.commandEdit(newValues, { ...options, run: true });
		}
		
		delete(options: {} = {}) {
			this.commandDelete({ ...options, run: true });
		}
		
		// get isPlaceholder() { return this[$$isPlaceholder] }
		
		////////////////////////////////////////////
		////////// Caching Model Entities //////////
		////////////////////////////////////////////
		
		static hasCache(
			entityOrAddress: Entity | { id: number } | number
		) {
			let entity = this.getLocal(entityOrAddress);
			return entity && !entity.isPlaceholder;
		}
		
		static hasPlaceholder(
			entityOrAddress: Entity | { id: number } | number
		) {
			let entity = this.getLocal(entityOrAddress);
			return entity && entity.isPlaceholder;
		}
		
		static hasLocal(
			entityOrAddress: Entity | { id: number } | number
		) {
			return !!this.getLocal(entityOrAddress);
		}
		
		static getLocal(
			entityOrAddress: Entity | { id: number } | number
		) : this {
			/* is it already a local entity? */
			if (entityOrAddress instanceof Entity) { return entityOrAddress }
			
			/* normalize address */
			const address = this.normalizeAddress(entityOrAddress);
			
			/* if it's not yet cached, return undefined */
			if (!Entity[$$entitiesById][address.id]) { return }
			
			/* fetch the entity (or placeholder) from the cache */
			let entity = Entity[$$entitiesById][address.id];
			
			/* make sure the retrieved entity is of the expected class */
			constraint(this.hasInstance(entity), humanMsg`
				The entity at '${JSON.stringify(address.id)}'
				is not of class '${this.name}'
				but of class '${entity.constructor.name}'.
			`);
			
			/***/
			return entity;
		}
		
		static getLocalOrNewPlaceholder( // TODO: make private?
			entityOrAddress: Entity | { id: number } | number,
			options: {} = {}
		) : this {
			let result = this.getLocal(entityOrAddress);
			if (!result) { result = this.setPlaceholder(entityOrAddress, options) }
			return result;
		}
		
		static setPlaceholder(
			address: { id: number } | number,
			options: {} = {}
		) {
			const addressObj = this.normalizeAddress(address);
			let placeholder = this[$$Command_load].create(addressObj, { ...options, placeholder: true }).result;
			return placeholder;
		}
		
		static setCache( // TODO: make private
			values:  Entity | { id: number } | number,
			options: {} = {}
		) {
			if (values instanceof Entity) { return values }
			let entity = this[$$Command_load].create(values, options).result;
			return entity;
		}
		
		////////////////////////////////////////////////////////////////
		////////// Asynchronous Entity Retrieval from Backend //////////
		////////////////////////////////////////////////////////////////
		
		static async get(
			addresses: Array | { id: number } | number,
			options:   {} = {} // TODO: filtering, expanding, paging, ...
		) : this {
			const useArray = addresses::isArray();
			if (!useArray) { addresses = [addresses] }
			
			/* for the ones that aren't yet cached, load and cache them now (async) */
			const absentAddresses = addresses
				::map(::this.normalizeAddress)
				::reject(::this.hasCache);
			if (absentAddresses.length > 0) {
				for (let response of await backend.load(absentAddresses, options)) {
					this.setCache(response);
				}
			}
			
			/* fetch the entities from the cache */
			let result = addresses::map(addr => this.getLocal(addr, options));
			if (!useArray) { result = result[0] }
			return result;
		}
		
		static async getAll(
			options: {} = {} // TODO: filtering, expanding, paging, ...
		) : this {

			let response = await backend.loadAll(this, options);
			let result   = new Set;
			
			/* cache response */
			for (let values of response) {
				let entity = this.getLocal(values);
				if (!entity) { entity = this.setCache(values) }
				result.add(entity);
			}
			
			return result;
		}
		
		
		////////////////////////////
		////////// EVENTS //////////
		////////////////////////////
		
		@event() deleteEvent;
		@event() commitEvent;
		@event() rollbackEvent;
		@property({ initial: false, readonly: true }) isDeleted;
		@property({ initial: true,  readonly: true }) isPristine;
		@property({ initial: false, readonly: true }) isNew;
		@property({ initial: false, readonly: true }) fieldsInitialized;
		@property({ readonly: true })                 isPlaceholder;
		
		
		///////////////////////////////
		////////// INSTANCES //////////
		///////////////////////////////
		
		constructor(
			initialValues: {} = {},
			options      : {} = {}
		) {
			/* initialize value tracking */
			super();
			super.setValueTrackerOptions({
				takeUntil: Observable.combineLatest(
					this.p('isDeleted'),
					this.p('isPristine'),
					this.p('isNew'),
					(d, p, n) => d && (p || n)
				).filter(v=>!!v)
			});
			
			/* make sure this constructor was invoked under proper conditions */
			constraint(options.allowInvokingConstructor, humanMsg`
				Do not use 'new ${this.constructor.name}(...args)'.
				Instead, use '${this.constructor.name}.new(...args)'
				          or '${this.constructor.name}.get(...args)'.
			`);
			delete options.allowInvokingConstructor;
			
			/* keeping track of related commands */
			this.originCommand = options.command;
			this.editCommands  = [];
			this.deleteCommand = null;
			
			/* set defaults for the core initial field values */
			initialValues::defaults({
				id:  null,
				class: this.constructor.name
			});
			
			/* initialize all fields in this entity */
			Field.initializeEntity(this, initialValues);
		}
		
		get [Symbol.toStringTag]() {
			return `${this.constructor.name}: ${this.id}`;
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
			//       which should have a good description of the fields
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
			let { entityToTemporaryId = new Map } = options;
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
			let res = this.constructor.objectToJSON(result, { ...options, sourceEntity: this });
			return res;
		}
		
		
		//// Setting / getting of fields
		
		get(key)                    { return this.fields[key].get()                                             }
		set(key, val, options = {}) { return this.fields[key].set(val, { createEditCommand: true, ...options }) }
		
		
		//// Commit & Rollback
		
		/**
		 * Commit all changes to this entity,
		 * taking the command dependency tree into account.
		 * @returns {Promise.<void>}
		 */
		async commit() {
			/* commit all latest commands associated with this entity */
			// NOTE: committing the latest commands also commits their
			//       dependencies, i.e., commits every associated command
			// const latestCommands = TrackedCommand.latest({ entity: this, committable: true });
			// await Promise.all( latestCommands::map(cmd => cmd.commit()) );
			
			// trying to always use batchCommit; TODO: see if that works
			await this.batchCommit();
			
		}
		
		// FOR TESTING BATCH COMMAND COMMITS; TODO: integrate properly
		async batchCommit() {
			const latestCommands = TrackedCommand.latest({ entity: this, committable: true });
			const gatheredCommands = new Set;
			for (let command of latestCommands) {
				command.commitDependencies(gatheredCommands);
			}
			// debugger;
			let batchCommand = Command_batch.create(gatheredCommands);
			// debugger;
			await batchCommand.commit();
			// debugger;
			
		}
		
		
		/**
		 * Roll back all changes to this entity,
		 * taking the command dependency tree into account.
		 */
		rollback() {
			/* commit all latest commands associated with this entity */
			// NOTE: rolling back the earliest commands also rolls back their
			//       reverse dependencies, i.e., rolls back every associated command
			for (let cmd of TrackedCommand.earliest({ entity: this, rollbackable: true })) {
				cmd.rollback();
			}
		}
		
	}

	createCommandClasses(Entity);
	Entity::assign({
		[$$entities]                : new ObservableSet(),
		[$$entitiesSubject]         : new BehaviorSubject(new Set()),
		
		[$$committedEntities]       : new ObservableSet(),
		[$$committedEntitiesSubject]: new BehaviorSubject(new Set()),
		
		[$$entitiesById] :            {}
	});
	
	return Entity;
}


///// FROM Entity CLASS
// // TODO: check if getAll / getAllCommitted are ever used by any of our apps
// static getAll() {
// 	return new Set([...this[$$entities]].filter(::this.hasInstance));
// }
//
// static getAllCommitted() {
// 	return new Set([...this[$$committedEntities]].filter(::this.hasInstance));
// }

///// FROM Entity CONSTRUCTOR
// // TODO: remove this? Fields are no longer 'in charge' of committing
// /* entity is pristine if all its fields are pristine */
// Observable.combineLatest(
// 	...this.fields::values()::map(f=>f.p('isPristine')),
// 	(...fieldPristines) => fieldPristines.every(v=>!!v)
// ).subscribe( this.pSubject('isPristine') );

///// FROM Entity CONSTRUCTOR
// // TODO: CHECK CROSS-PROPERTY CONSTRAINTS?
