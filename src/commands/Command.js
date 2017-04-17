import Graph from 'graph.js/dist/graph';
import assert from 'power-assert';
import _uniqueId from 'lodash/uniqueId';

import isUndefined from 'lodash-bound/isUndefined';
import defaults    from 'lodash-bound/defaults';
import last        from 'lodash-bound/last';
import values      from 'lodash-bound/values';
import parseInt    from 'lodash-bound/parseInt';
import every       from 'lodash-bound/every';
import size        from 'lodash-bound/size';
import entries     from 'lodash-bound/entries';

import deepFreeze  from 'deep-freeze-strict';

import wu from 'wu';
import {map, filter} from 'lodash-bound';
import {constraint, humanMsg} from "../util/misc";

const $$graph        = Symbol('$$graph');
const $$running      = Symbol('$$running');
const $$hasRun       = Symbol('$$hasRun');
const $$committed    = Symbol('$$committed');
const $$committing   = Symbol('$$committing');
const $$rolledBack   = Symbol('$$rolledBack');
const $$rollingBack  = Symbol('$$rollingBack');
const $$commitHere   = Symbol('$$commitHere');
const $$rollbackHere = Symbol('$$rollbackHere');

export default ({backend}) => {
	
	/***/
	class Command {
		
		////////////
		// Static //
		////////////
		
		get entityClass() { return this.constructor.entityClass }
		
		static processOptions(cmd) {
			let {run, hasRun, committed, rolledBack} = cmd.options;
			
			/* option normalization and sanity-check */
			assert(!committed || !rolledBack);
			assert(!committed && !rolledBack || hasRun !== false);
			assert(!run || !hasRun);
			
			/* handle state */
			cmd[$$running]     = false;
			cmd[$$committing]  = false;
			cmd[$$rollingBack] = false;
			cmd[$$hasRun]      = !!hasRun;
			cmd[$$committed]   = !!committed;
			cmd[$$rolledBack]  = !!rolledBack;
			if (run) { cmd.run() }
		}
		
		static create(initialArgs, options) {
			// TODO: how to streamline the possible duplication of both initialArgs and options containing `values`?
			let {values = {}} = options;
			
			/* fetch references for given values */
			const cls = this.entityClass;
			if (cls && cls.isResource) {
				for (let [key, value] of values::entries()) {
					const relDesc = (cls.relationships[key] || cls.relationshipShortcuts[key]);
					if (relDesc && value) {
						if (relDesc.cardinality.max <= 1) {
							values[key] = cls.Entity.getLocalOrNewPlaceholder(value);
						} else {
							values[key] = value.map(addr=>cls.Entity.getLocalOrNewPlaceholder(addr));
						}
					}
				}
			} else if (cls && cls.isRelationship) {
				for (let side of [1, 2]) {
					if (values[side]) {
						values[side] = cls.Entity.getLocalOrNewPlaceholder(values[side]);
					}
				}
			}
			
			/* construct the command and handle options */
			let cmd = new this(...initialArgs, { ...options, allowInvokingConstructor: true });
			cmd.options.command = cmd;
			this.processOptions(cmd);
			return cmd;
		}
		
		constructor(options = {}) {
			this.options = options;
			/* make sure this constructor was invoked under proper conditions */
			constraint(options.allowInvokingConstructor, humanMsg`
				Do not use 'new ${this.constructor.name}(...args)'.
				Instead, use '${this.constructor.name}.create(...args)'.
			`);
			delete options.allowInvokingConstructor;
		}
		
		/// /// /// /// /// Basic methods /// /// /// /// ///
		
		get commandType() { return this.constructor.commandType }
		
		localRun()          { assert(false, "Command subclass must override 'localRun'.")      }
		async localCommit() { assert(false, "Command subclass must override 'localCommit'.")   }
		localRollback()     { assert(false, "Command subclass must override 'localRollback'.") }
		
		get hasRun()     { return this[$$hasRun    ] }
		get committed()  { return this[$$committed ] }
		get rolledBack() { return this[$$rolledBack] }
		
		toJSON(options = {}) { assert(false, "Command subclass must override 'toJSON'.") }
		
		/// /// /// /// /// Smart run, commit, rollback /// /// /// /// ///
		
		run() {
			if (this[$$running] || this[$$hasRun]) { return }
			this[$$running] = true;
			this.localRun();
			this[$$running] = false;
			this[$$hasRun]  = true;
		}
		
		async commit() {
			assert(this[$$hasRun], "Cannot commit a command that hasn't yet run.");
			assert(!this[$$rolledBack],  "Cannot commit a command that's already rolled back.");
			assert(!this[$$rollingBack], "Cannot commit a command that's in the process of being rolled back.");
			if (this[$$committing] || this[$$committed]) { return }
			this[$$committing] = true;
			let response = await this.localCommit();
			this.handleCommitResponse(response);
		}
		
		handleCommitResponse(response) {
			this.localHandleCommitResponse(response);
			this[$$committing] = false;
			this[$$committed]  = true;
		}
		
		rollback() {
			assert( this[$$hasRun],     "Cannot roll back a command that hasn't yet run.");
			assert(!this[$$committed],  "Cannot roll back a command that's already committed.");
			assert(!this[$$committing], "Cannot roll back a command that's in the process of being committed.");
			if (this[$$rollingBack] || this[$$rolledBack]) { return }
			this[$$rollingBack] = true;
			this.localRollback();
			this[$$rollingBack] = false;
			this[$$rolledBack]  = true;
			commandGraph.destroyVertex(this);
			// NOTE: in theory, a rolled back command can be run again,
			//       but we do not support this yet.
		}
		
	}
	
	
	/* track commands in a dependency graph */
	const commandGraph = new Graph;
	
	/* debugging output for command dependencies */
	// // TODO: remove debugging below
	// commands.on('vertex-added', ([k, v]) => {
	// 	switch (k.commandType) {
	// 		case 'new':    console.log('+   NEW ', k.entityClass.name, k.initialValues.name); break;
	// 		case 'edit':   console.log('+   EDIT', k.entityClass.name, k.entity.name);        break;
	// 		case 'delete': console.log('+   DEL ', k.entityClass.name, k.entity.name);        break;
	// 	}
	// });
	// commands.on('edge-added', ([[f, t], e]) => {
	// 	let fromCmd, toCmd;
	// 	switch (f.commandType) {
	// 		case 'new':    fromCmd = ('NEW  ' + f.entityClass.name + ' ' + f.initialValues.name); break;
	// 		case 'edit':   fromCmd = ('EDIT ' + f.entityClass.name + ' ' + f.entity.name);        break;
	// 		case 'delete': fromCmd = ('DEL  ' + f.entityClass.name + ' ' + f.entity.name);        break;
	// 	}
	// 	switch (t.commandType) {
	// 		case 'new':    toCmd = ('NEW  ' + t.entityClass.name + ' ' + t.initialValues.name); break;
	// 		case 'edit':   toCmd = ('EDIT ' + t.entityClass.name + ' ' + t.entity.name);        break;
	// 		case 'delete': toCmd = ('DEL  ' + t.entityClass.name + ' ' + t.entity.name);        break;
	// 	}
	// 	console.log(`+  (${fromCmd}) --> (${toCmd})`, e);
	// });
	// commands.on('vertex-removed', (k) => {
	// 	switch (k.commandType) {
	// 		case 'new':    console.log('-   NEW ', k.entityClass.name, k.initialValues.name); break;
	// 		case 'edit':   console.log('-   EDIT', k.entityClass.name, k.entity.name);        break;
	// 		case 'delete': console.log('-   DEL ', k.entityClass.name, k.entity.name);        break;
	// 	}
	// });
	// commands.on('edge-removed', ([f, t]) => {
	// 	let fromCmd, toCmd;
	// 	switch (f.commandType) {
	// 		case 'new':    fromCmd = ('NEW  ' + f.entityClass.name + ' ' + f.initialValues.name); break;
	// 		case 'edit':   fromCmd = ('EDIT ' + f.entityClass.name + ' ' + f.entity.name);        break;
	// 		case 'delete': fromCmd = ('DEL  ' + f.entityClass.name + ' ' + f.entity.name);        break;
	// 	}
	// 	switch (t.commandType) {
	// 		case 'new':    toCmd = ('NEW  ' + t.entityClass.name + ' ' + t.initialValues.name); break;
	// 		case 'edit':   toCmd = ('EDIT ' + t.entityClass.name + ' ' + t.entity.name);        break;
	// 		case 'delete': toCmd = ('DEL  ' + t.entityClass.name + ' ' + t.entity.name);        break;
	// 	}
	// 	console.log(`-  (${fromCmd}) --> (${toCmd})`);
	// });
	
	
	/* Commands that have their dependencies tracked */
	class TrackedCommand extends Command {
	
		////////////
		// Static //
		////////////
		
		get entityClass() { return this.constructor.entityClass }
	
		get associatedEntities() {
			assert(false, humanMsg`
				The ${this.constructor.name}#associatedEntities accessor
				is not implemented.
			`);
		}
		
		postProcessAssociatedEntities() {
			for (let entity of this.associatedEntities) {
				const commands = [entity.originCommand, ...entity.editCommands, entity.deleteCommand];
				if (commands.every(cmd => !cmd || cmd.committed || cmd.rolledBack)) {
					entity.pSubject('isPristine').next(true);
				}
			}
		}
		
		static processOptions(cmd) {
			const {commitDependencies = [], commandDependencies = [], forcedDependencies = []} = cmd.options;
			commandGraph.addVertex(cmd, cmd);
			for (let dep of commitDependencies ) { commandGraph.addEdge(dep, cmd, { commitDependency: true }) }
			for (let dep of commandDependencies) { commandGraph.addEdge(dep, cmd, { commitDependency: true, rollbackDependency: true }) }
			for (let dep of forcedDependencies ) { commandGraph.addEdge(dep, cmd, { commitDependency: true, rollbackDependency: true, forcedDependency: true }) }
			super.processOptions(cmd);
		}
		
		static latest({entity, committable} = {}) {
			/* checking if a command is a candidate */
			const isCandidate = (cmd) => (
				!entity ||
				cmd.associatedEntities.has(entity)
			) && (
				!committable ||
				!cmd[$$committed]  &&
				!cmd[$$committing] &&
				!cmd[$$rolledBack] &&
				!cmd[$$rollingBack]
			);
			
			/* if an associated entity is not given, just return the non-dependency commands */
			if (!entity) {
				return new Set(wu(commandGraph.sinks())
					.filter(([key, cmd]) => isCandidate(cmd))
					.map(([key]) => key));
			}
			
			/* otherwise, find all associated commands that are not dependencies of other associated commands */
			const result = new Set(wu(commandGraph.vertices())
				.filter(([key, cmd]) => isCandidate(cmd))
				.map(([key]) => key));
			const visited = new WeakSet;
			function eliminateCandidates(cmd, latestAssociatedCmd) {
				if (visited.has(cmd)) { return }
				visited.add(cmd);
				for (let [postCmd] of commandGraph.verticesFrom(cmd)) {
					if (isCandidate(postCmd)) {
						result.delete(latestAssociatedCmd);
						eliminateCandidates(postCmd, postCmd);
					} else {
						eliminateCandidates(postCmd, latestAssociatedCmd);
					}
				}
			}
			for (let cmd of result) { eliminateCandidates(cmd, cmd) }
			return result;
		}
		
		static earliest({entity, rollbackable} = {}) {
			/* checking if a command is a candidate */
			const isCandidate = (cmd) => (
				!entity ||
				cmd.associatedEntities.has(entity)
			) && (
				!rollbackable ||
				!cmd[$$committed]  &&
				!cmd[$$committing] &&
				!cmd[$$rolledBack] &&
				!cmd[$$rollingBack]
			);
			
			/* if an associated entity is not given, just return all non-dependent commands */
			if (!entity) {
				return new Set(wu(commandGraph.sources())
					.filter(([key, cmd]) => isCandidate(cmd))
					.map(([key]) => key));
			}
			
			/* otherwise, find all associated commands that are not dependencies of other associated commands */
			const result = new Set(wu(commandGraph.vertices())
				.filter(([key, cmd]) => isCandidate(cmd))
				.map(([key]) => key));
			const visited = new WeakSet;
			const eliminateCandidates = (cmd, latestAssociatedCmd) => {
				if (visited.has(cmd)) { return }
				visited.add(cmd);
				for (let [preCmd] of commandGraph.verticesTo(cmd)) {
					if (isCandidate(preCmd)) {
						result.delete(latestAssociatedCmd);
						eliminateCandidates(preCmd, preCmd);
					} else {
						eliminateCandidates(preCmd, latestAssociatedCmd);
					}
				}
			};
			for (let cmd of result) { eliminateCandidates(cmd, cmd) }
			return result;
		}
		
		
		////////// About forced commands //////////
		// If command A forces command B,
		// then A runs/commits before B,
		// but committing   A commits    B,
		// and rolling back B rolls back A.
		// Example: A 'new Lyph' command forces
		//          some 'new Border' commands.
		//////////////////////////////////////////
		
		
		/// /// /// /// /// Smart run /// /// /// /// ///
		
		run() {
			if (this[$$running] || this[$$hasRun]) { return }
			this[$$running] = true;
			
			/* scheduling runs that need to happen before this one */
			const commandsToRunBeforeMe = new Set;
			
			// dependency runs
			for (let [dep,,{runDependency}] of commandGraph.verticesTo(this)) {
				if (dep[$$running] || dep[$$hasRun]) { continue }
				dep[$$running] = true;
				commandsToRunBeforeMe.add(dep);
			}
			
			// forced command runs
			for (let [rdep,, {forcedDependency}] of commandGraph.verticesFrom(this)) {
				if (!forcedDependency)                 { continue }
				if (rdep[$$running] || rdep[$$hasRun]) { continue }
				rdep[$$running] = true;
				commandsToRunBeforeMe.add(rdep);
			}
			
			/* await those rollbacks first */
			for (let c of commandsToRunBeforeMe) { c.run() }
			
			/* then run this command */
			this.localRun();
			this[$$running] = false;
			this[$$hasRun]  = true;
			
			/* post process entities (e.g., to set 'pristine' flag) */
			this.postProcessAssociatedEntities();
		}
		
		/// /// /// /// /// Smart commit /// /// /// /// ///
		
		commitDependencies(commandsFoundSoFar = new Set) {
			// We're passing and returning the command set by reference
			/* only visit each command once */
			if (commandsFoundSoFar.has(this)) { return }
			commandsFoundSoFar.add(this);
			/* add dependency commits */
			for (let [dep,,{commitDependency}] of commandGraph.verticesTo(this)) {
				if (!commitDependency)                     { continue }
				if (dep[$$committing] || dep[$$committed]) { continue }
				dep.commitDependencies(commandsFoundSoFar);
			}
			/* add forced commits */
			for (let [rdep,,{forcedDependency}] of commandGraph.verticesFrom(this)) {
				if (!forcedDependency)                       { continue }
				if (rdep[$$committing] || rdep[$$committed]) { continue }
				rdep.commitDependencies(commandsFoundSoFar);
			}
		}
		
		async commit() {
			
			assert(this[$$hasRun], "Cannot commit a command that hasn't yet run.");
			if (this[$$committing] || this[$$committed]) { return }
			this[$$committing] = true;
			
			/* scheduling commits that need to happen before this one */
			const commandsToCommitBeforeMe = new Set;
			// dependency commits
			for (let [dep,,{commitDependency}] of commandGraph.verticesTo(this)) {
				if (!commitDependency || dep[$$committing] || dep[$$committed]) { continue }
				commandsToCommitBeforeMe.add(dep);
			}
			
			/* scheduling commits that need to be forced after this one */
			const commandsToCommitAfterMe = new Set;
			// forced commits
			for (let [rdep,,{forcedDependency}] of commandGraph.verticesFrom(this)) {
				if (!forcedDependency)                       { continue }
				if (rdep[$$committing] || rdep[$$committed]) { continue }
				commandsToCommitAfterMe.add(rdep);
			}
			
			/* await dependency commits first */
			await Promise.all([...commandsToCommitBeforeMe].map(c=>c.commit()));
			
			/* then commit this command */
			let response = await this.localCommit();
			
			/* then await forced dependent commits */
			await Promise.all([...commandsToCommitAfterMe].map(c=>c.commit()));
			
			/* handle local commit response */
			this.handleCommitResponse(response);
			
			/* post process entities (e.g., to set 'pristine' flag) */
			this.postProcessAssociatedEntities();
		}
		
		/// /// /// /// /// Smart rollback /// /// /// /// ///
		
		rollback() {
			assert( this[$$hasRun],     "Cannot roll back a command that hasn't yet run.");
			assert(!this[$$committed],  "Cannot roll back a command that's already committed.");
			assert(!this[$$committing], "Cannot roll back a command that's in the process of being committed.");
			if (this[$$rollingBack] || this[$$rolledBack]) { return }
			this[$$rollingBack] = true;
			
			/* scheduling rollbacks that need to happen before this one */
			const commandsToRolledBackBeforeMe = new Set;
			
			// dependency rollbacks
			for (let [rdep,, {rollbackDependency}] of commandGraph.verticesFrom(this)) {
				if (!rollbackDependency)                       { continue }
				if (rdep[$$rollingBack] || rdep[$$rolledBack]) { continue }
				commandsToRolledBackBeforeMe.add(rdep);
			}
			
			// forced command rollbacks
			for (let [dep,, {forcedDependency}] of commandGraph.verticesTo(this)) {
				if (!forcedDependency)                       { continue }
				if (dep[$$rollingBack] || dep[$$rolledBack]) { continue }
				commandsToRolledBackBeforeMe.add(dep);
			}
			
			/* perform those rollbacks first */
			for (let c of commandsToRolledBackBeforeMe) { c.rollback() }
			
			/* then roll back this command */
			this.localRollback();
			this[$$rollingBack] = false;
			this[$$rolledBack]  = true;
			commandGraph.destroyVertex(this);
			// NOTE: in theory, a rolled back command can be run again,
			//       but we do not support this yet.
			
			/* post process entities (e.g., to set 'pristine' flag) */
			this.postProcessAssociatedEntities();
		}
		
		
		
	}
	
	
	////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	/* tracking temporary ids */
	// temporary ids are negative // TODO: create regression test to confirm this
	function newTemporaryId() {
		return -_uniqueId()::parseInt();
	}
	
	/***/
	class Command_batch extends Command {
		
		static commandType = 'batch';
		
		static create(commands, options = {}) {
			constraint(commands::every(command => command.hasRun));
			return super.create([commands], options);
		}
		
		constructor(commands, options = {}) {
			super({ ...options, hasRun: true });
			this.commands = new Set(commands);
		}
		
		localRun() {
			assert(false, humanMsg`
				Command_batch#localRun should never be called,
				because a batch command may only contain commands
				that have already run.
			`);
		}
		
		async localCommit() {
			////////////////////////////////////////////////////////////
			// Preparation
			
			/* get all directly associated entities */
			const associatedEntities = new Set;
			for (let command of this.commands) {
				for (let entity of command.associatedEntities) {
					associatedEntities.add(entity);
				}
			}
			
			/* generate temporary ids for newly created entities */
			const temporaryIds = new Set;
			const entityToTemporaryId = new Map;
			for (let entity of associatedEntities) {
				if (!entity.id && !entityToTemporaryId.has(entity)) {
					const id = newTemporaryId();
					entityToTemporaryId.set(entity, id);
					temporaryIds.add(id);
				}
			}
			
			/* create JSON object */
			this.commandList = [
				...wu(commandGraph.vertices_topologically())
					.map(([cmd]) => cmd)
					.filter(cmd => this.commands.has(cmd))
			];
			const commandListJSON = this.commandList
				::map(cmd => cmd.toJSON({
					entityToTemporaryId,
					minimal: true // TODO: does minimal still do anything? (probably not)
				}));
			
			
			/* remove forward references */
			let tmpIdsSeen = new Set;
			for (let i = 0; i < this.commandList.length; ++i) {
				const localCommand     = this.commandList[i];
				const localCommandJSON = commandListJSON[i];
				let entity     = localCommand    .result || localCommand    .entity;
				let valuesJSON = localCommandJSON.values || localCommandJSON.newValues;
				if (temporaryIds.has(valuesJSON.id)) {
					tmpIdsSeen.add(valuesJSON.id);
				}
				for (let [key, valueJSON] of valuesJSON::entries()) {
					switch (entity.fields[key].constructor.name) {
						case 'Rel$Field': {
							for (let [i, valJSON] of valueJSON::entries()) {
								if (temporaryIds.has(valJSON.id) && !tmpIdsSeen.has(valJSON.id)) {
									valueJSON.splice(i, 1);
								}
							}
							if (valueJSON.length === 0) {
								delete valuesJSON[key];
							}
						} break;
						case 'Rel1Field': {
							if (valueJSON && temporaryIds.has(valueJSON.id) && !tmpIdsSeen.has(valueJSON.id)) {
								delete valuesJSON[key];
							}
						} break;
					}
				}
			}
			
			////////////////////////////////////////////////////////////
			// report to backend
			return await backend.commit_batch(deepFreeze({
				commandType:  'batch',
				temporaryIds: [...temporaryIds],
				commands:     [...commandListJSON]
			}));
		}
		
		localHandleCommitResponse(response) {
			for (let i = 0; i < this.commandList.length; ++i) {
				const localCommand  = this.commandList[i];
				const localResponse = response.commands[i];
				localCommand.handleCommitResponse(localResponse);
			}
		}
	
		localRollback() {
			assert(false, humanMsg`
				Command_batch#localRollback should never be called.
				A batch command is only meant for committing tracked commands.
			`);
		}
	}
	
	
	////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	
	return {Command, TrackedCommand, Command_batch};
};
