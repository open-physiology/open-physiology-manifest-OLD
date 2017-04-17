'use strict';

import isUndefined from 'lodash-bound/isUndefined';
import isInteger   from 'lodash-bound/isInteger';
import defaults    from 'lodash-bound/defaults';
import assignWith  from 'lodash-bound/assignWith';
import keys        from 'lodash-bound/keys';
import values      from 'lodash-bound/values';
import entries     from 'lodash-bound/entries';
import fromPairs   from 'lodash-bound/fromPairs';
import cloneDeep   from 'lodash-bound/cloneDeep';
import isArray     from 'lodash-bound/isArray';

import _isEqual from 'lodash/isEqual';

import assert from 'power-assert';

import Graph from 'graph.js/dist/graph.js';

import {assign, defineProperty} from 'bound-native-methods';

import {
	humanMsg,
	parseCardinality,
	wrapInArray,
	definePropertyByValue,
	definePropertiesByValue
} from './util/misc';

import entityClassFactory  from './Entity';
import {Field}             from './fields/fields';
import commandClassFactory from './commands/Command';


const $$processedFor              = Symbol('$$processedFor');
const $$relationshipSpecs         = Symbol('$$relationshipSpecs');
const $$relevantDomains           = Symbol('$$relevantDomains');
const $$processRelationshipDomain = Symbol('$$processRelationshipDomain');


////////////////////////////////////////////////////////////////////////////////
// Environment class                                                         //
////////////////////////////////////////////////////////////////////////////////

class Environment {
	
	// vertices: name                   -> class
	// edges:    [superclass, subclass] -> undefined
	classes : Graph;
	
	Command : Class;
	Entity  : Class;
	
	constructor(envOrBackend) {
		/* if the passed object is already an environment, return it now */
		if (envOrBackend instanceof Environment) { return envOrBackend }
		
		/* initialize commit and load implementations */
		/* issue an error if/when commit or load were called but not provided */
		const noOpMsg = (op) => async () => { console.error(humanMsg`No '${op}' behavior was specified to the module.`) };
		const thisEnvironment = this;
		
		
		
		/* a function to replace temporary id with new id */
		function replaceTemporaryIds({futureCommand, temporaryId, newId}) {
			let idObjects = [];
			switch (futureCommand.commandType) {
				case 'new': {
					const cls = thisEnvironment.classes[futureCommand.values.class];
					const fieldKeys = cls.isResource
						? [...cls.relationships::keys(), ...cls.relationshipShortcuts::keys()]
						: [1, 2];
					for (let key of fieldKeys) {
						if (futureCommand.values[key]::isArray()) {
							idObjects.push(...futureCommand.values[key]);
						} else {
							idObjects.push(futureCommand.values[key]);
						}
					}
				} break;
				case 'edit': {
					idObjects.push(futureCommand.entity);
					const cls = thisEnvironment.classes[futureCommand.entity.class];
					const fieldKeys = cls.isResource
						? [...cls.relationships::keys(), ...cls.relationshipShortcuts::keys()]
						: [1, 2];
					for (let key of fieldKeys) {
						if (futureCommand.newValues[key]::isArray()) {
							idObjects.push(...futureCommand.newValues[key]);
						} else {
							idObjects.push(futureCommand.newValues[key]);
						}
					}
				} break;
				case 'delete': {
					idObjects.push(futureCommand.entity);
				} break;
			}
			for (let idObject of idObjects) {
				if (idObject && idObject.id === temporaryId) {
					idObject.id = newId;
				}
			}
		}
		
		async function defaultBatchCommitter({temporaryIds, commands}) {
			
			/* get unfrozen version */
			commands = commands::cloneDeep();
			
			/* prepare response object */
			let response = {
				temporaryIds: {},
				commands: []
			};
			
			/* handle all commands in order */
			for (let i = 0; i < commands.length; ++i) {
				const localCommand = commands[i];
				let localResponse;
				switch(localCommand.commandType) {
					case 'new': {
						localResponse = await this.commit_new(localCommand);
						if (temporaryIds.includes(localCommand.values.id)) {
							const temporaryId = localCommand.values.id;
							const newId       = localResponse.id;
							response.temporaryIds[temporaryId] = newId;
							for (let j = i+1; j < commands.length; ++j) {
								const futureCommand = commands[j];
								replaceTemporaryIds({futureCommand, temporaryId, newId});
							}
						}
					} break;
					case 'edit': {
						localResponse = await this.commit_edit(localCommand);
					} break;
					case 'delete': {
						localResponse = await this.commit_delete(localCommand);
					} break;
					default: assert(false)
				}
				response.commands.push(localResponse);
			}
			
			/***/
			return response::cloneDeep();
		}
		this.backend = {};
		for (let [op,         defaultOp] of [
	        ['commit_new',    noOpMsg('commit_new')   ],
	        ['commit_edit',   noOpMsg('commit_edit')  ],
	        ['commit_delete', noOpMsg('commit_delete')],
	        ['commit_batch',  defaultBatchCommitter   ],
	        ['load',          noOpMsg('load')         ],
	        ['loadAll',       noOpMsg('loadAll')      ],
		]) {
			this.backend[op] = this[op] =
				envOrBackend[op] ? ::envOrBackend[op] : defaultOp;
		}
		
		/* start tracking modules and classes */
		this::definePropertiesByValue({
			modules: new Map,
			classes: new Graph
		});
		
		/* create a version of the Command and Entity classes */
		const {Command, TrackedCommand, Command_batch} = commandClassFactory(this);
		this::definePropertyByValue('Command',        Command                 );
		this::definePropertyByValue('TrackedCommand', TrackedCommand          );
		this::definePropertyByValue('Command_batch',  Command_batch           );
		this::definePropertyByValue('Entity',         entityClassFactory(this));
		
		/* make Entity behave more like all its subclasses */
		this.classes.ensureVertex('Entity', this.Entity);
		this.classes['Entity'] = this.Entity;
		this.Entity.extends    = new Set;
		this.Entity.extendedBy = new Set;
	}
	
	registerModule(module, dependencies, fn) {
		/* only register each module once */
		if (this.modules.has(module.name)) { return }
		/* register module */
		this.modules.set(module.name, module);
		/* set some useful module properties */
		module::definePropertiesByValue({
			environment: this,
			classes:     this.classes,
			Entity:      this.Entity,
			Command:     this.Command
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

export default class Module {
	
	static create(name, dependencies, fn) {
		return (environment = {}) => {
			environment  = new Environment(environment);
			const module = new this(name);
			environment.registerModule(module, dependencies, fn);
			return environment;
		};
	}
	
	name: string;
	
	constructor(name) {
		this::definePropertyByValue('name', name);
	}
	
	RESOURCE(config) {
		config.isResource = true;
		this.basicNormalization                      (config                         );
		let constructor = this.mergeSameNameResources(this.Entity.createClass(config));
		this.register                                (constructor                    );
		this.mergeSuperclassFields                   (constructor                    );
		// jsonSchemaConfig                          (constructor                    ); // TODO
		Field.augmentClass                           (constructor                    );
		return constructor;
	}

	RELATIONSHIP(config) {
		config.isRelationship = true;
		this.basicNormalization                      (config);
		let constructor = this.Entity.createClass    (config);
		this.normalizeRelationshipSides              (constructor);
		constructor = this.mergeSameNameRelationships(constructor);
		this.register                                (constructor);
		this.mergeSuperclassFields                   (constructor);
		// jsonSchemaConfig                          (constructor); // TODO
		this.resolveRelationshipDomains              (constructor);
		Field.augmentClass                           (constructor);
		return constructor;
	}
	
	////////////////////////////////////////////////////////////////////////////
	
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
		
		/* indices for shorthand array notation and side keys */
		const CLASS       = 0,
		      CARDINALITY = 1,
		      OPTIONS     = 2;
		
		/* normalizing all domainPairs */
		cls.keyInResource = {
			1: `-->${cls.name}`,
			2: `<--${cls.name}`
		};
		cls.domainPairs = cls.domainPairs.map((givenDomainPair) => {
			let pair = { [1]: {}, [2]: {} };
			for (let [  [domainKey, domain ],  [codomainKey, codomain]  ] of
				   [ [  [1        , pair[1]],  [2          , pair[2] ]  ] ,
			         [  [2        , pair[2]],  [1          , pair[1] ]  ] ]) {
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
	
	resolveRelationshipDomains(cls) {
		for (let domainPair of cls.domainPairs) {
			for (let domain of domainPair::values()) {
				this[$$processRelationshipDomain](domain);
			}
		}
	}
	
	[$$processRelationshipDomain](referenceDomain) {
		const {
			resourceClass,
			relationshipClass,
			keyInRelationship,
			keyInResource,
			shortcutKey
		} = referenceDomain;
		
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
		
		
		// TODO: fix bug in the code below (the commented code above already works)
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
		
		/* put back-reference in classes */
		resourceClass.relationships[keyInResource] = referenceDomain;
		Field.augmentClass(resourceClass, keyInResource);
		if (shortcutKey) {
			resourceClass.relationshipShortcuts[shortcutKey] = referenceDomain;
			Field.augmentClass(resourceClass, shortcutKey);
		}
	}
	
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
		
		return cls;
	}
	
	mergeSuperclassFields(cls) : void {
		const mergeFieldKind = (cls, newCls, kind, customMerge) => {
			if (cls[kind]::isUndefined()) { return }
			
			if (!cls[$$processedFor]) { cls[$$processedFor] = {} }
			if (!cls[$$processedFor][kind]) { cls[$$processedFor][kind] = new WeakSet() }
			if (cls[$$processedFor][kind].has(newCls)) { return }
			cls[$$processedFor][kind].add(newCls);
			
			function mergeBetween(superCls, subCls) {
				for (let key of superCls[kind]::keys()) {
					let superDesc = superCls[kind][key];
					let subDesc   = subCls[kind][key];
					if (subDesc::isUndefined()) {
						subCls[kind][key] = superDesc;
						Field.augmentClass(subCls, key);
					} else if (_isEqual(subDesc, superDesc)) {
						continue;
					} else {
						subCls[kind][key] = customMerge(superDesc, subDesc);
					}
				}
			}
			
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
		
		mergeFieldKind(cls, cls, 'relationships', (superDesc, subDesc) => {
			assert(superDesc.resourceClass.hasSubclass(subDesc.resourceClass));
			return subDesc;
		});
		
		mergeFieldKind(cls, cls, 'relationshipShortcuts', (superDesc, subDesc) => {
			assert(superDesc.resourceClass.hasSubclass(subDesc.resourceClass));
			return subDesc;
		});
		
		// TODO: for sides of a relationship (after splitting / merging all relevant domainPairs)
		
	}
	
	mergeSameNameResources(NewClass) : Class {
		const OldClass = this.classes.vertexValue(NewClass.name);
		if (!OldClass) { return NewClass }
		return OldClass::assignWith(NewClass, (vOld, vNew, key) => {
			switch (key) {
				case 'extends':
				case 'extendedBy': return new Set([...vOld, ...vNew]);
				case 'properties':
				case 'patternProperties': return {}::assignWith(vOld, vNew, (pOld, pNew, pKey) => {
					assert(pOld::isUndefined() || _isEqual(pOld, pNew), humanMsg`
						Cannot merge property descriptions for ${OldClass.name}#${key}.
						
						1) ${JSON.stringify(pOld)}
						
						2) ${JSON.stringify(pNew)}
					`);
					return pOld::isUndefined() ? pNew : pOld;
				});
				default: {
					if (!vOld::isUndefined() && !vNew::isUndefined() && !_isEqual(vOld, vNew)) {
						throw new Error(humanMsg`
							Cannot merge ${OldClass.name}.${key} = ${JSON.stringify(vOld)}
							        with ${JSON.stringify(vNew)}.
						`);
					}
					return vOld::isUndefined() ? vNew : vOld;
				}
			}
		});
	}
	
	mergeSameNameRelationships(NewClass) : Class {
		const OldClass = this.classes.vertexValue(NewClass.name);
		if (!OldClass) { return NewClass }
		
		function chooseOne(o, n, sep, key) {
			assert(o::isUndefined() || n::isUndefined() || _isEqual(o, n), humanMsg`
				Cannot merge values for ${OldClass.name}${sep}${key}.
				(1) ${JSON.stringify(o)}
				(2) ${JSON.stringify(n)}
			`);
			return o::isUndefined() ? n : o;
		}
		
		return OldClass::assignWith(NewClass, (vOld, vNew, key) => {
			switch (key) {
				case 'extends':
				case 'extendedBy':
					return new Set([...vOld, ...vNew]);
				case 'domainPairs':
					return [...vOld, ...vNew];
				case 'properties':
				case 'patternProperties':
				case 'behavior':
					return {}::assignWith(vOld, vNew, (pOld, pNew, pKey) => chooseOne(pOld, pNew, '#', pKey));
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


// TODO: reintroduce json schema processor
//
// function jsonSchemaConfig(config) {
// 	let result = {
// 		...config,
// 		allProperties: { ...config.properties }
// 	};
//
// 	if (isFunction(config.extends)) {
// 		/* merge each property with properties of the same name in the superclass */
// 		for (let key of Object.keys(config.extends.allProperties)) {
// 			// TODO: check for conflicts
// 			// TODO: merge certain sub-items (e.g., enums can be made narrower)
// 			result.allProperties[key] = {
// 				...config.extends.allProperties[key],
// 				...result.allProperties[key]
// 			};
// 		}
// 	}
//
// 	/* folding superclass properties into one object */
// 	Object.assign(result.allProperties, config.extends && config.extends.allProperties);
//
// 	return result;
//
// 	// return {
// 	// 	...config,
// 	// 	schema: {
// 	// 		$schema:             'http://json-schema.org/draft-04/schema#',
// 	// 		type:                'Object',
// 	// 		properties:           { ...(config.properties || {})         },
// 	// 		patternProperties:    { ...(config.patternProperties || {})  },
// 	// 		additionalProperties: ( config.additionalProperties === true )  // default: no additional properties allowed
// 	//
// 	// 		// TODO: have this object conform to json schema syntax
// 	// 		//     : - add 'required' field?
// 	// 		//     : - sanitize config.properties
// 	// 		//     : - add properties '1' and '2' to it (if config.isRelationship)
// 	//
// 	// 		// TODO: fold superclass properties, patternProperties, etc. into this
// 	// 		//     : - fold property flags into each other
// 	// 	}
// 	// };
// }
