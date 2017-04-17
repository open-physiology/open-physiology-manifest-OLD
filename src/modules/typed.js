import Module               from '../Module';

import resources                 from './resources';
import {definePropertyByValue}   from '../util/misc';
import {typedDistributionSchema} from '../util/schemas';


export default Module.create('typed', [
	resources
], (M, {
	Resource, IsRelatedTo
}) => {
	
	
	const Type = M.RESOURCE({///////////////////////////////////////////////////
		
		name: 'Type',
		
		extends: Resource,
		
		singular: "type",
		
		icon: 'data:image/png;base64,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'
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const IsSubtypeOf = M.RELATIONSHIP({
		
		name: 'IsSubtypeOf',
		
		extends: IsRelatedTo,
		
		singular: "is subtype of",
		
		1: [Type, '0..*', {                key: 'subtypes'   }],
		2: [Type, '0..*', { anchors: true, key: 'supertypes' }],
		
		noCycles: true
		
	});
	
	
	const Template = M.RESOURCE({///////////////////////////////////////////////
		
		name: 'Template',
		
		abstract: true,
		
		extends: Resource,
		
		singular: "template",

		properties: {
			'cardinalityBase': {
				...typedDistributionSchema,
				default: 1
			},
			'species': {
				type: 'string',
				isRefinement(a, b) {
					return !a || a === b;
				}
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	Template::definePropertyByValue('Type',     Type    );
	Type    ::definePropertyByValue('Template', Template);
	
	
	const HasCardinalityMultipliedByThatOf = M.RELATIONSHIP({
		
		name: 'HasCardinalityMultipliedByThatOf',
		
		extends: IsRelatedTo,
		
		singular: "has cardinality multiplied by that of",
		
		1: [Template, '0..*', { anchors: true, key: 'cardinalityMultipliers' }],
		2: [Template, '0..*',                                                 ],
		
		noCycles: true
		
	});
	
	
	const HasType = M.RELATIONSHIP({
		
		name: 'HasType',
		
		extends: IsRelatedTo,
		
		singular: "has type",
		
		1: [Template, '0..*', { anchors: true, key: 'types' }],
		2: [Type,     '0..*',                                ]
		
	});
	
	 
	const DefinesType = M.RELATIONSHIP({
		
		name: 'DefinesType',
		
		extends: HasType,
		
		singular: "defines type",
		
		1: [Template, '0..1', { anchors: true, key: 'definedType' }],
		2: [Type,     '1..1', { anchors: true, key: 'definition'  }]
		
	});
	
	
	const PullsIntoTypeDefinition = M.RELATIONSHIP({
		
		name: 'PullsIntoTypeDefinition',
		
		abstract: true,
		
		extends: IsRelatedTo,
		
		singular: "pulls into type definition",
		plural:   "pull into type definition",
		
		1: [Template, '0..*'],
		2: [Template, '0..*']
		
	});
	
	
	const Has = M.RELATIONSHIP({
		
		name: 'Has',
		
		abstract: true,
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has",
		plural:   "have",
		
		1: [Template, '0..*', { anchors: true, key: 'children' }],
		2: [Template, '0..*', {                key: 'parents'  }],
		
		noCycles: true
		
	});
	
	
});
