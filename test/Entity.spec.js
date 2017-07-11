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
		
		let lyph = Lyph.new({ name: "A Lyph!" });
		
		expect(lyph.deleted).to.be.false;
		expect(lyph.name).to.equal("A Lyph!");
		
		lyph.delete();
		expect(lyph.deleted).to.be.true;
		
		/* still sending signals after a deletion */
		lyph.p('name').next("A deleted lyph!");
		expect(lyph.name).to.equal("A deleted lyph!");
		
		/* can undelete */
		lyph.undelete();
		expect(lyph.deleted).to.be.false;
	});
	
	it("has resources that can be silenced", async () => {
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new({ name: "A Lyph!" });
		
		expect(lyph.silent).to.be.false;
		expect(lyph.name).to.equal("A Lyph!");
		
		lyph.silence();
		expect(lyph.silent).to.be.true;
		
		/* no longer sending signals after silencing */
		lyph.p('name').next("A silent lyph!");
		
		expect(lyph.name).to.equal("A Lyph!");
	});
	
	it("has resources that can be placeholders", () => {
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new({ id: 1234 }, { isPlaceholder: true });
		
		expect(lyph.isPlaceholder).to.be.true;
		expect(lyph.id).to.equal(1234);
		expect(lyph.name).to.be.undefined;
		
		lyph.loadIntoPlaceholder({ name: "New Lyph" });
		
		expect(lyph.isPlaceholder).to.be.false;
		expect(lyph.id).to.equal(1234);
		expect(lyph.name).to.equal("New Lyph");
	});
	
});
