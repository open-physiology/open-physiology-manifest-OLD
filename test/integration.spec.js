import {describe, it, expect} from './test.helper';
import moduleFactory          from '../src/index';
import {simpleMockHandlers}   from './mock-handlers.helper';
import {map} from 'lodash-bound';
import at    from 'lodash-bound/at';
import keyBy from 'lodash-bound/keyBy';


describe("integrated workflow", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("can track available entities with a stream per class", async () => {

		const {Resource, Template, Material} = environment.classes;

		let gathered_Materials  = new Set;
		let gathered_Templates  = new Set;
		let gathered_Resources  = new Set;
		let committed_Materials = new Set;
		let committed_Templates = new Set;
		let committed_Resources = new Set;

		Material.p('all')         .subscribe((all) => { gathered_Materials  = all });
		Template.p('all')         .subscribe((all) => { gathered_Templates  = all });
		Resource.p('all')         .subscribe((all) => { gathered_Resources  = all });
		Material.p('allCommitted').subscribe((all) => { committed_Materials = all });
		Template.p('allCommitted').subscribe((all) => { committed_Templates = all });
		Resource.p('allCommitted').subscribe((all) => { committed_Resources = all });

		expect([...gathered_Materials]).to.eql([]);
		expect([...gathered_Templates]).to.eql([]);
		expect([...gathered_Resources]).to.eql([]);

		let blood = Material.new({
			name: "blood"
		});

		expect([...committed_Materials]).to.eql([]);
		expect([...committed_Templates]).to.eql([]);
		expect([...committed_Resources]).to.eql([]);
		expect([...gathered_Materials ]).to.eql([blood]);
		expect([...gathered_Templates ]).to.eql([blood]);
		expect([...gathered_Resources ]).to.eql([blood]);

		await blood.commit();

		expect([...committed_Materials]).to.eql([blood]);
		expect([...committed_Templates]).to.eql([blood]);
		expect([...committed_Resources]).to.eql([blood]);

		let water = Material.new({
			name: "water"
		});

		expect([...committed_Materials]).to.eql([blood]);
		expect([...committed_Templates]).to.eql([blood]);
		expect([...committed_Resources]).to.eql([blood]);

		expect([...gathered_Materials]).to.eql([blood, water]);
		expect([...gathered_Templates]).to.eql([blood, water]);
		expect([...gathered_Resources]).to.eql([blood, water]);

		await water.commit();

		expect([...committed_Materials]).to.eql([blood, water]);
		expect([...committed_Templates]).to.eql([blood, water]);
		expect([...committed_Resources]).to.eql([blood, water]);

	});

	// TODO: rollback no longer works after fixing other bug; this needs to be fixed
	it.skip("can create new Materials and link them", async () => {
		const {Material, ContainsMaterial, Type} = environment.classes;

		let blood = Material.new({
			name: "blood"
		});

		expect(blood).to.be.an.instanceOf(Material);
		expect(blood).to.have.a.property('id').which.is.null;
		expect(blood).to.have.a.property('class', 'Material');
		expect(blood).to.have.a.property('name', "blood");

		await blood.commit();

		expect(blood).to.have.a.property('id').which.is.a('number');

		let water = Material.new({
			name: "waiter"
		});
		
		let waterType = Type.new({
			definition: water
		});
		
		expect(waterType).to.be.instanceOf(Material.Type);
		expect(water).to.be.an.instanceOf(Material);
		expect(water).to.have.a.property('name', "waiter");
		expect(waterType).to.have.a.property('definition', water);

		water.name = "water";

		expect(water).to.have.a.property('name', "water");

		water.rollback(); // NOTE: rolls back the creation of `water` too
		
		// TODO: verify that `water` was removed
		
		expect(waterType).to.have.a.property('definition').which.is.null;
		
		let newWater = Material.new({
			name: "water"
		});
		
		waterType.definition = newWater;

		// debugger;
		
		await newWater.commit();
		await waterType.commit();

		expect(newWater).to.have.a.property('id').which.is.a('number');
		expect(newWater).to.have.a.property('name', "water");

		const {
			id:   waterId2,
			name: waterName2
		} = newWater;

		newWater.rollback();

		expect(newWater).to.have.a.property('id',   waterId2  );
		expect(newWater).to.have.a.property('name', waterName2);

		let bloodHasWater = ContainsMaterial.new({
			1: blood,
			2: waterType
		});

		expect(bloodHasWater).to.have.property(1, blood);
		expect(bloodHasWater).to.have.property(2, waterType);
		expect([...blood    ['-->ContainsMaterial']]).to.include(bloodHasWater);
		expect([...blood    .materials            ] ).to.include(waterType    );
		expect([...waterType['<--ContainsMaterial']]).to.include(bloodHasWater);

		expect(bloodHasWater).to.have.a.property('id').which.is.null;
		expect(bloodHasWater).to.have.a.property('class', 'ContainsMaterial');

		await bloodHasWater.commit();
	
		expect(bloodHasWater).to.have.a.property('id').which.is.a('string');

	});

	// TODO: fix bug that occurs on rollback
	
	it.skip("can create new Materials and link them (simpler)", async () => {
		const {Material, ContainsMaterial, Type} = environment.classes;

		let water1 = Material.new({ name: "Water 1" });
		
		let waterType = Type.new({ definition: water1 });
		
		water1.rollback();
		
		let water2 = Material.new({ name: "Water 2" });
		
		await water2.commit();
		
		waterType.definition = water2;
		
		await waterType.commit();
		
	});
	
	it("can retrieve an existing entity from the backend (1)", async () => {
		const {Material} = environment.classes;
		
		let {id} = backend.create({
			class: 'Material',
			name: "Created Material"
		});
		expect(backend.readAll()).to.have.length(1);
		
		let material = await Material.get(id);
		
		expect(material).to.be.instanceof(Material);
		expect(material.id  ).to.equal(id);
		expect(material.name).to.equal("Created Material");
	});
	
	it("can retrieve an existing entity from the backend (2)", async () => {
		const {Template, Material} = environment.classes;
		
		let {id} = backend.create({
			class: 'Material',
			name: "Created Material"
		});
		expect(backend.readAll()).to.have.length(1);
		
		let material = await Template.get(id);
		
		expect(material).to.be.instanceof(Material);
		expect(material.id).to.equal(id);
		expect(material.name).to.equal("Created Material");
	});
	
	it("can retrieve all existing entities from the backend (1)", async () => {
		const {Material} = environment.classes;

		let {id} = backend.create({
			class: 'Material',
			name: "Created Material"
		});
		expect(backend.readAll()).to.have.length(1);

		let allMaterials = [...await Material.getAll()];

		expect(allMaterials).to.have.length(1);
		
		let lyph = allMaterials[0];
		expect(lyph).to.be.instanceof(Material);
		expect(lyph.id).to.equal(id);
		expect(lyph.name).to.equal("Created Material");

	});
	
	it("can retrieve all existing entities from the backend (2)", async () => {
		const {Template, CanonicalTree, Material} = environment.classes;

		let { id: id1 } = backend.create({
			class: 'Material',
			name: "Created Material"
		});
		let { id: id2 } = backend.create({
			class: 'CanonicalTree',
			name: "Created Canonical Tree"
		});
		expect(id1).to.not.equal(id2);
		expect(backend.readAll()).to.have.length(2);
		
		let allTemplates = [...await Template.getAll()];

		expect(allTemplates).to.have.length(2);
		
		let template1 = allTemplates.filter(t=>t.id===id1)[0];
		expect(template1).to.be.instanceof(Material);
		expect(template1.name).to.equal("Created Material");
		
		let template2 = allTemplates.filter(t=>t.id===id2)[0];
		expect(template2).to.be.instanceof(CanonicalTree);
		expect(template2.name).to.equal("Created Canonical Tree");
	});
	
	//// TODO: This test failed because of isPlaceholder,
	////     : which doesn't belong in the manifest lib
	// it("accepts id in a reference", async () => {
	// 	const {Lyph} = environment.classes;
	//
	// 	let { id: id1 } = backend.create({
	// 		class: 'Lyph',
	// 		name:  "Lyph 1"
	// 	});
	// 	let { id: id2 } = backend.create({
	// 		class: 'Lyph',
	// 		name:  "Lyph 2"
	// 	});
	//
	// 	let parentLyph = Lyph.new({
	// 		name: "Parent Lyph",
	// 		parts: [
	// 			{ id: id1, class: 'Lyph' },
	// 			{ id: id2, class: 'Lyph' }
	// 		]
	// 	});
	//
	// 	let childLyphs = [...parentLyph.parts];
	// 	expect(childLyphs::map('id'))
	// 		.to.have.length(2).and
	// 		.to.have.members([id1, id2]);
	//
	// 	let [ph1, ph2] = childLyphs::keyBy('id')::at([id1, id2]);
	//
	// 	expect(ph1.isPlaceholder).to.be.true;
	// 	expect(() => ph1.name).to.throw;
	// 	let entity1 = await Lyph.get(id1);
	// 	expect(entity1).to.equal(ph1);
	// 	expect(entity1.name).to.equal("Lyph 1");
	// 	expect(entity1.isPlaceholder).to.be.false;
	//
	// });
	
	it("automatically creates certain command dependencies", async () => {
		const {Lyph, Border} = environment.classes;
		
		expect(backend.readAll()).to.have.length(0);
		
		let lyph = Lyph.new({
			name: "Lyph"
		});
		
		expect(backend.readAll()).to.have.length(0);
		
		await lyph.commit();

		expect(backend.readAll()).to.have.length(1);
		// ⬑ 1 lyph // TODO: note, no longer auto-creating longitudinal borders
	});
	
	it("can load either one or multiple entities per request", async () => {
		const {Material} = environment.classes;
		
		let { id: id1 } = backend.create({
			class: 'Material',
			name:  "Material 1"
		});
		let { id: id2 } = backend.create({
			class: 'Material',
			name:  "Material 2"
		});
		let { id: id3 } = backend.create({
			class: 'Material',
			name:  "Material 3"
		});
		
		let material1 = await Material.get(id1);
		expect(material1)
			.is.an.instanceof(Material)
			.with.property('name', "Material 1");
		
		let [material2, material3] = await Material.get([id2, id3]);
		expect(material2)
			.is.an.instanceof(Material)
			.with.property('name', "Material 2");
		expect(material3)
			.is.an.instanceof(Material)
			.with.property('name', "Material 3");
	});
	
	it("can accept an id when first creating an entity, but expects this id to remain consistent at commit");
	
	// TODO: delete operation
	it.skip("can delete a resource", async () => {
		const {Lyph} = environment.classes;

		let { id } = backend.create({
			class: 'Lyph',
			name:  "Lyph 1"
		});

		let lyph = await Lyph.get(id);
		
		expect(lyph.id).to.equal(id);

		expect(Lyph.hasLocal(id)).to.be.true;
		
		lyph.delete();
		
		expect(Lyph.hasLocal(id)).to.be.false;
	});
	
});
