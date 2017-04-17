import {describe, it, expect} from '../test.helper';

import moduleFactory from '../../src/modules/visualisations';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'visualisation' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Theme',
			'Artefact',
			'Dim2Artefact',
			'Dim1Artefact',
			'Dim0Artefact',
			'ArtefactContainer',
			'Dim2Container',
			'Dim1Container',
			'Dim0Container',
			'LyphCanvas',
			'MaterialGlyph',
			'LyphRectangle',
			'LyphArtefact',
			'BorderLine',
			'CoalescenceRectangle',
			'NodeGlyph',
			'ProcessEdge',
			'MeasurableGlyph',
			'CausalityArrow'
		);
		expect(environment.classes).to.contain.relationships(
			'PrescribesStyleFor',
			'PresentsModel',
			'ContainsArtefact'
		);

	});
 
});
