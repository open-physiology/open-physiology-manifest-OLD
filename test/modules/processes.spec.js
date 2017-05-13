import {describe, it, expect, beforeEach} from '../test.helper';

import moduleFactory from '../../src/modules/processes';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'processes' Module", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Process'
		);
		expect(environment.classes).to.contain.relationships(
			'IsSourceFor',
			'HasTarget',
			'ConveysProcess',
			'TransportsMaterial',
			'HasSegment',
			'HasProcessChannel',
			'HasNodeChannel'
		);

	});

});
