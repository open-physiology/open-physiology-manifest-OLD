import {
	isUndefined,
	isInteger,
	defaults,
	assignWith,
	keys,
	values,
	entries,
	fromPairs
} from 'lodash-bound';

import {isEqual as _isEqual} from 'lodash';

import assert from 'power-assert';

import Graph from 'graph.js/dist/graph.js';

import {assign, defineProperty} from 'bound-native-methods';

import {parseCardinality} from '../util/misc';

import {
	humanMsg,
	wrapInArray,
	definePropertyByValue,
	definePropertiesByValue
} from 'utilities';



import Entity_factory from '../Entity.js';
import fields_factory from '../fields/fields.js';

const $$processedFor              = Symbol('$$processedFor');
const $$relationshipSpecs         = Symbol('$$relationshipSpecs');
const $$relevantDomains           = Symbol('$$relevantDomains');


////////////////////////////////////////////////////////////////////////////////
// Environment class                                                          //
////////////////////////////////////////////////////////////////////////////////

/**
 * An `Environment` encompasses a group of modules. There should be only one
 * per application (though it is recreated for every unit test).
 * The environment is available pretty much everywhere in the manifest code,
 * and provides access to all resource classes.
 */
export class Environment {
	
	// vertices: name                   -> class
	// edges:    [superclass, subclass] -> undefined
	
	/**
	 * a `Graph` of all entity classes, where the edges represent the 'superclass of' relation;
	 * it also maps all of the classes by name as a normal js object
	 */
	classes: Graph;
	
	/** a reference to the Field class         */ Field:         Class;
	/** a reference to the PropertyField class */ PropertyField: Class;
	/** a reference to the RelField class      */ RelField:      Class;
	/** a reference to the Rel1Field class     */ Rel1Field:     Class;
	/** a reference to the Rel$Field class     */ Rel$Field:     Class;
	
	/** @private */
	constructor() {
		/* start tracking modules, classes and make the field classes available from this environment */
		this::definePropertiesByValue({
			modules: new Map,
			classes: new Graph,
			...fields_factory(this)
		});
		
		/* make Entity behave more like all its subclasses */
		const Entity = Entity_factory(this);
		this.classes.ensureVertex('Entity', Entity);
		this.classes['Entity'] = Entity;
		Entity.extends    = new Set;
		Entity.extendedBy = new Set;
	}
	
	/**
	 * Register a new module in this environment.
	 * This is actually the method that runs the functions
	 * exported from the `/modules/someModule.js` files.
	 * Does nothing if the environment already knows the module.
	 * @param {Module}                            module       - the module to register
	 * @param {Array<Module>}                     dependencies - the dependencies of the new module
	 * @param {Function<{[string]: Class}, void>} fn           - the function that defines the classes in the module
	 */
	registerModule(module, dependencies, fn) {
		/* only register each module once */
		if (this.modules.has(module.name)) { return }
		/* register module */
		this.modules.set(module.name, module);
		/* set some useful module properties */
		module::definePropertiesByValue({
			environment: this,
			classes:     this.classes,
			Entity:      this.classes.Entity
		});
		/* creating dependency modules */
		for (let dep of dependencies) { dep(this) }
		/* running provided module definition function */
		if (fn) { fn(module, [...this.classes.vertices()]::fromPairs()) }
	}
	
}


////////////////////////////////////////////////////////////////////////////////
// Module / Resource / Relationship Factory                                   //
////////////////////////////////////////////////////////////////////////////////

/**
 * A `Module` is a grouping of entity class definitions.
 */
export default class Module {
	
	/**
	 * Define a new module (independent of any environment).
	 * @param {string}                            name         - the name of the new module
	 * @param {Array<Module>}                     dependencies - the dependencies of the new module
	 * @param {Function<{[string]: Class}, void>} fn           - the function that defines the classes in the module
	 * @return {Function<?Environment>} a function to instantiate this module with either an existing or new environment
	 */
	static create(name, dependencies, fn) {
		return (env) => {
			if (!env) { env = new Environment }
			const module = new this(name);
			env.registerModule(module, dependencies, fn);
			return env;
		};
	}
	
	/** the name of this module, e.g., 'measurables' */
	name: string;
	
	/** @private */
	constructor(name) {
		this::definePropertyByValue('name', name);
	}
	
	/**
	 * Declare a resource class.
	 * @param {Object} config      - the traits of the new class
	 * @param {string} config.name - the name of the new class
	 * @return {Class} the new `Resource` subclass
	 */
	RESOURCE(config) {
		config.isResource = true;
		this.basicNormalization                      (config);
		let constructor = this.Entity.createClass    (config);
		    constructor = this.mergeSameNameResources(constructor);
		this.register                                (constructor);
		this.mergeSuperclassFields                   (constructor);
		this.environment.Field.augmentClass          (constructor);
		return constructor;
	}

	/**
	 * Declare a relationship class.
	 * @param {Object} config      - the traits of the new class
	 * @param {string} config.name - the name of the new class
	 * @return {Class} the new `Relationship` subclass
	 */
	RELATIONSHIP(config) {
		config.isRelationship = true;
		this.basicNormalization                      (config);
		let constructor = this.Entity.createClass    (config);
		this.normalizeRelationshipSides              (constructor);
		constructor = this.mergeSameNameRelationships(constructor);
		this.register                                (constructor);
		this.resolveRelationshipDomains              (constructor);
		return constructor;
	}
	
	////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Normalize the aspects of the given entity configuration.
	 */
	basicNormalization(config) : void {
		/* normalizing grammar stuff */
		if (config.singular && !config.plural) {
			if (config.isResource) {
				config.plural = `${config.singular}s`;
			} else {
				let match = config.singular.match(/^(.+)s$/);
				if (match) {
					config.plural = match[1];
				}
			}
		}
		
		/* some default values */
		config::defaults({
			behavior: {}
		});
		
		if (config.isResource) {
			config::defaults({
				relationships:         {},
				relationshipShortcuts: {}
			});
		}
		
		/* normalizing extends/extendedBy */
		for (let key of ['extends', 'extendedBy']) {
			config::defaults({ [key]: [] });
			config[key] = new Set( wrapInArray(config[key]) );
		}
		
		/* normalize properties */
		for (let [pKey, kKey] of [
			['properties',        'key'    ],
			['patternProperties', 'pattern']
		]) {
			config::defaults({ [pKey]: {} });
			for (let [k, desc] of config[pKey]::entries()) {
				desc[kKey] = k;
				if (!desc[kKey].value::isUndefined()) {
					assert(desc[kKey] !== false, humanMsg`
						The property '${kKey}' has a constant
						value, so it must be readonly.
					`);
					desc[kKey].readonly = true;
				}
			}
		}
		
		/* sanity checks */
		for (let key of ['extends', 'extendedBy']) {
			for (let other of config[key]) {
				assert(this.classes.hasVertex(other.name), humanMsg`
					The '${config.name}' class is being processed
					by module '${this.name}', but it extends a '${other.name}'
					class that has not yet been processed. How can that be?
				`);
				assert(this.classes.vertexValue(other.name) === other, humanMsg`
					The '${config.name}' class is being processed
					by module '${this.name}', but it extends an '${other.name}'
					class that is in conflict with another class known
					by that name.
				`);
			}
		}
	}
	
	/**
	 * Normalize the `1` and `2` keys of the given relationship class.
	 */
	normalizeRelationshipSides(cls) : void {
		// - 1 is left-hand side, and
		// - 2 is right-hand side of the relationship;
		// these can be given directly, or multiple
		// can be grouped in a 'domainPairs' array;
		// here, we'll normalize them into a 'domainPairs' array
		
		assert( cls.domainPairs && !cls[1] && !cls[2] ||
		       !cls.domainPairs &&  cls[1] &&  cls[2], humanMsg`
			A relationship can specify [1] and [2] domains directly,
			or group multiple pairs in a 'domainPairs' object, but not both.
		`);
		
		/* normalize domainPairs array */
		if (!cls.domainPairs) { cls.domainPairs = [] }
		if (cls[1] && cls[2]) {
			cls.domainPairs.push({
				[1]: cls[1],
				[2]: cls[2]
			});
		}
		
		/* normalizing all domainPairs */
		cls.keyInResource = {
			1: `-->${cls.name}`,
			2: `<--${cls.name}`
		};
		cls.domainPairs = cls.domainPairs.map((givenDomainPair) => {
			let pair = { [1]: {}, [2]: {} };
			for (let [ domainKey, domain ,  codomain ] of
				   [ [ 1        , pair[1],  pair[2]  ] ,
			         [ 2        , pair[2],  pair[1]  ] ]) {
				let [resourceClass, cardinality, options = {}] = givenDomainPair[domainKey];
				domain::definePropertiesByValue({
					codomain         : codomain,
					
					relationshipClass: cls,
					keyInRelationship: domainKey,
					
					resourceClass    : resourceClass,
					keyInResource    : cls.keyInResource[domainKey],
					
					cardinality      : parseCardinality(cardinality),
					options          : options,
					
					shortcutKey      : options.key
				});
				domain::defineProperty(Symbol.toStringTag, {
					get() {
						return humanMsg`
							${this.resourceClass.name}
							(${this.keyInResource})
							${this.codomain.resourceClass.name}
						`;
					}
				})
			}
			return pair;
		});
		delete cls[1];
		delete cls[2];
	}
	
	/**
	 * Register a given a relationship class with the resource classes involved.
	 */
	resolveRelationshipDomains(cls) {
		for (let domainPair of cls.domainPairs) {
			for (let referenceDomain of domainPair::values()) {
				
				const {
					resourceClass,
					keyInResource,
					shortcutKey
				} = referenceDomain;
				
				// NOTE: This was the location of a whole lot of unfinished code we
				//     : may yet want to reinstate in the future. See commented code
				//     : at the bottom of this file.
				
				/* put back-reference in classes */
				resourceClass.relationships[keyInResource] = referenceDomain;
				if (!shortcutKey::isUndefined()) {
					resourceClass.relationshipShortcuts[shortcutKey] = referenceDomain;
				}
				this.environment.Field.augmentClass(resourceClass, keyInResource);
				
			}
		}
	}
	
	/**
	 * Register an entity class `cls` with the module.
	 * In particular, put it in the `classes` graph.
	 * @param {Class} cls - the entity class to register
	 */
	register(cls) {
		/* register the class in this module */
		this.classes.ensureVertex(cls.name, cls);
		if (!cls.notExported) {
			this.classes[cls.name] = cls;
		}
		
		/* add subclassing edges and cross-register sub/superclasses */
		if (!cls.extends || [...cls.extends].length === 0) {
			cls.extends = [this.Entity];
		}
		for (let extendee of cls.extends) {
			this.classes.addEdge(extendee.name, cls.name);
			extendee.extendedBy.add(cls);
		}
		for (let extender of (cls.extendedBy) || []) {
			this.classes.addEdge(cls.name, extender.name);
			extender.extends.add(cls);
		}
		
		/* check for cycles */
		let cycle = this.classes.cycle();
		if (cycle) {
			throw new Error(humanMsg`
				A subclass cycle has been introduced while registering
				the ${cls.name} class:
				${[...cycle, cycle[0]].join(' --> ')}.
			`);
		}
	}
	
	/**
	 * Merge superclass fields into the given class,
	 * and fields of the given class into its existing subclasses.
	 * (Since our homebrew class hierarchy can't count on JavaScript
	 *  prototype inheritance.)
	 * @param cls
	 */
	mergeSuperclassFields(cls) : void {
		const mergeFieldKind = (cls, newCls, kind, customMerge) => {
			if (cls[kind]::isUndefined()) { return }
			
			if (!cls[$$processedFor]) { cls[$$processedFor] = {} }
			if (!cls[$$processedFor][kind]) { cls[$$processedFor][kind] = new WeakSet() }
			if (cls[$$processedFor][kind].has(newCls)) { return }
			cls[$$processedFor][kind].add(newCls);
			
			const mergeBetween = (superCls, subCls) => {
				for (let key of superCls[kind]::keys()) {
					let superDesc = superCls[kind][key];
					let subDesc   = subCls[kind][key];
					if (subDesc::isUndefined()) {
						subCls[kind][key] = superDesc;
						this.environment.Field.augmentClass(subCls, key);
					} else if (_isEqual(subDesc, superDesc)) {
						continue;
					} else {
						subCls[kind][key] = customMerge(superDesc, subDesc);
					}
				}
			};
			
			for (let superCls of cls.extends) {
				mergeFieldKind(superCls, newCls, kind, customMerge);
				mergeBetween(superCls, cls);
			}
			
			for (let subCls of cls.extendedBy) {
				mergeBetween(cls, subCls);
				mergeFieldKind(subCls, newCls, kind, customMerge);
			}
			
		};
				
		mergeFieldKind(cls, cls, 'properties', (superDesc, subDesc) => {
			assert(subDesc.key === superDesc.key);
			// We're assuming that the only kind of non-trivial merging
			// right now is to give a property a specific constant value
			// in the subclass, which has to be checked in the superclass.
			// TODO: use actual json-schema validation to validate value
			let singleSuperDesc;
			if (superDesc.type::isUndefined() && superDesc.oneOf) {
				assert(superDesc.oneOf.length > 0);
				for (let disjunct of superDesc.oneOf) {
					if (typeof subDesc.value === disjunct.type ||
					    subDesc.value::isInteger() && disjunct.type === 'integer' ||
					    _isEqual(subDesc.value, disjunct.value)
					) {
						singleSuperDesc = { ...superDesc, ...disjunct };
						delete singleSuperDesc.oneOf;
						delete singleSuperDesc.default;
					}
				}
			} else {
				singleSuperDesc = { ...superDesc };
			}
			return singleSuperDesc;
		});
		
		mergeFieldKind(cls, cls, 'relationships');
		mergeFieldKind(cls, cls, 'relationshipShortcuts');
	}
	
	/**
	 * If the same resource is declared more than once,
	 * intelligently merge their aspects.
	 * @param {Class} cls - the resource class to merge with others of the same name
	 * @return {Class} the class that gets to survive and represent its name (an existing class is prioritized over the new class)
	 */
	mergeSameNameResources(cls) : Class {
		const oldClass = this.classes.vertexValue(cls.name);
		if (!oldClass) { return cls }
		return oldClass::assignWith(cls, (vOld, vNew, key) => {
			switch (key) {
				case 'extends':
				case 'extendedBy': return new Set([...vOld, ...vNew]);
				case 'properties':
				case 'patternProperties': return {}::assignWith(vOld, vNew, (pOld, pNew, pKey) => {
					assert(pOld::isUndefined() || _isEqual(pOld, pNew), humanMsg`
						Cannot merge property descriptions for ${oldClass.name}#${key}.
						
						1) ${JSON.stringify(pOld)}
						
						2) ${JSON.stringify(pNew)}
					`);
					return pOld::isUndefined() ? pNew : pOld;
				});
				default: {
					if (!vOld::isUndefined() && !vNew::isUndefined() && !_isEqual(vOld, vNew)) {
						throw new Error(humanMsg`
							Cannot merge ${oldClass.name}.${key} = ${JSON.stringify(vOld)}
							        with ${JSON.stringify(vNew)}.
						`);
					}
					return vOld::isUndefined() ? vNew : vOld;
				}
			}
		});
	}
	
	/**
	 * If the same relationship is declared more than once,
	 * intelligently merge their aspects.
	 * @param {Class} cls - the relationship class to merge with others of the same name
	 * @return {Class} the class that gets to survive and represent its name (an existing class is prioritized over the new class)
	 */
	mergeSameNameRelationships(cls) : Class {
		const oldClass = this.classes.vertexValue(cls.name);
		if (!oldClass) { return cls }
		
		function chooseOne(o, n, sep, key) {
			assert(o::isUndefined() || n::isUndefined() || _isEqual(o, n), humanMsg`
				Cannot merge values for ${oldClass.name}${sep}${key}.
				(1) ${JSON.stringify(o)}
				(2) ${JSON.stringify(n)}
			`);
			return o::isUndefined() ? n : o;
		}
		
		return oldClass::assignWith(cls, (vOld, vNew, key) => {
			switch (key) {
				case 'extends':
				case 'extendedBy':
					return new Set([...vOld, ...vNew]);
				case 'domainPairs':
					return [...vOld, ...vNew];
				default:
					return chooseOne(vOld, vNew, '.', key);
			}
		});
	}
	
}

////////////////////////////////////////////////////////////
// RESOURCE({
//
//     name: 'ResourceName',
//
//     extends: <superclass>,
//     abstract: <true/false>,
//
//     singular: 'singular name',
//     plural:   'plural names',
//
//     properties: {
//         ...properties
//     },
//     patternProperties: {
//         ...patternProperties
//     },
//     ...options
// })
////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////
// RELATIONSHIP({
//
//     name: 'RelationshipName',
//
//     extends: <superclass>,
//     abstract: <true/false>,
//
//     1: [ ResourceType1, [c1min, c1max], { ...options1to2 } ],
//     2: [ ResourceType2, [c2min, c2max], { ...options2to1 } ],
//
//     properties: {
//         ...properties
//     },
//
//     ...options
// })
//
// This means that RelationshipName is a type of c1-to-c2 relationship
// (c stands for cardinality: many-to-many, one-to-many, etc. both sides
// have a min and max) between ResourceType1 resources and ResourceType2 resources.
// So: "a ResourceType1 resource can be related to 'c1' ResourceType2 resource(s),
//      exposed through through the key 'options1to2.key' in that resource"
// and vice versa, if a key field is present, which is not mandatory.
//
// A couple of possible options:
// - options1to2.sustains:     when the last related ResourceType1 instance is deleted,
//                             the ResourceType2 instance that is being sustained by it is deleted automatically
// - options1to2.anchors:      a ResourceType2 instance cannot be deleted
//                             while there are still ResourceType1 instances related with it
// - options1to2.implicit:     (only when c1min > 0) a new ResourceType2 instance, plus this kind of relationship,
//                             is automatically created for a new ResourceType1 instance;
// - options1to2.getSummary:   a human-readable explanation of the corresponding REST endpoint for HTTP GET
// - options1to2.putSummary:   a human-readable explanation of the corresponding REST endpoint for HTTP PUT
// - options1to2.deleteSummary:a human-readable explanation of the corresponding REST endpoint for HTTP DELETE
// - options.readOnly:         this relationship type is managed programmatically, not to be exposed through the API directly
// - options.noCycles:         no cycles of this relationship type are allowed
// - options.symmetric:        this relationship type is bidirectional, 1->2 always implies 2->1; TODO: implement when needed
// - options.antiReflexive:    a resource may not be related to itself with this type;            TODO: implement when needed
////////////////////////////////////////////////////////////





////////// Below is a whole lot of unfinished code we
		// may yet want to reinstate in the future,
        // stored temporarily here in a comment.

// const relSinks = relationshipClass::(function findSinks() {
// 	if (this.extendedBy::size() === 0) { return [this] }
// 	return union(...[...this.extendedBy].map(c => c::findSinks()));
// })();
//
// let hierarchy = new Graph();
// // ^ In this graph: super --> sub
//
// const process = (CurrentRelClass, RelSubclass) => {
// 	/* find all domains relevant to this resource class + field key combo */
// 	const relevantDomains = CurrentRelClass[$$relevantDomains] = CurrentRelClass.domainPairs
// 		::map(keyInRelationship)
      //      ::filter(d => (d.resourceClass).hasSubclass(resourceClass)       ||
      //                      (resourceClass).hasSubclass(d.resourceClass) )
// 		::groupBy('resourceClass.name')
// 		::_values()
// 		::map(0); // for now, only using one domain-pair per ResourceClass+RelationshipClass combination
// 	// TODO: ^ don't use only a[0]; this is just for now, to simplify
// 	//     :   we still manually have to manually create common superclasses
// 	//     :   for stuff (examples: MeasurableLocation, NodeLocation)
//
// 	/* register domain */
// 	for (let domain of relevantDomains) {
// 		hierarchy.addVertex(domain, domain);
// 	}
// 	/* register domain ordering by (sub/super) relationship class */
// 	for (let domain of relevantDomains) {
// 		if (RelSubclass) {
// 			for (let subDomain of RelSubclass[$$relevantDomains]) {
// 				hierarchy.spanEdge(domain, subDomain);
// 			}
// 		}
// 	}
// 	/* register domain ordering by (sub/super) resource class */
// 	for (let domain of relevantDomains) {
// 		for (let otherDomain of relevantDomains::without(domain)) {
// 			assert(domain.resourceClass !== otherDomain.resourceClass);
// 			// ^ (because `::groupBy('resourceClass.name')` above)
// 			if (otherDomain.resourceClass.hasSubclass(domain.resourceClass)) {
// 				hierarchy.spanEdge(otherDomain, domain);
// 			}
// 		}
// 	}
// 	/* recurse to relationship superclass */
// 	for (let RelSuperclass of CurrentRelClass.extends) {
// 		process(RelSuperclass, CurrentRelClass);
// 	}
// };
// relSinks.forEach(process);
//
// hierarchy = hierarchy.transitiveReduction();

// --- fix bug in the code below (the commented code above already works)

/* from the graph of relevant domains for this field (domain), craft one specifically for each ResourceClass */
// let resourceHasField = (resCls) => (!!resCls.properties[referenceDomain.keyInResource]);
// console.log(this.classes.hasVertex(referenceDomain.resourceClass.name), referenceDomain.resourceClass.name, [...this.classes.vertices()]::map(v=>v[1].name));
// for (let referenceResource of union(
// 	[...this.classes.verticesWithPathFrom(referenceDomain.resourceClass.name)]::map(([,r])=>r)::filter(resourceHasField),
// 	[...this.classes.verticesWithPathTo  (referenceDomain.resourceClass.name)]::map(([,r])=>r)::filter(resourceHasField),
// 	[referenceDomain.resourceClass]
// )) {
// 	let candidateDomains = [...hierarchy.sinks()]::map(([,d])=>d)::(function pinpoint() {
// 		let result = new Set();
// 		for (let domain of this) {
// 			const relationshipFits = (referenceDomain.relationshipClass.hasSubclass(domain.relationshipClass));
// 			const resourceFits     = (referenceResource                .hasSubclass(domain.resourceClass    ));
// 			if (relationshipFits && resourceFits) {
// 				result.add(domain);
// 			} else {
// 				for (let superDomain of [...hierarchy.verticesTo(domain)]::map(([,d])=>d)) {
// 					[superDomain]::pinpoint().forEach(::result.add);
// 				}
// 			}
// 		}
// 		return result;
// 	})();
// }

//////////////////////
