// TODO: make sure we don't need to import this anymore: pairwise;
// TODO: make sure we don't need to import this anymore: takeUntil;
// TODO: make sure we don't need to import this anymore: take;
// TODO: make sure we don't need to import this anymore: startWith;
// import 'rxjs/add/operator/do';

import inRange     from 'lodash-bound/inRange';
import size        from 'lodash-bound/size';
import entries     from 'lodash-bound/entries';
import isUndefined from 'lodash-bound/isUndefined';
import isArray from 'lodash-bound/isArray';
import {map} from 'lodash-bound';

import {defineProperties, defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import ObservableSet, {setEquals, copySetContent} from '../util/ObservableSet';
import {humanMsg} from 'utilities';

import {Field, RelField} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$value,
	// $$pristine,// TODO: remove all 'pristine' related stuff from the field classes
	$$entriesIn,
	$$destruct
} from './symbols';
import {constraint} from "../util/misc";
// TODO: make sure we don't need to import this anymore: switchMap;


Field[$$registerFieldClass](class RelShortcut$Field extends RelField {
	
	// this[$$owner] instanceof Resource
	// this[$$key]   instanceof "materials" | "parts" | "incomingProcesses" | ...
	// this[$$value] instanceof Set<Resource>
	
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
		             .filter(([,rel]) => rel.cardinality.max > 1)
		             .map(([key, desc]) => ({
				         key,
				         desc,
				         relatedKeys: desc.keyInResource ? [desc.keyInResource] : []
		             }));
	}
	
	static isEqual: setEquals;
	
	
	//////////////
	// instance //
	//////////////
	 
	constructor(options) {
		super({ ...options, setValueThroughSignal: false });
		const { owner, desc, initialValue, waitUntilConstructed, related } = options;
		
		// this::defineProperty($$pristine, { value: new Set           });// TODO: remove all 'pristine' related stuff from the field classes
		this::defineProperty($$value, { value: new ObservableSet });

		/* syncing with relationship field */
		const correspondingRelField = owner.fields[desc.keyInResource][$$value];
		
		correspondingRelField.e('add')
			::waitUntilConstructed()
			.switchMap(newRel => newRel.p('fieldsInitialized').filter(v=>!!v).map(()=>newRel))
			.subscribe((newRel) => {
				let newRelDisconnected = newRel.fields[desc.keyInRelationship].p('value')
					.filter(v => v !== owner)
					.take(1);
				newRel.fields[desc.codomain.keyInRelationship].p('value')
					.takeUntil(newRelDisconnected)
					.startWith(null).pairwise().subscribe(([prev, curr]) => {
						if (prev) { this[$$value].delete(prev) }
						if (curr) { this[$$value].add   (curr) }
					});
				newRelDisconnected.subscribe(() => {
					this[$$value].delete(newRel.fields[desc.codomain.keyInRelationship][$$value]);
				});
			});
		
		/* syncing with relationship field */
		this[$$value].e('add')
			::waitUntilConstructed()
			.subscribe((newRes) => {
				let rel = [...correspondingRelField]
					.find(rel => rel.fields[desc.keyInRelationship]         .get() === owner &&
					             rel.fields[desc.codomain.keyInRelationship].get() === newRes);
				// TODO: Should we just remove corresponding relationship if it exists,
				//     : and create a new one in any case?
				// TODO: NOTE - We don't have enough information here, really.
				//     : We're checking for .abstract, but it could still be concrete,
				//     : yet not the most specific class. This all depends on how the original
				//     : value was set, and we don't know that here.
				if (!rel && !desc.relationshipClass.abstract) {
					rel = desc.relationshipClass.new({
						[desc.keyInRelationship]         : owner,
						[desc.codomain.keyInRelationship]: newRes
					}, {
						forcedDependencies: [owner.originCommand]
						// TODO: this forced dependency is a stopgap measure;
						//     : It should be the command that performed the edit,
						//     : which is not necessarily the origin command
					});
					correspondingRelField.add(rel);
				}
			});
		
		/* handle initial values */
		if (initialValue && initialValue[Symbol.iterator]) {
			for (let res of this.jsonToValue(initialValue)) {
				this[$$value].add(res);
			}
		}
		
		/* emit 'value' signals (but note that setValueThroughSignal = false) */
		this[$$value].p('value')
			::waitUntilConstructed()
			.subscribe(this.p('value'));
		
	}
	
	static valueToJSON(value, options = {}) {
		// const Entity = this[$$owner].constructor.Entity;
		// const {entityToTemporaryId = new Map} = options;
		// TODO: adjust as per Rel$Field.valueToJSON (
		return value::map(e => {
			const Entity = e.constructor.Entity;
			return Entity.normalizeAddress(e, options)
		});
	}
	
	jsonToValue(json, options = {}) {
		const Entity = this[$$owner].constructor.Entity;
		let result = new Set;
		for (let thing of json) {
			let entity = Entity.getLocal(thing, options);
			if (!entity) { entity = this[$$owner].constructor.setPlaceholder(thing, options) }
			result.add(entity);
		}
		return result;
	}
	
	set(newValue, { ignoreReadonly = false, ignoreValidation = false, updatePristine = false } = {}) {
		constraint(ignoreReadonly || !this[$$desc].readonly, humanMsg`
			You're trying to set a readonly field
			${this[$$owner].constructor.name}#${this[$$key]}.
		`);
		if (newValue::isArray()) { newValue = this.jsonToValue(newValue) }
		if (!ignoreValidation) { this.validate(newValue, ['set']) }
		copySetContent(this[$$value], newValue);
	}
		
	[$$destruct]() {
		this.set(new Set(), {
			ignoreReadonly:    true,
			ignoreValidation:  true,
			createEditCommand: false
		});
		super[$$destruct]();
	}
	
	validate(val, stages = []) {
		constraint(val[Symbol.iterator], humanMsg`
			The value ${val} given for ${this[$$owner].constructor.name}#${this[$$key]}
			is not an iterable collection (like array or set).
		`);
		if (stages.includes('commit')) {
			const {min, max} = this[$$desc].cardinality;
			constraint(val::size()::inRange(min, max+1), humanMsg`
				The number of values in field ${this[$$owner].constructor.name}#${this[$$key]}
				is not within the expected range [${min}, ${max}].
			`);
		}
		val.forEach(::this.validateElement);
	}
	
	validateElement(element) {
		/* the value must be of the proper domain */
		if (!this[$$desc].codomain.resourceClass.hasInstance(element)) {
			throw new Error(humanMsg`
				Invalid value ${element} given as element for
				${this[$$owner].constructor.name}#${this[$$key]}.
			`);
		}
	}
	
	// async commit() {// TODO: remove all 'pristine' related stuff from the field classes
	// 	this.validate(this[$$value], ['commit']);
	// 	copySetContent(this[$$pristine], this[$$value]);
	// 	this.e('commit').next(this[$$value]);
	// }
	//
	// rollback() {
	// 	copySetContent(this[$$value], this[$$pristine]);
	// 	this.e('rollback').next(this[$$value]);
	// }
	
});
