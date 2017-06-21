import {describe, expect, it, beforeEach} from './test.helper';
import moduleFactory from '../src/index';


describe("regression tests", () => {

    let environment;
   	beforeEach(() => { environment = moduleFactory() });

    it("HasType[2] set to null? (pre-manifest-separation)", () => {
        const {Group, Lyph} = environment.classes;

        let lyph1 = Lyph .new();
        let lyph2 = Lyph .new();
        let group = Group.new();

        group.elements.add(lyph1);
        group.elements.add(lyph2);

        expect([...group.elements]).to.eql([lyph1, lyph2]);
    });

    it("trying to instantiate abstract class Has", () => {
        const {Lyph, HasPart} = environment.classes;

        let subLyph = Lyph.new({ name: 'Sublyph' });

        let layer1 = Lyph.new({ name: 'Vessel Wall' });

        let layer2 = Lyph.new({
            name: 'Blood Layer',
            parts: [ subLyph ]
        });

        let bloodVessel = Lyph.new({
            name: 'Blood Vessel',
            layers: [ layer1, layer2 ]
        });
        
        expect(() => { layer1.parts.add(subLyph) }).not.to.throw();
        
        expect([...layer1.parts])   .to.include(subLyph);
        expect([...layer1.children]).to.include(subLyph);
        expect([...subLyph.parents]).to.include(layer1);
        expect([...subLyph.parents]).to.include(layer2);
        expect(subLyph['<--HasPart'].size).to.equal(2);
        expect([...subLyph['<--HasPart']][0]).to.be.instanceOf(Lyph);
        expect([...subLyph['<--Has']][0])    .to.be.instanceOf(Lyph);

    });

    it("relationship mismatch", () => {
        const {Lyph, Type} = environment.classes;

        let blood = Lyph.new({ name: "Blood" });
        let bloodType = Type.new({ name: blood.name, definition: blood });
        blood.types.add(bloodType);

        expect(blood.types.size).to.equal(1);
        expect([...blood.types][0]).to.equal(bloodType);
    });
    
    it("export manually defined plural", () => {
        const {Process, Causality} = environment.classes;

        let process   = Process.new({ name: "Blood advection" });
        let causality = Causality.new({});

        expect(process.constructor).to.have.a.property('plural', "processes");
        expect(causality.constructor).to.have.a.property('plural', "causalities");
    });

    it("auto-synchronized border-natures?", async () => {

        const {Lyph, Border} = environment.classes;

        let lyph = Lyph.new({
            longitudinalBorders: [
                Border.new(),
                Border.new()
            ]
        });

        await new Promise((resolve) => { setTimeout(resolve, 10) });

        expect(new Set([
            [...lyph.longitudinalBorders][0].nature,
            [...lyph.longitudinalBorders][1].nature
        ]).size).to.equal(2);

        // To compare, this was the nature of the original bug.
        // The default value of properties was shared among entities:
        let singleArray = [];
        expect(new Set([
            singleArray,
            singleArray
        ]).size).to.equal(1);

    });
    
});
