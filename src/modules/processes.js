import {wrapInArray} from 'utilities';

import TypedModule       from './TypedModule.js';
import {enumArraySchema} from '../util/schemas.js';
import resources         from './resources.js';
import typed             from './typed.js';
import lyphs             from './lyphs.js';


export default TypedModule.create('processes', [
	resources, typed, lyphs
], (M, {
	Template, Material, Lyph, Node,
	Has, PullsIntoTypeDefinition
}) => {
	
	
	const Process = M.TYPED_RESOURCE({//////////////////////////////////////////
		
		name: 'Process',
		
		extends: Template,
		
		singular: "process",
		plural:   "processes",
				
		icon: require('./icons/process.png'),
		
		properties: {
			'transportPhenomenon': {
				...enumArraySchema('advection', 'diffusion'),
				default: ['advection', 'diffusion'],
				isRefinement(a, b) {
					a = new Set(a ? wrapInArray(a) : []);
					b = new Set(b ? wrapInArray(b) : []);
					return !(b.has('advection') && !a.has('advection')) &&
					       !(b.has('diffusion') && !a.has('diffusion'));
				}
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const IsSourceFor = M.RELATIONSHIP({
		
		name: 'IsSourceFor',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "is source for",
		plural:   "are source for",
		
		1: [Node,    '0..*', { key: 'outgoingProcesses' }],
		2: [Process, '1..1', { key: 'source'            }],
		
	});
	
	const HasTarget = M.RELATIONSHIP({
		
		name: 'HasTarget',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has target",
		plural:   "have target",
		
		1: [Process, '1..1', { key: 'target'            }],
		2: [Node,    '0..*', { key: 'incomingProcesses' }],
		
	});
	
	
	const ConveysProcess = M.RELATIONSHIP({
		
		name: 'ConveysProcess',
		
		extends: Has,
		
		singular: "conveys",
		plural: "convey",
		
		1: [Lyph,    '0..*', { key: 'processes'     }],
		2: [Process, '0..*', { key: 'conveyingLyph' }],
		
	});
	
	
	const TransportsMaterial = M.RELATIONSHIP({
		
		name: 'TransportsMaterial',
		
		extends: Has,
		
		singular: "transports",
		plural: "transport",
		
		1: [Process,       '0..*', { key: 'materials' }],
		2: [Material.Type, '0..*',                     ],
		
	});
	
	const HasSegment = M.RELATIONSHIP({
		
		name: 'HasSegment',
		
		extends: Has,
		
		singular: "has segment",
		plural:   "have segment",
		
		1: [Process, '0..*', { key: 'segments' }],
		2: [Process, '0..*',                    ],
		
	});
	
	
	const HasProcessChannel = M.RELATIONSHIP({
		
		name: 'HasProcessChannel',
		
		extends: Has,
		
		singular: "has channel",
		plural:   "have channel",
		
		1: [Process, '0..*', { key: 'channels' }],
		2: [Process, '0..*',                    ],
		
	});
	
	
	const HasNodeChannel = M.RELATIONSHIP({
		
		name: 'HasNodeChannel',
		
		extends: Has,
		
		singular: "has channel",
		plural:   "have channel",
		
		1: [Node, '0..*', { key: 'channels' }],
		2: [Node, '0..*',                    ],
		
	});
	
	
});

