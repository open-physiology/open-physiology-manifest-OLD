import {describe, it, expect, beforeEach} from '../test.helper';

import moduleFactory from '../../src/modules/lyphs';

import map from 'lodash-bound/map';
import {simpleMockHandlers} from "../mock-handlers.helper";

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
	
	it("exports classes that have the properties and relationships of their superclasses", () => {
		
		const {Lyph} = environment.classes;
		
		expect(Lyph.properties   ).to.have.property('id');
		expect(Lyph.relationships).to.have.property('-->ContainsMaterial');
		
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
