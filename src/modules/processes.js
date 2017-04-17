import TypedModule                   from '../TypedModule';
import {arrayContainsValue}          from '../util/misc';
import {enumArraySchema, enumSchema} from '../util/schemas';

import resources from './resources';
import typed     from './typed';
import lyphs     from './lyphs';
import {wrapInArray} from "../util/misc";

export default TypedModule.create('processes', [
	resources, typed, lyphs
], (M, {
	IsRelatedTo, Template, Material, Lyph, Node,
	Has, PullsIntoTypeDefinition
}) => {
	
	
	const Process = M.TYPED_RESOURCE({//////////////////////////////////////////
		
		name: 'Process',
		
		extends: Template,
		
		singular: "process",
		plural:   "processes",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQMY01xpewAAA4JJREFUWMO1lk1vI0UQht+3ptvO5h4hcd6PHBBEkKxxEsXWev7BHrmCEAjxN7juhQ8JzhwQSNyZg73yZteBRJhbMJyQ2AN7s5SV4nEVB88448nMxMl6W2rZU6ruqq7qeroYhu0As2HJr2S+X7dsSlwx2u1975zLLmYyVyITkkOSJiImIkZyPkVk1O32J6/LOACCxCXj2W8A2Nl512HFw8zY6bQcUoN541kHAFzSq4jasrJvAcAl3qRGsh4Web2gl9W5rgzAhwDOQaLw5KkMABqNbb/K8Nfrtc3Expgkfyf5Tomnf6rqvUypruQSRlE3TtPrzGyrKtwHB3su2WTVFQAAcGHYdjkQ5ZVf2XgUdeP9/ff92tpa9lLDzBYotfI6V1VGUTcWkR/6/WeTjN5FBJbZdDKJrdfrx9ch5vn5OVVVROSZmTVyNuYplmVC3Ov1Y5J/V9T0X3linpwM3zg8PPonYxwZGxej02nJ06e/SNnJUgoWGc8DKwzbwenpr/Te74uIZp3M7um9v5esG8/CIPJNGbnSRWXGs3pmxiAIPi/Q05L9v3Yi8qWZfVxGrioS5nVPTh4TgBbpFZDwOzP7BCTGJK1er28WGW0279fSFFxFzDBsOzOjc8FuWSSzjnc6rYCzTQBVY8KEMnKNSN4uIeZIVe+mxCTJweB4YzweDwFspOkJw7bPX3S5KIJyHhwc7Dkzu6OqVFWa2XwmsrsJMQGAZsatrbf+295+700AR5mw56sMDiByKb9UkrWaR5H3VcSs1WoWBAHNrEHyp5IDqizKV0vCIAgQhm2vqg93dxuuSE9yXLiWobOzl4ii7vQqvTBsB+vrt4qAR0nasrIcVTp0eDiIReTHKOrGqnqjqLnZ/5TIN3pSH4rI0dnZy13vHev1+jySk8kEvd6TadUbIstcwgpZWtM7g8Fv/x4fDzc4u/I2e0OexCRHZX0iySGStsi895s3aa9yG5r3vpnUfLAUwkl+VUa4Jbtcza8Vkc/MjKkDVRR1ZvapiDgz+6iI2dfocrNyjaKfORNd0XF3Oi15/vyUN+1w8yfy3jcfPfpC0lav6v0gOec/btrriUh6yhfr67febjbvv0j1oqg7FZERgNtFUVPVP9wr9oRpOI8ePNjdi+NFvVZr3/V6/Ttlz3raE04TEKRp0BzXq2QA8L2ZfaAaOO9lQc97h6Qa8mvnJPwfyvu4MadSbbcAAAAASUVORK5CYII=',
		
		properties: {
			'transportPhenomenon': {
				...enumArraySchema('advection', 'diffusion'),
				default: ['advection', 'diffusion'],
				required: true,
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
		
		1: [Node,    '0..*', {                key: 'outgoingProcesses' }],
		2: [Process, '0..1', { anchors: true, key: 'source'            }],
		
	});
	
	const HasTarget = M.RELATIONSHIP({
		
		name: 'HasTarget',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has target",
		
		1: [Process, '0..1', { anchors: true, key: 'target'            }],
		2: [Node,    '0..*', {                key: 'incomingProcesses' }],
		
	});
	
	
	const ConveysProcess = M.RELATIONSHIP({
		
		name: 'ConveysProcess',
		
		extends: Has,
		
		singular: "conveys process",
		
		1: [Lyph,    '0..*', { anchors: true, key: 'processes'     }],
		2: [Process, '0..*', {                key: 'conveyingLyph' }],
		
	});
	
	
	const TransportsMaterial = M.RELATIONSHIP({
		
		name: 'TransportsMaterial',
		
		extends: Has,
		
		singular: "transports material",
		
		1: [Process,       '0..*', { anchors: true, key: 'materials' }],
		2: [Material.Type, '0..*',                                    ],
		
	});
	
	const HasSegment = M.RELATIONSHIP({
		
		name: 'HasSegment',
		
		extends: Has,
		
		singular: "has segment",
		
		1: [Process, '0..*', { anchors: true, key: 'segments' }],
		2: [Process, '0..*',                                   ],
		
		// TODO: CONSTRAINT: segments are connected in a straight line
		//     : through nodes, starting and ending with the same nodes
		//     : as this process; all of those nodes have to be children
		//     : of this process too
		
	});
	
	
	const HasProcessChannel = M.RELATIONSHIP({
		
		name: 'HasProcessChannel',
		
		extends: Has,
		
		singular: "has process-channel",
		
		1: [Process, '0..*', { anchors: true, key: 'channels' }],
		2: [Process, '0..*',                                   ],
		
	});
	
	
	const HasNodeChannel = M.RELATIONSHIP({
		
		name: 'HasNodeChannel',
		
		extends: Has,
		
		singular: "has node-channel",
		
		1: [Node, '0..*', { anchors: true, key: 'channels' }],
		2: [Node, '0..*',                                   ],
		
	});
	
	
});

