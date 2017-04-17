// TODO: make sure we don't need to import this anymore: filter;
// TODO: make sure we don't need to import this anymore: pairwise
// TODO: make sure we don't need to import this anymore: startWith;
// import 'rxjs/add/operator/do';

import isUndefined from 'lodash-bound/isUndefined';
import isNull      from 'lodash-bound/isNull';
import isObject    from 'lodash-bound/isObject';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import {humanMsg} from "../util/misc";

import {Field} from './Field';

import {
	$$registerFieldClass,
	$$owner,
	$$key,
	$$desc,
	$$initSet,
	$$entriesIn,
	$$destruct
} from './symbols';
import {constraint} from "../util/misc";


Field[$$registerFieldClass](class SideField extends Field {
	
	// this[$$owner] instanceof RelatedTo
	// this[$$key]   instanceof 1 | 2
	// this[$$value] instanceof Resource
	
	////////////
	// static //
	////////////
	
	static initClass({ cls, key, desc: {readonly} }) {
		assert(cls.isRelationship);
		if (cls.prototype.hasOwnProperty(key)) { return }
		cls.prototype::defineProperty(key, {
			get() { return this.fields[key].get() },
			...(readonly ? undefined : {
				set(val) { this.fields[key].set(val) }
			}),
			enumerable:   true,
			configurable: false
		});
	}
	
	static [$$entriesIn](cls) {
		if (!cls.isRelationship) { return [] }
		return [
			{ key: 1, cls, desc: cls.domainPairs[0][1], relatedKeys: [2] },
			{ key: 2, cls, desc: cls.domainPairs[0][2], relatedKeys: [1] }
		];
		// TODO: unify multiple overlapping domainPairs when needed
	}
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super(options);
		const { owner, desc, key, initialValue, waitUntilConstructed } = options;
		
		/* set the initial value */
		this[$$initSet](
			[initialValue::isObject() || initialValue::isNull(), initialValue]
			// TODO: remove following commented code; no longer doing auto-create
			// [desc.options.auto && !owner.isPlaceholder,          ::desc.resourceClass.new] // TODO: command dependencies?
		);
		
		/* if one side becomes null, then so does the other, */
		/* releasing the relationship                        */
		this.p('value')
			::waitUntilConstructed()
			.filter(v=>v===null)
			.subscribe(owner.fields[desc.codomain.keyInRelationship]);
		
		/* when a side changes, let the relevant resources know */
		this.p('value')
			.startWith(null)
			::waitUntilConstructed()
			.pairwise()
			.subscribe(([prev, curr]) => {
				// TODO: prev or curr being placeholders may be a complex situation; model it properly
				if (desc.cardinality.max === 1) {
					if (prev && !prev.isPlaceholder) { prev.fields[desc.keyInResource].set(null,  { createEditCommand: false }) }
					if (curr && !curr.isPlaceholder) { curr.fields[desc.keyInResource].set(owner, { createEditCommand: false }) }
				} else {
					if (prev && !prev.isPlaceholder) { prev.fields[desc.keyInResource].get().delete(owner) }
					if (curr && !curr.isPlaceholder) { curr.fields[desc.keyInResource].get().add   (owner) }
					// TODO: , { createEditCommand: false } ?
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
		
		const notGiven = val::isNull() || val::isUndefined();
		
		if (stages.includes('commit')) {
			/* if there's a minimum cardinality, a value must have been given */
			constraint(!notGiven, humanMsg`
			    No resource specified for side ${this[$$key]} of
				this '${this[$$owner].constructor.name}'.
			`);
		}
		
		/* the value must be of the proper domain */
		let foobar = this[$$desc];
		constraint(notGiven || this[$$desc].resourceClass.hasInstance(val), humanMsg`
			Invalid value ${val} given for ${this[$$owner].constructor.name}#${this[$$key]}
			(${this[$$desc].resourceClass}).
		`);
		
		// TODO: these should not be assertions, but proper constraint-checks,
		//     : recording errors, possibly allowing them temporarily, etc.
	}
	
});
