import {beforeEach, describe, it, expect} from './test.helper';
import moduleFactory          from '../src/index';
import {simpleMockHandlers}   from './mock-handlers.helper';
import {map} from 'utilities';
import at    from 'lodash-bound/at';
import keyBy from 'lodash-bound/keyBy';


describe("integrated workflow", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
	it("can create new Materials and link them", async () => {
		const {Material, Type} = environment.classes;

		let water1 = Material.new({ name: "Water 1" });
		
		let waterType = Type.new({ definition: water1 });
		
		let water2 = Material.new({ name: "Water 2" });
		
		waterType.definition = water2;
		
		expect(water2.definedType).to.equal (waterType);
		expect([...water2.types]).to.include(waterType);
	});
	
});
