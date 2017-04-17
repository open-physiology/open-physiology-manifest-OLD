// TODO: make sure we don't need to import this anymore: switchMap;
// TODO: make sure we don't need to import this anymore: startWith;
// TODO: make sure we don't need to import this anymore: pairwise;
// import 'rxjs/add/operator/do';

import inRange     from 'lodash-bound/inRange';
import get         from 'lodash-bound/get';
import size        from 'lodash-bound/size';
import entries     from 'lodash-bound/entries';
import isUndefined from 'lodash-bound/isUndefined';
import isArray     from 'lodash-bound/isArray';

import {defineProperty} from 'bound-native-methods';

import assert from 'power-assert';

import ObservableSet, {setEquals, copySetContent} from '../util/ObservableSet';
import {humanMsg, constraint} from '../util/misc';
import {map, filter} from 'lodash-bound';

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


Field[$$registerFieldClass](class Rel$Field extends RelField {
	
	// this[$$owner] instanceof Resource
	// this[$$key]   instanceof "-->ContainsMaterial" | "-->HasPart" | "<--FlowsTo" | ...
	// this[$$value] instanceof Set<IsRelatedTo>
	
	////////////
	// static //
	////////////
	
	static initClass({ cls, key, desc: {readonly} }) {
		assert(cls.isResource);
		if (cls.prototype.hasOwnProperty(key)) { return }
		cls.prototype::defineProperty(key, {
			get() { return this.fields[key].get() },
			...(readonly ? {} : {
				set(val) { this.fields[key].set(val)}
			}),
			enumerable:   true,
			configurable: false
		});
	}
	
	static [$$entriesIn](cls) {
		if (!cls.isResource) { return [] }
		return cls.relationships::entries()
			.filter(([,rel]) => rel.cardinality.max > 1)
			.map(([key, desc]) => ({
				key,
				desc,
				relatedKeys: desc.shortcutKey ? [desc.shortcutKey] : []
			}));
	}
	
	static isEqual: setEquals;
	
	
	//////////////
	// instance //
	//////////////
	
	constructor(options) {
		super({ ...options, setValueThroughSignal: false });
		const { owner, desc, initialValue, waitUntilConstructed, constructingOwner, related } = options;
		
		this::defineProperty($$value, { value: new ObservableSet });
		
		/* mirror stuff that happens in sub-fields */
		constructingOwner.subscribe({complete: () => {
			for (let subCls of desc.relationshipClass.extendedBy) {
				const subFieldKey = subCls.keyInResource[desc.keyInRelationship];
				const subField    = owner.fields[subFieldKey];
				if (!subField) { continue }
				if (subField instanceof Rel$Field) {
					subField.get().e('add')   .subscribe( this.get().e('add')    );
					subField.get().e('delete').subscribe( this.get().e('delete') );
				} else { // Rel1Field
					subField.p('value')
						.startWith(null)
						.pairwise()
						.subscribe(([prev, curr]) => {
							if (prev) { this.get().delete(prev) }
							if (curr) { this.get().add   (curr) }
						});
				}
			}
		}});
		
		/* update relationships that are added or deleted here */
		this[$$value].e('add')
			::waitUntilConstructed()
			.switchMap(rel => rel.p('fieldsInitialized').filter(v=>!!v).map(()=>rel))
			.subscribe((rel) => { rel.fields[desc.keyInRelationship].set(owner, { createEditCommand: false }) });
		
		/* decouple a relationship when it decouples from this resource */
		this[$$value].e('add')
			::waitUntilConstructed()
			.switchMap(newRel => newRel.p('fieldsInitialized').filter(v=>!!v).map(()=>newRel))
			.switchMap(newRel => newRel.fields[desc.keyInRelationship].p('value')
				.filter(res => res !== owner)
				.map(() => newRel)
			).subscribe( this.get().e('delete') );
		
		/* handle initial values */
		if (initialValue && initialValue[Symbol.iterator]) {
			for (let rel of this.jsonToValue(initialValue)) {
				// if (rel.isPlaceholder) { continue } // TODO: this may be a complex situation; model it properly
				if (!rel.fields[desc.keyInRelationship].get()) {
					rel.fields[desc.keyInRelationship].set(owner, { createEditCommand: false });
				}
				assert(rel.fields[desc.keyInRelationship].get() === owner);
				this[$$value].add(rel);
			}
		} else if (related::get([desc.shortcutKey, 'initialValue'])) {
			// OK, a shortcut was given
		} else if (desc.cardinality.min === 0) {
			// OK, this field is optional
		}
		
		// TODO: remove following commented code; no longer doing auto-create
		// /* fill up missing required values with 'auto'matic ones */
		// if (desc.options.auto && !owner.isPlaceholder) {
		// 	let shortcutInitial = related::get([desc.shortcutKey, 'initialValue']);
		// 	for (let i = this[$$value]::size() + shortcutInitial::size(); i < desc.cardinality.min; ++i) {
		// 		let otherEntity = desc.codomain.resourceClass.new({}, {
		// 			forcedDependencies: [owner.originCommand]
		// 		});
		// 		const rel = desc.relationshipClass.new({
		// 			[desc.keyInRelationship]         : owner,
		// 			[desc.codomain.keyInRelationship]: otherEntity
		// 		}, {
		// 			forcedDependencies: [owner.originCommand]
		// 		});
		// 		this[$$value].add(rel);
		// 	}
		// }
		
		/* emit 'value' signals (but note that setValueThroughSignal = false) */
		this[$$value].p('value')::waitUntilConstructed().subscribe( this.p('value') );
	}
	
	set(newValue, { ignoreReadonly = false, ignoreValidation = false, updatePristine = false } = {}) {
		constraint(ignoreReadonly || !this[$$desc].readonly);
		if (newValue::isArray()) { newValue = this.jsonToValue(newValue) }
		if (!ignoreValidation) { this.validate(newValue, ['set']) }
		copySetContent(this[$$value], newValue);
	}
	
	static valueToJSON(value, {requireClass, ...options} = {}) {
		return [...value].map(e => {
			const Entity = e.constructor.Entity;
			if (requireClass && requireClass !== e.class) { return undefined }
			return Entity.normalizeAddress(e, options);
		}).filter(v=>!!v);
	}
	
	jsonToValue(json, options = {}) {
		const Entity = this[$$owner].constructor.Entity;
		let result = new Set;
		for (let thing of json) {
			let entity = Entity.getLocal(thing, options);
			if (!entity) { entity = Entity.setPlaceholder(thing, options) }
			result.add(entity);
		}
		return result;
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
			constraint(val::size()::inRange(min, max + 1), humanMsg`
				The number of values in field ${this[$$owner].constructor.name}#${this[$$key]}
				is not within the expected range [${min}, ${max}].
			`);
		}
		val.forEach(::this.validateElement);
	}
	
	validateElement(element) {
		/* the value must be of the proper domain */
		if (!this[$$desc].relationshipClass.hasInstance(element)) {
			throw new Error(humanMsg`
				Invalid value ${element} given as element for
				${this[$$owner].constructor.name}#${this[$$key]}.
			`);
		}
	}
	
	async commit() {
		
		assert(false, "THIS CODE SHOULD NOT BE RUNNING ANYMORE");
		
		// TODO: REMOVE
		
		// this.validate(this[$$value], ['commit']);
		// copySetContent(this[$$pristine], this[$$value]);
		// this.e('commit').next(this[$$value]);
	}
	
	rollback() {
		
		assert(false, "THIS CODE SHOULD NOT BE RUNNING ANYMORE");
		
		// TODO: REMOVE
		
		// copySetContent(this[$$value], this[$$pristine]);
		// this.e('rollback').next(this[$$value]);
	}
	
});
