import isFunction from 'lodash-bound/isFunction';
import isString   from 'lodash-bound/isString';
import entries    from 'lodash-bound/entries';
import deepFreeze from 'deep-freeze-strict';
import assert     from 'power-assert';
import {setPrototype} from 'bound-native-methods';
import {
	$$entities,
	$$entitiesById,
	$$committedEntities,
	// $$isPlaceholder
} from '../symbols';
import {$$id} from '../fields/symbols';
import {constraint, humanMsg} from '../util/misc';
import {Field} from '../fields/Field';

export default (cls) => class Command_load extends cls.TrackedCommand {
	
	static commandType = 'load';
	
	static get entityClass() { return cls }
	
	static create(values, options = {}) {
		return super.create([values], {...options, values});
	}
	
	constructor(values = {}, options = {}) {
		super({
			...options,
			run:       true,
			committed: true,
			commitDependencies: [
				...(options.commitDependencies || []),
				...(()=>{
					if (!cls.isResource) { return [] }
					let r = [];
					for (let [key, value] of values::entries()) {
						const relDesc = (cls.relationships[key] || cls.relationshipShortcuts[key]);
						if (relDesc && value) {
							if (relDesc.cardinality.max <= 1) { value = [value] }
							r.push(...value.map(addr=>cls.Entity.getLocalOrNewPlaceholder(addr).originCommand));
						}
					}
					return r;
				})(),
				...(()=>{
					if (!cls.isRelationship) { return [] }
					let r = [];
					const Entity = cls.environment.Entity;
					for (let side of [1, 2]) {
						if (values[side]) {
							const localEntity = Entity.getLocalOrNewPlaceholder(values[side]);
							r.push(localEntity.originCommand);
						}
					}
					return r;
				})()
			],
			commandDependencies: [
				...(options.commandDependencies || []),
				...(()=>{
					let entity = cls.getLocal(values);
					return entity && entity.originCommand
						? [entity.originCommand]
						: [];
				})(),
				...(()=>{
					let r = [];
					if (cls.isRelationship) {
						for (let side of [1, 2]) {
							if (values[side]) {
								r.push(values[side].originCommand);
							}
						}
					}
					return r;
				})()
			]
		});
		this.values      = values;
		this.placeholder = options.placeholder;
	}
	
	get associatedEntities() {
		return new Set(this.result ? [this.result] : []);
	}
	
	values;
	placeholder;
	result;
	
	localRun() {
		this.result = cls.getLocal(this.values);
		if (!this.result) {
			/* identify class */
			const realCls = this.values.class::isString()
				? cls.environment.classes[this.values.class]
				: cls;
			
			/* sanity checks */
			constraint(this.placeholder || !realCls.abstract, humanMsg`
				Cannot instantiate the abstract
				class ${realCls.name}.
			`);
			constraint(cls.hasSubclass(realCls), humanMsg`
				Expected ${realCls.name} to be
				a subclass of ${cls.name}.
			`);
			
			/* construct entity */
			const values = { ...this.values };
			this.result                           = new realCls(
				values,
				{ ...this.options, allowInvokingConstructor: true }
			);
			this.result.pSubject('isPlaceholder').next(this.placeholder);
			
			/* initialize fields if this is not a placeholder */
			if (!this.placeholder) {
				Field.initializeEntity(this.result, values);
			} else {
				this.result[$$id] = values.id;
			}
			
			/* track this command in the entity */
			this.result.originCommand = this; // TODO: maintain array of originCommands instead
			
			/* register this entity */
			cls[$$entities].add(this.result);
			cls[$$entitiesById][this.values.id] = this.result;
			cls[$$committedEntities].add(this.result);
			
			/* after it's first committed, it's no longer new */
			this.result.pSubject('isNew').next(false);
		} else {
			/* sanity checks */
			constraint(this.result.isPristine, humanMsg`
				Cannot load data into the ${this.result.class}
				with id="${this.result.id}", because it has local changes.
			`);
			
			/* check class compatibility */
			const oldCls = cls.environment.classes[this.result.class];
			const newCls = cls.environment.classes[this.values.class];
			if (this.result.isPlaceholder) {
				constraint(oldCls.hasSubclass(newCls), humanMsg`
					Expected ${newCls.name} to be
					a subclass of ${oldCls.name}.
				`);
				if (oldCls !== newCls) {
					this.result::setPrototype(newCls.prototype);
				}
			} else {
				constraint(oldCls === newCls, humanMsg`
					Expected ${newCls.name} to be ${oldCls.name}.
				`);
			}
			
			/* track this command in the entity */
			this.result.originCommand = this; // TODO: maintain array of originCommands instead
			
			/* if we're loading a placeholder, we're done now */
			if (this.placeholder) { return }
			
			if (!this.result.fields) {
				/* initialize fields if this is not a placeholder */
				Field.initializeEntity(this.result, this.values);
			} else  {
				/* otherwise, set the values of the existing fields */
				for (let [key, value] of this.values::entries()) {
					this.result.fields[key].set(value, {
						createEditCommand: false,
						ignoreReadonly:    true,
						ignoreValidation:  true
					});
				}
			}
			this.result.pSubject('isPlaceholder').next(false);
		}
	}
	
	toJSON(options = {}) {
		assert(false, humanMsg`
			Command_load#toJSON should never be called.
			It is meant for commands that can be serialized and transmitted.
		`);
	}
	
	localCommit() {
		assert(false, humanMsg`
			Command_load#localCommit should never be called,
			because a load command starts out as being committed.
			(${id})
		`);
	}
	
	localHandleCommitResponse(response) {
	} // intentionally empty

	localRollback() {
		assert(false, humanMsg`
			Command_load#localRollback should never be called,
			because a load command starts out as being committed.
			(${this.result.id})
		`);
	}
};
