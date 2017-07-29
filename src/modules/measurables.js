import TypedModule     from './TypedModule.js';

import resources from './resources';
import typed     from './typed';
import lyphs     from './lyphs';
import processes from './processes';
import {dimensionalitySchema} from "../util/schemas";


export default TypedModule.create('measurables', [
	resources, typed, lyphs, processes
], (M, {
	Resource, IsRelatedTo, Template,
	Lyph, Material, Border, Node,
	Process, Has, PullsIntoTypeDefinition
}) => {
	
	
	const Measurable = M.TYPED_RESOURCE({///////////////////////////////////////
		
		name: 'Measurable',
		
		extends: Template,
		
		singular: "measurable",
				
		icon: require('./icons/measurable.png'),
		
		properties: {
			'quality': {
				type: 'string',
				isRefinement(a, b) {
					return !a || a === b;
				}
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	  
	const MeasuresMaterial = M.RELATIONSHIP({
		
		name: 'MeasuresMaterial',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "measures",
		plural:   "measure",
		
		1: [Measurable,    '0..*', { key: 'materials' }],
		2: [Material.Type, '0..*',                     ]
		
	});
	
	
	const MeasurableLocation = M.TYPED_RESOURCE({///////////////////////////////
		
		name: 'MeasurableLocation',
		
		abstract: true,
		
		extends: Template,
		
		extendedBy: [Lyph, Border, Node, Process],
		
		singular: "measurable location"
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const HasMeasurable = M.RELATIONSHIP({
		
		name: 'HasMeasurable',
		
		extends: Has,
		
		singular: "has",
		plural: "have",
		
		1: [MeasurableLocation, '0..*', { key: 'measurables' }],
		2: [Measurable,         '0..*', { key: 'locations'   }],
		
		// TODO: maybe... auto-create classes for the inverse of relationships,
		//     : so that HasMeasurable_inverse can extend PullsIntoTypeDefinition
		
	});
	
	
	const Causality = M.TYPED_RESOURCE({////////////////////////////////////////
		
		name: 'Causality',
		
		extends: Template,
		
		singular: "causality",
		plural:   "causalities",
				
		icon: require('./icons/causality.png'),
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const IsCauseOf = M.RELATIONSHIP({
		
		name: 'IsCauseOf',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "is cause of",
		plural: "are cause of",
		
		1: [Measurable, '0..*', { key: 'effects' }],
		2: [Causality,  '1..1', { key: 'cause'   }],
		
	});
	
	const HasEffect = M.RELATIONSHIP({
		
		name: 'HasEffect',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has effect",
		plural:   "have effect",
		
		1: [Causality,  '1..1', { key: 'effect' }],
		2: [Measurable, '0..*', { key: 'causes' }],
		
	});


});

