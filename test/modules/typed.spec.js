import {describe, it, expect, beforeEach} from '../test.helper';

import moduleFactory from '../../src/modules/typed';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'typed' Module", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
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
