import {describe, it, expect, beforeEach} from '../test.helper';

import moduleFactory from '../../src/modules/canonicalTrees';
import {simpleMockHandlers} from "../mock-handlers.helper";


describe("'canonicalTrees' Module", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
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
