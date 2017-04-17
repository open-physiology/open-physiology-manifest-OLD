import {describe, it, expect} from '../test.helper';

import moduleFactory from '../../src/modules/typed';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'typed' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Type',
			'Template'
		);
		expect(environment.classes).to.contain.relationships(
			'IsSubtypeOf',
			'HasCardinalityMultipliedByThatOf',
			'HasType',
			'DefinesType'
		);

	});

});
