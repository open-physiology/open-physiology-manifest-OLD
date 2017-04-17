import {describe, it, expect} from '../test.helper';
import moduleFactory from '../../src/modules/research';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'research' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Correlation',
			'ClinicalIndex',
			'Publication'
		);
		expect(environment.classes).to.contain.relationships(
			'InvolvesMeasurable',
			'EncompassesClinicalIndex',
			'InvolvesClinicalIndex',
			'InvolvesPublication'
		);

	});

});
