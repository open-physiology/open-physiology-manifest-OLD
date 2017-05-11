import {describe, it, expect, beforeEach} from './test.helper';
import moduleFactory from '../src/index';
import {simpleMockHandlers}   from "./mock-handlers.helper";

describe("Entity classes", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
	it("can list its possible subclasses", () => {
		const {Resource, ExternalResource, Type, Lyph} = environment.classes;
		
		const resourceSubclasses = Resource.allSubclasses();
		
		expect([...resourceSubclasses]).to.contain(Resource);
		expect([...resourceSubclasses]).to.contain(ExternalResource);
		expect([...resourceSubclasses]).to.contain(Type);
		expect([...resourceSubclasses]).to.contain(Lyph);
	});
	
});
