import TypedModule from './TypedModule.js';

import resources from './resources';
import typed     from './typed';
import groups    from './groups';
import lyphs     from './lyphs';

export default TypedModule.create('canonicalTrees', [
	resources, typed, groups, lyphs
], (M, {
	IsRelatedTo, Template, Resource, Lyph, Node, Has, PullsIntoTypeDefinition
}) => {
	
	
	const CanonicalTree = M.TYPED_RESOURCE({////////////////////////////////////
		
		name: 'CanonicalTree',
		
		extends: Template,
		
		singular: "canonical tree",
				
		icon: require('./icons/canonicalTree.png'),
		
	});/////////////////////////////////////////////////////////////////////////
	
	const CanonicalTreeBranch = M.TYPED_RESOURCE({//////////////////////////////
		
		name: 'CanonicalTreeBranch',
		
		extends: Template,
		
		singular: "canonical tree branch",
		plural:   "canonical tree branches",
				
		icon: require('./icons/canonicalTreeBranch.png'),
		
	});/////////////////////////////////////////////////////////////////////////
	
	const HasBranch = M.RELATIONSHIP({
		
		name: 'HasBranch',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has",
		plural:   "have",
		
		1: [CanonicalTree,       '0..*', { key: 'childBranches' }],
		2: [CanonicalTreeBranch, '1..1', { key: 'parentTree'    }],
		
	});
	
	const BranchesTo = M.RELATIONSHIP({
		
		name: 'BranchesTo',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "branches to",
		plural:   "branch to",
		
		1: [CanonicalTreeBranch, '1..1', { key: 'childTree'    }],
		2: [CanonicalTree,       '0..1', { key: 'parentBranch' }],
		
	});
	
	const IsConveyedBy = M.RELATIONSHIP({
		
		name: 'IsConveyedBy',
		
		extends: IsRelatedTo,
		
		singular: "is conveyed by",
		plural:   "are conveyed by",
		
		1: [CanonicalTreeBranch, '0..1', { key: 'conveyingLyphType' }],
		2: [Lyph.Type,           '0..*', {                          }],
		
	});
	
});

