import {describe, it, expect, beforeEach} from '../test.helper';

import moduleFactory from '../../src/modules/lyphs';

describe("'lyphs' Module", () => {
	
	let environment;
	beforeEach(() => { environment = moduleFactory() });
	
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

	it("exports classes that can be instantiated", () => {
		
		const {Material, Lyph} = environment.classes;
		
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
		
		let lyph1 = Lyph.new({
			radialBorders: [ Border.new() ]
		});
		
		expect([...lyph1['-->HasBorder']])            .to.have.a.lengthOf(1);
		expect([...lyph1['-->HasRadialBorder']])      .to.have.a.lengthOf(1);
		expect([...lyph1['-->HasLongitudinalBorder']]).to.have.a.lengthOf(0);
		expect([...lyph1.radialBorders])              .to.have.a.lengthOf(1);
		
		expect([...lyph1.radialBorders][0]).to.be.an.instanceOf(Border);
		
		let lyph2 = Lyph.new({
			radialBorders: [ Border.new(), Border.new() ],
			axis:            Border.new()
		});

		expect([...lyph2['-->HasBorder']]).to.have.a.lengthOf(3);
		expect([...lyph2.radialBorders])  .to.have.a.lengthOf(2);
		expect([...lyph2.radialBorders][0]).to.be.an.instanceOf(Border);
		expect([...lyph2.radialBorders][1]).to.be.an.instanceOf(Border);
		expect(lyph2.axis)                 .to.be.an.instanceOf(Border);
		
	});
	
	it("exports classes that have the properties and relationships of their superclasses", () => {
		
		const {Lyph} = environment.classes;
		
		expect(Lyph.properties   )        .to.have.property('id');
		expect(Lyph.relationships)        .to.have.property('-->ContainsMaterial');
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
		
		const layers = [...lyph['-->HasLayer']];
		expect(layers.length).to.equal(3);
		expect(layers[0]).to.be.instanceOf(Lyph);
		expect(layers[1]).to.be.instanceOf(Lyph);
		expect(layers[2]).to.be.instanceOf(Lyph);
		
	});
	
	it("exports lyph classes that can have segments", () => {
		
		const {Lyph} = environment.classes;
		
		let lyph = Lyph.new();
		
		let segment1 = Lyph.new();
		let segment2 = Lyph.new();
		let segment3 = Lyph.new();
		
		lyph.segments.add(segment1);
		lyph.segments.add(segment2);
		lyph.segments.add(segment3);
		
		const segments = [...lyph['-->HasSegment']];
		expect(segments.length).to.equal(3);
		expect(segments[0]).to.be.instanceOf(Lyph);
		expect(segments[1]).to.be.instanceOf(Lyph);
		expect(segments[2]).to.be.instanceOf(Lyph);
		
	});
	
	it("exports lyph classes that have icons", () => {
		const {Lyph} = environment.classes;
		expect(Lyph.icon).to.be.a('string');
	});
	
});
