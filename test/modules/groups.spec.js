import {describe, it, expect} from '../test.helper';
import moduleFactory from '../../src/modules/groups';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'groups' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'Group'
		);
		expect(environment.classes).to.contain.relationships(
			'IncludesElement'
		);

	});

});
