import TypedModule                                          from '../TypedModule';
import {identifierRegex, rationalNumberSchema, angleSchema} from '../util/schemas';

import resources   from './resources';
import lyphs       from './lyphs';
import typed       from './typed';
import processes   from './processes';
import measurables from './measurables';


export default TypedModule.create('visualisations', [
	resources, lyphs, typed, processes, measurables
], (M, {
	Resource, IsRelatedTo, Material, Lyph,
	Border, Coalescence, Node,
	Template, Process, Measurable, Causality
}) => {
	
	
	const Theme = M.RESOURCE({//////////////////////////////////////////////////
		
		name: 'Theme',
		
		extends: Resource,
		
		singular: "theme",
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const PrescribesStyleFor = M.RELATIONSHIP({
		
		name: 'PrescribesStyleFor',
		
		extends: IsRelatedTo,
		
		singular: "prescribes style for",
		
		1: [Theme,    '0..*', { key: 'resources' }],
		2: [Resource, '0..*', { key: 'themes'    }],
		
		patternProperties: {
			[identifierRegex]: { type: 'string', minLength: 1 }
		}
		
	});


	////////////////////////////
	//// Artefact Hierarchy ////
	////////////////////////////
	
	const Artefact = M.RESOURCE({///////////////////////////////////////////////
		
		name: 'Artefact',
		
		extends:  Resource,
		abstract: true,
		
		singular: "artefact",
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim2Artefact = M.RESOURCE({///////////////////////////////////////////
		
		name: 'Dim2Artefact',
		
		extends:  Artefact,
		abstract: true,
		
		singular: "2-dimensional artefact"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim1Artefact = M.RESOURCE({///////////////////////////////////////////
		
		name: 'Dim1Artefact',
		
		extends:  Dim2Artefact,
		abstract: true,
		
		singular: "1-dimensional artefact"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim0Artefact = M.RESOURCE({///////////////////////////////////////////
		
		name: 'Dim0Artefact',
		
		extends:  Dim1Artefact,
		abstract: true,
		
		singular: "0-dimensional artefact"
		
	});/////////////////////////////////////////////////////////////////////////


//////////////////////////////////////
//// Artefact Container Hierarchy ////
//////////////////////////////////////
	
	const ArtefactContainer = M.RESOURCE({//////////////////////////////////////
		
		name: 'ArtefactContainer',
		
		abstract: true,
		
		extends:  Artefact,
		
		singular: "artefact container",
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim2Container = M.RESOURCE({//////////////////////////////////////////
		
		name: 'Dim2Container',
		
		extends:  [ArtefactContainer, Dim2Artefact],
		abstract: true,
		
		singular: "2-dimensional container",
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim1Container = M.RESOURCE({//////////////////////////////////////////
		
		name: 'Dim1Container',
		
		extends:  [ArtefactContainer, Dim1Artefact],
		abstract: true,
		
		singular: "1-dimensional container"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const Dim0Container = M.RESOURCE({//////////////////////////////////////////
		
		name: 'Dim0Container',
		
		extends:  [ArtefactContainer, Dim0Artefact],
		abstract: true,
		
		singular: "0-dimensional container"
		
	});/////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////
//// Artefact Containment Relationship Hierarchy ////
/////////////////////////////////////////////////////
	
	const ContainsArtefact = M.RELATIONSHIP({
		
		name: 'ContainsArtefact',
		
		abstract: true,
		
		extends: IsRelatedTo,
		
		singular: "contains artefact",
		
		1: [ArtefactContainer, '0..*', { anchors: true, key: 'children' }],
		2: [Artefact,          '0..1', {                key: 'parent'   }]
		
	});
	
	/* in 2-dimensional containers */
	const ContainsArtefact_22 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_22',
		
		extends: ContainsArtefact,
		
		1: [Dim2Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim2Artefact,  '0..1', {                key: 'parent'   }],
		
		properties: {
			'x':        { ...rationalNumberSchema,    required: true },
			'y':        { ...rationalNumberSchema,    required: true },
			'rotation': { ...angleSchema, default: 0, required: true },
			'width':    { ...rationalNumberSchema,    required: true },
			'height':   { ...rationalNumberSchema,    required: true }
		}
		
	});
	const ContainsArtefact_21 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_21',
		
		extends: ContainsArtefact_22,
		
		1: [Dim2Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim1Artefact,  '0..1', {                key: 'parent'   }],
		
		properties: { 'height': { value: 0 } }
		
	});
	const ContainsArtefact_20 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_20',
		
		extends: ContainsArtefact_21,
		
		1: [Dim2Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim0Artefact,  '0..1', {                key: 'parent'   }],
		
		properties: { 'width': { value: 0 } }
		
	});
	
	/* in 1-dimensional containers */
	const ContainsArtefact_11 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_11',
		
		extends: ContainsArtefact,
		
		1: [Dim1Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim1Artefact,  '0..1', {                key: 'parent'   }],
		
		properties: {
			'x':        { ...rationalNumberSchema, required: true },
			'width':    { ...rationalNumberSchema, required: true }
		}
		
	});
	const ContainsArtefact_10 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_10',
		
		extends: ContainsArtefact_11,
		
		1: [Dim1Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim0Artefact,  '0..1', {                key: 'parent'   }],
		
		properties: { 'width': { value: 0 } }
		
	});
	
	/* containment in 0-dimensional containers */
	const ContainsArtefact_00 = M.RELATIONSHIP({
		
		name: 'ContainsArtefact_00',
		
		extends: ContainsArtefact,
		
		1: [Dim0Container, '0..*', { anchors: true, key: 'children' }],
		2: [Dim0Artefact,  '0..1', {                key: 'parent'   }]
		
	});


	////////////////////////////
	//// Specific Artefacts ////
	////////////////////////////
	
	const LyphCanvas = M.RESOURCE({/////////////////////////////////////////////
		
		name: 'LyphCanvas',
		
		extends: Dim2Container,
		
		singular: "lyph canvas",
		plural:   "lyph canvases"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const MaterialGlyph = M.RESOURCE({//////////////////////////////////////////
		
		name: 'MaterialGlyph',
		
		extends: Dim0Artefact,
		
		singular: "material glyph"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const LyphRectangle = M.RESOURCE({//////////////////////////////////////////
		
		name: 'LyphRectangle',
		
		extends: Dim2Container,
		
		singular: "lyph rectangle"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const LyphArtefact = M.RESOURCE({///////////////////////////////////////////
		
		name: 'LyphArtefact',
		
		extends: Dim2Container,
		extendedBy: [LyphCanvas, LyphRectangle],
		
		singular: "lyph artefact"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const BorderLine = M.RESOURCE({/////////////////////////////////////////////
		
		name: 'BorderLine',
		
		extends: Dim1Container,
		
		singular: "border line"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const CoalescenceRectangle = M.RESOURCE({///////////////////////////////////
		
		name: 'CoalescenceRectangle',
		
		extends: Dim2Container,
		
		singular: "coalescence rectangle"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const NodeGlyph = M.RESOURCE({//////////////////////////////////////////////
		
		name: 'NodeGlyph',
		
		extends: Dim0Container,
		
		singular: "node glyph"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const ProcessEdge = M.RESOURCE({////////////////////////////////////////////
		
		name: 'ProcessEdge',
		
		extends: Dim1Container,
		
		singular: "process edge"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const MeasurableGlyph = M.RESOURCE({////////////////////////////////////////
		
		name: 'MeasurableGlyph',
		
		extends: Dim0Artefact,
		
		singular: "measurable glyph"
		
	});/////////////////////////////////////////////////////////////////////////
	
	const CausalityArrow = M.RESOURCE({/////////////////////////////////////////
		
		name: 'CausalityArrow',
		
		extends: Dim1Artefact,
		
		singular: "causality arrow"
		
	});/////////////////////////////////////////////////////////////////////////


	////////////////////////////////////////
	//// Model - Artefact Relationships ////
	////////////////////////////////////////
	
	const PresentsModel = M.RELATIONSHIP({
		
		name: 'PresentsModel',
		
		abstract: true,
		
		extends: IsRelatedTo,
		
		singular: "presents model",
		
		1: [Artefact, '1..1', { anchors: true, key: 'model' }],
		2: [Template, '0..*',                                ],
		
	});
	
	
	for (let [ArtefactClass,        ModelClass ] of [
		     [MaterialGlyph,        Material   ],
		     [LyphArtefact,         Lyph       ],
		     [LyphCanvas,           Lyph       ], // TODO: Tests fail if these two
		     [LyphRectangle,        Lyph       ], //       lines are left out.
		     [BorderLine,           Border     ],
		     [NodeGlyph,            Node       ],
		     [ProcessEdge,          Process    ],
		     [MeasurableGlyph,      Measurable ],
		     [CausalityArrow,       Causality  ],
		     [CoalescenceRectangle, Coalescence],
	]) {
		M.RELATIONSHIP({
			
			name: `Presents${ArtefactClass.name}Model`,
			
			extends: PresentsModel,
			
			singular: `presents ${ArtefactClass.singular}-model`,
			
			1: [ArtefactClass, '1..1', { anchors: true, key: 'model' }],
			2: [ModelClass,    '0..*',                                ],
			
		});
	}
	
});

