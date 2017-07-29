import TypedModule from './TypedModule.js';

import resources from './resources';
import typed     from './typed';


export default TypedModule.create('groups', [
	resources, typed
], (M, {
	IsRelatedTo, Template, PullsIntoTypeDefinition
}) => {
	
	
	const Group = M.TYPED_RESOURCE({/////////////////////////////////////////
		
		name: 'Group',
		
		extends: Template,
		
		singular: "group",
				
		icon: require('./icons/group.png'),
		
	});/////////////////////////////////////////////////////////////////////////////
	
	
	const IncludesElement = M.RELATIONSHIP({
		
		name: 'IncludesElement',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "includes",
		plural:   "include",
		
		1: [Group,    '0..*', { key: 'elements' }],
		2: [Template, '0..*',                    ],
		
	});



});

