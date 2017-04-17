import Module from '../Module';

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
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAB3RJTUUH4QQDEQ0f07vRVgAAA+BJREFUWMPtll1sFFUUx393dvthmRpbpTbV+FFnaaIGCdFqkWqA3SYlKgZM0AC2U4M12BB88I3EhMTomzEWkkbsbPWFEGiDoQ24tTW1EQ2J+PWA7NKqRKgobSrTLm67c3zYr+nuVrD1yfQ83bn3nPv/33vO/Z+BJVuy/6s5213j5vn9vP8paBNoXYmxKmCjmDwIxIHvgFC+GLVYUNkB6qPk2KQO4VVgWx7XOPCKCnJwDtEFA7eBagcxuR1oQ9gFlN9A6PsqyMupD+3fgJav8LvP45cWvkYYQ9ibBe6g6EDjKRSbUBx2re2UZnYsKAW6L7AcobXUM/v0ipKp2vKCGI1lV9hZdSHlEgL2K4tjqZqAxHU7JluUcCTpN6WC6P9IoMQIMB1J1I1u+F8E2oBHcgpPFMs8cSoLY5u//2G4xzFBs+ZJWzN9QCOACKu1Ls7MmwIN6nUjcEg3/AJ0pcAdwI57mJUEd00JUUdj9Fpxt+5r2DgfuNMEKLrTV6/xQN4a0H2BBt3w/wEyBLLVvVZVFHPevDfCxOMDRNeH3rJniu5EqWOZI0pv2f1+L1Vbchl4sp694OQQ0A3/HkROAre6pmdBHbCjuvHjmqHuPXf8xC3eGSTOO0bJ5K92OPQsqCOpXWdi6nUuHs290U5A2J7hyrfpGrjZF8ARqQW+cknEMIq37XCoNx1k8hnCkwAqmIgtqd6AKG+ZR8XHk3Gn7EhojVsFtSCIyW6Ed5PTv6sgFekb+DMcAuhwEX7DjoTqFfRmHWQ0TaaFOseE6ZFPiZ4/OQHMJFfumqN0GpvF5AsXOCia5+jAMmOdDqxKzo3Ykf59AFfDGfWcfQ5Q9LhyaGkWSEt61wIB7HjBb/IaNWJyUEwcHI4i1KXDFPuURd+cXqDwrHSRPpy3aSSy/LGYXESoQqiRZs4DrZU16x8q9V5jW8UlWqsurGaCs3lEfwx4SbPocz9Vb5KVKOG66igmAGuBkeRUNQ6hS2sHMmqf22k+BNqVxek0gEUWWNz5xhX2AkBRdUMOgeLBRpTFaM945apf/irOUI1ngSuG0XheWShl0SSSAZ+3G+qG/zTwcPLzPTvSvztR5X6mR/pTGrE10e2kfjruYdPyyzxTfpnbCmPUlk4OVhTGjgMfKIvJVLO6nqlEEQZQyEpIvM3k0lmQDqXUFRE2AE0guT1WtFPR2cK9/Hx8YCFdVWUJkQl03kDcGLAftAN25JPxm4x1RCODLJpAksRjwCHg7jzunUC7HQmdASjxPcF0eGhRPzQ5v2Qezfvl5LkT9+hGwAc8ClIkSp2bCoc+B9DvC6R9Fwu+ZEu2ZAB/A+SFXu5DKZ4BAAAAAElFTkSuQmCC',
		
		properties: {
			'comment': { type: 'string' }
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const InvolvesMeasurable = M.RELATIONSHIP({
		
		name: 'InvolvesMeasurable',
		
		extends: IsRelatedTo,
		
		singular: "involves measurable",
		
		1: [Correlation, '0..*', { anchors: true, key: 'measurables' }],
		2: [Measurable,  '0..*',                                      ],
		
	});
	
	
	const ClinicalIndex= M.RESOURCE({///////////////////////////////////////////
		
		name: 'ClinicalIndex',
		
		extends: Resource,
		
		singular: "clinical index",
		plural:   "clinical indices",
				
		icon: 'data:image/png;base64,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'
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const EncompassesClinicalIndex = M.RELATIONSHIP({
		
		name: 'EncompassesClinicalIndex',
		
		extends: IsRelatedTo,
		
		singular: "encompasses clinical index",
		
		1: [ClinicalIndex, '0..*', { anchors: true, key: 'children' }],
		2: [ClinicalIndex, '0..1', {                key: 'parent'   }],
		
		noCycles: true,
		
	});
	
	
	const InvolvesClinicalIndex = M.RELATIONSHIP({
		
		name: 'InvolvesClinicalIndex',
		
		extends: IsRelatedTo,
		
		singular: "involves clinical index",
		
		1: [Correlation,   '0..*', { anchors: true, key: 'clinicalIndices' }],
		2: [ClinicalIndex, '0..*',                                          ],
		
	});
	
	
	const Publication = M.RESOURCE({////////////////////////////////////////////
		
		name: 'Publication',
		
		extends: Resource,
		
		singular: "publication",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAM1BMVEU1eK7///+avNdomsLN3etCgLPy9/pOibh0oseBq8zm7vWzzOHA1eZbkb3Z5vCnxNyNs9E3reOcAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQUzKbo3vQAAANNJREFUOMuNk9kWhSAIRUG0QW34/6+9gE120dV5MOrspRgAyMrOlBcPEBdoahGg4wsBHrryEEqAyQaKHTOn4jr7oOobQHy9pQEQwICHZgvYYcZL0QBcwKeGfyBVAKbwBrxedeWQLdKk3oDkHw5nsAB9y+XhmwCU9Fwb2HSdGkC+amQD4/HHbSDJyZqnswH+EtEL5W0gaDgyhTWgTSM7EEkRZNmJYg2EVdp82PJdDHp1hfP57FQbmO8GJxOA8IwtoNJ0VrM9WInUxv5k4QcAO9PJ9/0B3wYEHxEvB7IAAAAASUVORK5CYII='
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const InvolvesPublication = M.RELATIONSHIP({
		
		name: 'InvolvesPublication',
		
		extends: IsRelatedTo,
		
		singular: "involves publication",
		
		1: [Correlation, '0..1', { anchors: true, key: 'publication'  }],
		2: [Publication, '0..*', { anchors: true, key: 'correlations' }],
		
	});
	
	
});

