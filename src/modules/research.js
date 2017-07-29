import Module from './Module.js';

import resources   from './resources';
import measurables from './measurables';


export default Module.create('research', [
	resources, measurables
], (M, {
	Resource, IsRelatedTo, Measurable
}) => {
	 
	
	const Correlation = M.RESOURCE({////////////////////////////////////////////
		
		name: 'Correlation',
		
		extends: Resource,
		
		singular: "correlation",
				
		icon: require('./icons/correlation.png'),
		
		properties: {
			'comment': { type: 'string' }
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const InvolvesMeasurable = M.RELATIONSHIP({
		
		name: 'InvolvesMeasurable',
		
		extends: IsRelatedTo,
		
		singular: "involves",
		plural:   "involve",
		
		1: [Correlation, '0..*', { key: 'measurables' }],
		2: [Measurable,  '0..*',                       ],
		
	});
	
	
	const ClinicalIndex= M.RESOURCE({///////////////////////////////////////////
		
		name: 'ClinicalIndex',
		
		extends: Resource,
		
		singular: "clinical index",
		plural:   "clinical indices",
				
		icon: require('./icons/clinicalIndex.png'),
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const EncompassesClinicalIndex = M.RELATIONSHIP({
		
		name: 'EncompassesClinicalIndex',
		
		extends: IsRelatedTo,
		
		singular: "encompasses",
		plural: "encompass",
		
		1: [ClinicalIndex, '0..*', { key: 'children' }],
		2: [ClinicalIndex, '0..1', { key: 'parent'   }],
		
		noCycles: true,
		
	});
	
	
	const InvolvesClinicalIndex = M.RELATIONSHIP({
		
		name: 'InvolvesClinicalIndex',
		
		extends: IsRelatedTo,
		
		singular: "involves",
		plural: "involve",
		
		1: [Correlation,   '0..*', { key: 'clinicalIndices' }],
		2: [ClinicalIndex, '0..*',                           ],
		
	});
	
	
	const Publication = M.RESOURCE({////////////////////////////////////////////
		
		name: 'Publication',
		
		extends: Resource,
		
		singular: "publication",
				
		icon: require('./icons/publication.png'),
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const InvolvesPublication = M.RELATIONSHIP({
		
		name: 'InvolvesPublication',
		
		extends: IsRelatedTo,
		
		singular: "involves",
		plural: "involve",
		
		1: [Correlation, '0..1', { key: 'publication'  }],
		2: [Publication, '0..*', { key: 'correlations' }],
		
	});
	
	
});

