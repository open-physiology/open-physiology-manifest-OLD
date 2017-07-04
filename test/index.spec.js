import {
	chai,
	sinon,
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';

import moduleFactory from '../src/index.js';


describe("the open-physiology-manifest", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
	it("provides access to all Field classes", () => {
		const {Field, RelField, Rel$Field, Rel1Field, PropertyField} = environment;
		expect(Field).to.be.instanceOf(Function); // constructor
		expect(RelField).to.be.a.subclassOf(Field);
		expect(Rel1Field).to.be.a.subclassOf(Field, RelField);
		expect(Rel$Field).to.be.a.subclassOf(Field, RelField);
		expect(PropertyField).to.be.a.subclassOf(Field);
	});
	
});
