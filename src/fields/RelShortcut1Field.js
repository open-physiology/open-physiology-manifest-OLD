// TODO: make sure we don't need to import this anymore: filter;
// TODO: make sure we don't need to import this anymore: switchMap;
// TODO: make sure we don't need to import this anymore: mapTo;
// TODO: make sure we don't need to import this anymore: take;
// TODO: make sure we don't need to import this anymore: takeUntil;
// import {defer as deferObservable} from 'rxjs/observable/defer';
// import 'rxjs/add/operator/do';

import {Observable} from '../libs/rxjs.js'

import entries     from 'lodash-bound/entries';
import isObject    from 'lodash-bound/isObject';
import isUndefined from 'lodash-bound/isUndefined';
import last        from 'lodash-bound/last';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {humanMsg} from '../util/misc';

import {Field, RelField} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn,
	$$destruct
} from './symbols';
import {constraint} from '../util/misc';

Field[$$registerFieldClass](class RelShortcut1Field extends RelField {
	
	// this[$$owner] instanceof Resource
	// this[$$key]   instanceof "innerBorder" | "plusBorder" | ...
	// this[$$value] instanceof Resource
	
	////////////
	// static //
	////////////
	
	static initClass({ key, cls, desc: {readonly} }) {
		assert(cls.isResource);
		if (cls.prototype.hasOwnProperty(key)) { return }
		cls.prototype::defineProperty(key, {
			get() { return this.fields[key].get() },
			...(readonly ? {} : {
				set(val) { this.fields[key].set(val) }
			}),
			enumerable:   true,
			configurable: false
		});
	}
	
	static [$$entriesIn](cls) {
		if (!cls.isResource) { return [] }
		return cls.relationshipShortcuts::entries()
             .filter(([,rel]) => rel.cardinality.max === 1)
             .map(([key, desc]) => ({
	             key,
	             desc,
	             relatedKeys: desc.keyInResource ? [desc.keyInResource] : []
             }));
	}
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { owner, key, desc, initialValue, waitUntilConstructed, related } = options;
		
		/* set the initial value */
		// shortcuts are only initialized with explicit initial values;
		// all the fallback options are left to the actual relationship field,
		// so that the two don't compete. Therefore, this constructor is very
		// forgiving. The constraint checks are done on the other constructor.
		this[$$initSet](
			[initialValue, () => this.jsonToValue(initialValue)],
			[true]
		);
		
		const correspondingRelValue =
			Observable.defer(() => owner.fields[desc.keyInResource].p('value'))
				::waitUntilConstructed();
		
		/* keep this value up to date with new sides of new relationships */
		correspondingRelValue
			.filter(v=>v)
			.switchMap(rel => rel.p('fieldsInitialized').filter(v=>!!v).mapTo(rel))
			.switchMap(rel => rel.fields[desc.codomain.keyInRelationship].p('value'))
			.subscribe( this.p('value') );
	
		// /* keep the relationship up to date */
		// this.p('value')
		// 	// .do((v) => {
		// 	// 	console.log('relshortcutfield value:', v);
		// 	// })
		// 	::waitUntilConstructed()
		// 	.subscribe((scValue) => {
		// 		// const relValue = owner.fields[desc.keyInResource].get();
		// 		if (scValue && !desc.relationshipClass.abstract) {
		// 			// TODO: Is the abstractness test above really the best way?
		// 			const rel = desc.relationshipClass.new({
		// 				[desc.keyInRelationship]         : owner,
		// 				[desc.codomain.keyInRelationship]: scValue
		// 			}, {
		// 				forcedDependencies: [owner.originCommand]
		// 				// TODO: this forced dependency is a stopgap measure;
		// 				//     : It should be the command that performed the edit,
		// 				//     : which is not necessarily the origin command
		// 			});
		// 			owner.fields[desc.keyInResource].set(rel, { createEditCommand: false });
		// 		}
		// 	});
		
		/* keep the relationship up to date */
		this.p('value')
			// .do((v) => {
			// 	console.log('relshortcutfield value:', v);
			// })
			::waitUntilConstructed()
			.subscribe((scValue) => {
				const relValue = owner.fields[desc.keyInResource].get();
				if (relValue && relValue[desc.codomain.keyInRelationship]) {
					// TODO: should we wait until relValue.p('fieldsInitialized')?
					relValue.p('fieldsInitialized')
						.filter(v=>!!v)
						.take(1)
						.takeUntil(this.p('value').filter(v=>v!==scValue)).subscribe(() => {
							relValue.fields[desc.codomain.keyInRelationship].set(scValue || null, { createEditCommand: false });
						});
				} else if (scValue && !desc.relationshipClass.abstract) {
					// TODO: Is the abstractness test above really the best way?

					/* find relevant command */
					let forcedDep = owner.editCommands::last() || owner.originCommand;
					const rel = desc.relationshipClass.new({
						[desc.keyInRelationship]         : owner,
						[desc.codomain.keyInRelationship]: scValue
					}, {
						forcedDependencies: [forcedDep]
						// TODO: this forced dependency is a stopgap measure;
						//     : It should be the command that performed the edit,
						//     : which is not necessarily the origin command
					});
					owner.fields[desc.keyInResource].set(rel, { createEditCommand: false });
				}
			});
	}
	
	static valueToJSON(value, options = {}) {
		// const {entityToTemporaryId = new Map} = options;
		if (!value) { return value }
		const Entity = value.constructor.Entity;
		return Entity.normalizeAddress(value, options);
	}
	
	jsonToValue(json, options = {}) {
		// TODO: expect and use option temporaryToPermanentId
		if (json === null) { return null }
		const Entity  = this[$$owner].constructor.Entity;
		let result = Entity.getLocal(json, options);
		if (!result) { result = Entity.setPlaceholder(json, options) }
		return result;
	}
	
	[$$destruct]() {
		this.set(null, {
			ignoreReadonly:    true,
			ignoreValidation:  true,
			createEditCommand: false
		});
		super[$$destruct]();
	}
		
	validate(val, stages = []) {
		
		if (stages.includes('commit')) {
			/* if there's a minimum cardinality, a value must have been given */
			constraint(val::isObject() || this[$$desc].cardinality.min === 0, humanMsg`
				No value given for required field ${this[$$owner].constructor.name}#${this[$$key]}.
			`);
		}
		
		/* a given value must always be of the proper domain */
		constraint(!val::isObject() || this[$$desc].codomain.resourceClass.hasInstance(val), humanMsg`
			Invalid value '${val}' given for field ${this[$$owner].constructor.name}#${this[$$key]}.
		`);
		
		// TODO: these should not be assertions, but proper constraint-checks,
		//     : recording errors, possibly allowing them temporarily, etc.
		
	}
	
});
