import {describe, it, expect} from '../test.helper';

import moduleFactory from '../../src/modules/lyphs';

import map from 'lodash-bound/map';
import {simpleMockHandlers} from "../mock-handlers.helper";

describe("'lyphs' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {
		
		expect(environment.classes).to.contain.resources(
			'Material',
			'Lyph',
			'Border',
			'Node',
			'CoalescenceScenario',
			'Coalescence'
		);
		expect(environment.classes).to.contain.relationships(
			'ContainsMaterial',
			'HasPart',
			'HasLayer',
			'HasPatch',
			'HasSegment',
			'HasBorder',
			'HasRadialBorder',
			'HasLongitudinalBorder',
			'ContainsNode',
			'JoinsLyph',
			'Coalesces',
			'CoalescesLike'
		);

	});

	it("exports classes that can be instantiated", async () => {
		
		const {
			Material,
			Lyph,
			Border
		} = environment.classes;
		
		let material = Material.new();
		let lyph     = Lyph.new();
		
		expect(material).to.be.an.instanceOf(Material);
		expect(lyph    ).to.be.an.instanceOf(Material, Lyph);
		
	});
 
	it("exports lyph type that can be given custom borders and axes", async () => {
		
		const {
			Lyph,
			Border,
			Has,
			HasBorder,
			HasLongitudinalBorder
		} = environment.classes;
		
		let lyph1 = Lyph.new({}, {
			createRadialBorders: 1
		});
		
		expect([...lyph1['-->HasBorder']]).to.have.a.lengthOf(1);
		
		expect([...lyph1.radialBorders]).to.have.a.lengthOf(1);
		expect([...lyph1.radialBorders][0]).to.be.an.instanceOf(Border);
		
		let lyph2 = Lyph.new({}, {
			createRadialBorders: 2,
			createAxis: true
		});
		
		expect([...lyph2['-->HasBorder']]).to.have.a.lengthOf(3);
		
		expect([...lyph2.radialBorders]).to.have.a.lengthOf(2);
		expect([...lyph2.radialBorders][0]).to.be.an.instanceOf(Border);
		expect([...lyph2.radialBorders][1]).to.be.an.instanceOf(Border);
		expect(lyph2.axis).to.be.an.instanceOf(Border);
		
	});
	
	it("exports classes that have the properties, relationships and relationshipShortcuts of their superclasses", () => {
		
		const {Lyph} = environment.classes;
		
		expect(Lyph.properties           ).to.have.property('id');
		expect(Lyph.relationships        ).to.have.property('-->ContainsMaterial');
		expect(Lyph.relationshipShortcuts).to.have.property('materials');
		
	});
	
	it("exports lyph classes that can have layers", () => {
		
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new();
		
		let layer1 = Lyph.new();
		let layer2 = Lyph.new();
		let layer3 = Lyph.new();
		
		lyph.layers.add(layer1);
		lyph.layers.add(layer2);
		lyph.layers.add(layer3);
		
		expect(new Set([...lyph['-->HasLayer']]::map('relativePosition')).size).to.equal(3);
		expect([...lyph['-->HasLayer']]::map('relativePosition')[0]).to.be.a('number');
		expect([...lyph['-->HasLayer']]::map('relativePosition')[1]).to.be.a('number');
		expect([...lyph['-->HasLayer']]::map('relativePosition')[2]).to.be.a('number');
		
	});
	
	it("exports lyph classes that can have segments", () => {
		
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new();
		
		let layer1 = Lyph.new();
		let layer2 = Lyph.new();
		let layer3 = Lyph.new();
		
		lyph.segments.add(layer1);
		lyph.segments.add(layer2);
		lyph.segments.add(layer3);
		
		expect(new Set([...lyph['-->HasSegment']]::map('relativePosition')).size).to.equal(3);
		expect([...lyph['-->HasSegment']]::map('relativePosition')[0]).to.be.a('number');
		expect([...lyph['-->HasSegment']]::map('relativePosition')[1]).to.be.a('number');
		expect([...lyph['-->HasSegment']]::map('relativePosition')[2]).to.be.a('number');
		
	});
	
	it("exports lyph classes that have icons", () => {
		const {Lyph} = environment.classes;
		expect(Lyph.icon).to.be.a('string');
	});
	
});
