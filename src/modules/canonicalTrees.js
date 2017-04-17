import TypedModule from '../TypedModule';

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
				
		icon: 'data:image/png;base64,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',
		
	});/////////////////////////////////////////////////////////////////////////
	
	const CanonicalTreeBranch = M.TYPED_RESOURCE({//////////////////////////////
		
		name: 'CanonicalTreeBranch',
		
		extends: Template,
		
		singular: "canonical tree branch",
		
		plural: "canonical tree branches",
				
		icon: 'data:image/png;base64,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',
		
	});/////////////////////////////////////////////////////////////////////////
	
	const HasBranch = M.RELATIONSHIP({
		
		name: 'HasBranch',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has branch",
		
		1: [CanonicalTree,       '0..*', {                key: 'childBranches' }],
		2: [CanonicalTreeBranch, '1..1', { anchors: true, key: 'parentTree'    }],
		
	});
	
	const BranchesTo = M.RELATIONSHIP({
		
		name: 'BranchesTo',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "branches to",
		
		1: [CanonicalTreeBranch, '1..1', { anchors: true, key: 'childTree'    }],
		2: [CanonicalTree,       '0..1', {                key: 'parentBranch' }],
		
	});
	
	const IsConveyedBy = M.RELATIONSHIP({
		
		name: 'IsConveyedBy',
		
		extends: IsRelatedTo,
		
		singular: "is conveyed by",
		
		plural: "are conveyed by",
		
		1: [CanonicalTreeBranch, '0..1', { anchors: true, key: 'conveyingLyphType' }],
		2: [Lyph.Type,           '0..*', {                                         }],
		
	});
	
});

