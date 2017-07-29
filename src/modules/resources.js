import {idSchema, uriSchema, identifierSchema} from '../util/schemas';
import Module                                  from './Module';


export default Module.create('resources', [], (M) => {
	
	
	const Resource = M.RESOURCE({/////////////////////////////////////////////////////////////////
		
		name: 'Resource',
		
		abstract: true,
		
		singular: "resource",
		
		icon: require('./icons/resource.png'),
		
		properties: {
			'id':    { ...idSchema,         readonly: true },
			'class': { ...identifierSchema, readonly: true },
			'name':  { type: 'string' }
		}
		
	});//////////////////////////////////////////////////////////////////////////
	
	
	const IsRelatedTo = M.RELATIONSHIP({
		
		name: 'IsRelatedTo',
		
		abstract: true,
		
		singular: "is related to",
		plural: "are related to",
		
		1: [Resource, '0..*'],
		2: [Resource, '0..*']
		
	});
	
	
	const ExternalResource = M.RESOURCE({///////////////////////////////////////
		
		name: 'ExternalResource',
		
		extends: Resource,
		
		singular: "external resource",
		
		icon: require('./icons/externalResource.png'),
		
		properties: {
			'uri':  { ...uriSchema   },
			'type': { type: 'string' } // "fma" or "cocomac", etc.
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	const CorrespondsTo = M.RELATIONSHIP({
		
		name: 'CorrespondsTo',
		
		extends: IsRelatedTo,
		
		singular: "corresponds to",
		plural: "correspond to",
		
		1: [Resource,         '0..*', { key: 'externals' }],
		2: [ExternalResource, '0..*', { key: 'locals'    }],
		
	});
	
	
});
