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
	
	it("has resources that can be deleted", () => {
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new({ name: 'A Lyph!' });
		let deleted;
		lyph.p('deleted').subscribe((d) => { deleted = d });
		
		expect(deleted).to.be.false;
		
		lyph.delete();
		
		expect(deleted).to.be.true;
	});
	
	it("has resources that can be placeholders", () => {
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new({ id: 1234 }, { isPlaceholder: true });
		let isPlaceholder;
		lyph.p('isPlaceholder').subscribe((p) => { isPlaceholder = p });
		
		expect(isPlaceholder).to.be.true;
		expect(lyph.id).to.equal(1234);
		expect(lyph.name).to.be.undefined;
		
		lyph.loadIntoPlaceholder({ name: "New Lyph" });
		
		expect(isPlaceholder).to.be.false;
		expect(lyph.id).to.equal(1234);
		expect(lyph.name).to.equal("New Lyph");
	});
	
});
