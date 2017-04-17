import {describe, it, expect} from '../test.helper';

import moduleFactory from '../../src/modules/canonicalTrees';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'canonicalTrees' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {
		
		expect(environment.classes).to.contain.resources(
			'CanonicalTree',
			'CanonicalTreeBranch'
		);
		expect(environment.classes).to.contain.relationships(
			'HasBranch',
			'BranchesTo',
			'IsConveyedBy'
		);
		
	});

});
