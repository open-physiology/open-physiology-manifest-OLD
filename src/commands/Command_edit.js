import {constraint, humanMsg} from '../util/misc';

import assert  from 'power-assert';
import keys    from 'lodash-bound/keys';
import entries from 'lodash-bound/entries';
import isArray from 'lodash-bound/isArray';

import deepFreeze from 'deep-freeze-strict';

// import {
// 	$$isPlaceholder
// } from '../symbols';


// TODO: Make all field-setter code use this command

export default (cls) => class Command_edit extends cls.TrackedCommand {
	
	static commandType = 'edit';
	
	static get entityClass() { return cls }
	
	static create(entity, newValues = {}, options = {}) {
		return super.create([entity, newValues], {...options, values: newValues});
	}
	
	constructor(entity, newValues = {}, options = {}) {
		super({
			...options,
			commitDependencies: [
				...(options.commitDependencies || []),
				...(()=>{
					if (!cls.isResource) { return [] }
					let r = [];
					for (let [key, value] of newValues::entries()) {
						if ((cls.relationships[key] || cls.relationshipShortcuts[key]) && value) {
							if (!value::isArray()) { value = [value] }
							r.push(...value.map(addr=>cls.Entity.getLocalOrNewPlaceholder(addr).originCommand));
						}
					}
					return r;
				})(),
				...(()=>{
					if (!cls.isRelationship) { return [] }
					let r = [];
					for (let side of [1, 2]) {
						if (newValues[side]) {
							r.push(cls.Entity.getLocalOrNewPlaceholder(newValues[side]).originCommand);
						}
					}
					return r;
				})()
			],
			commandDependencies: [
				entity.originCommand,
				...(entity.editCommands         || []),
				// TODO: only dependent on edit commands with shared property keys
				...(options.commandDependencies || [])
			]
		});
		this.entity    = entity;
		this.newValues = newValues;
	}
	
	get associatedEntities() {
		return new Set(this.entity ? [this.entity] : []);
	}

	entity;
	oldValues = null;
	
	localRun() {
		/* sanity checks */
		constraint(this.entity, humanMsg`
			Cannot edit an entity
			that was not specified in
			the Command_edit constructor.
		`);
		constraint(!this.entity.isPlaceholder, humanMsg`
			Cannot edit a placeholder.
			Load the entity fully before editing.
		`);
		
		/* store old values so we have the ability to roll back */
		this.oldValues = {};
		let thereAreChanges = false;
		for (let key of this.newValues::keys()) {
			if (this.oldValues[key] !== this.entity[key]) {
				this.oldValues[key] = this.entity[key];
				thereAreChanges = true;
			}
		}
		
		/* track this command in the entity */
		this.entity.editCommands.push(this);
		
		/* set the new values */
		for (let [key, newValue] of this.newValues::entries()) {
			this.entity.fields[key].set(newValue, { createEditCommand: false });
		}
		
		/* if changes were made, the entity is no longer pristine */
		if (thereAreChanges) {
			this.entity.pSubject('isPristine').next(false);
		}
	}
	
	toJSON(options = {}) {
		return {
			commandType: 'edit',
			entity:    this.entity.constructor.normalizeAddress(this.entity, options),
			newValues: this.entity.constructor.objectToJSON(this.newValues, { sourceEntity: this.entity })
		};
	}
	
	async localCommit() {
		const backend = cls.environment.backend;
		return await backend.commit_edit(deepFreeze(this.toJSON()));
	}
	
	localHandleCommitResponse(response) {
		// TODO: (update fields that changed since commit?)
	}

	localRollback() {
		/* un-track this command in the entity */
		const popped = this.entity.editCommands.pop();
		assert(popped === this, humanMsg`
			Somehow the invariant of the entity editCommands stack
			was not maintained, or commands have been rolled back
			in the wrong order.
		`);
		
		/* set the old values back */
		for (let [key, oldValue] of this.oldValues::entries()) {
			this.entity.fields[key].set(oldValue, { createEditCommand: false });
		}
	}
};
