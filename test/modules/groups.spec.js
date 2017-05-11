import {describe, it, expect, beforeEach} from '../test.helper';
import moduleFactory from '../../src/modules/groups';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'groups' Module", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Group'
		);
		expect(environment.classes).to.contain.relationships(
			'IncludesElement'
		);

	});

});
