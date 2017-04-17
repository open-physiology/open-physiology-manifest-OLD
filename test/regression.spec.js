import {describe, expect} from './test.helper';
import moduleFactory from '../src/index';
import {simpleMockHandlers} from "./mock-handlers.helper";

import {filter}  from 'lodash-bound';
import cloneDeep from 'lodash-bound/cloneDeep';

describe("regression tests", () => {

    let environment, backend, frontend;
    beforeEach(() => {
        let registerEnvironment;
        ({backend, frontend, registerEnvironment} = simpleMockHandlers());
        environment = moduleFactory(frontend);
        registerEnvironment(environment);
    });

    it("HasType[2] set to null?", async () => {
        const {Group, Lyph, HasMaterial} = environment.classes;

        let lyph1 = Lyph.new();
        let lyph2 = Lyph.new();
        let group = Group.new();

        group.elements.add(lyph1);
        group.elements.add(lyph2);

        await lyph1.commit();
        await lyph2.commit();
        await group.commit();

        expect([...group.elements]).to.eql([lyph1, lyph2]);
    });

    it("setting type in initializer fails at commit", async () => {
        const {Lyph} = environment.classes;
        let t1 = Lyph.new({ name: "Renal hilum" });
        await t1.commit();
    });

    it("trying to instantiate abstract class Has", async () => {
        const {Lyph, HasPart} = environment.classes;

        let subLyph = Lyph.new(
            { name: 'Sublyph' },
            { createAxis: true, createRadialBorders: true }
        );

        let layer1 = Lyph.new(
            { name: 'Vessel Wall' },
            { createRadialBorders: true }
        );

        let layer2 = Lyph.new({
            name: 'Blood Layer',
            parts: [ subLyph ]
        }, { createRadialBorders: true });

        let bloodVessel = Lyph.new({
            name: 'Blood Vessel',
            layers: [ layer1, layer2 ]
        }, { createAxis: true, createRadialBorders: true });

        expect(() => { layer1.parts.add(subLyph) }).not.to.throw();

        expect([...layer1.parts])   .to.include(subLyph);
        expect([...layer1.children]).to.include(subLyph);
        expect([...subLyph.parents]).to.include(layer1);
        expect([...subLyph.parents]).to.include(layer2);
        expect([...subLyph['<--HasPart']][0]).to.be.instanceOf(HasPart);
        expect([...subLyph['<--Has']][0]).to.be.instanceOf(HasPart);

    });

    it("relationship mismatch", async () => {
        const {Lyph, Type} = environment.classes;

        let blood = Lyph.new({ name: "Blood" });
        let bloodType = Type.new({ name: blood.name, definition: blood });
        blood.types.add(bloodType);

        await expect(blood.commit()).to.be.fulfilled;
    });


    it("export manually defined plural", async () => {
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

        await new Promise((resolve) => { setTimeout(resolve, 1000) });

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

    it("commit causality resource", async () => {
        const {Measurable, Causality} = environment.classes;

        let measurable1 = Measurable.new({ name: "Concentration of water" });
        let measurable2 = Measurable.new({ name: "Concentration of ion"   });

        let causality1 = Causality.new({
            name:  "Functional dependency",
            cause:  measurable1,
            effect: measurable2
        });

        await expect(measurable1.commit()).to.be.fulfilled;
        await expect(measurable2.commit()).to.be.fulfilled;
        await expect(causality1 .commit()).to.be.fulfilled;
    });

    // TODO: We're now getting an error here (and only here) because of how the test is set up,
    //     : overwriting loadAll, but no other methods.
    //     : If this turns out to be an important test again, please rewrite it more cleanly using backend.create.
    it.skip("\"This graph does not have a vertex ''\" error when retrieving existing lyph with borders", async () => {

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                let results = [{
                    "thickness": {
                        "min": 0
                    },
                    "length": {
                        "min": 0
                    },
                    "name": "Renal hilum",
                    "id": 18,
                    "cardinalityBase": 1,
                    "class": "Lyph",
                    "<--Coalesces": [
                        {
                            "id":     83,
                            "class": "Coalesces"
                        }
                    ],
                    "<--IncludesElement": [
                        {
                            "id":     65,
                            "class": "IncludesElement"
                        }
                    ],
                    "-->DefinesType": {
                        "id":     55,
                        "class": "DefinesType"
                    },
                    "<--HasLayer": [
                        {
                            "id":     42,
                            "class": "HasLayer"
                        }
                    ],
                    "-->HasLongitudinalBorder": [
                        {
                            "id":     26,
                            "class": "HasLongitudinalBorder"
                        },
                        {
                            "id":     25,
                            "class": "HasLongitudinalBorder"
                        }
                    ]
                }];
                return results;
            }
        });
        const model = environment.classes;

        let lyphs = [...await model.Lyph.getAll()];

        expect(lyphs).to.have.length(1);
    });


    it("ReferenceError: RelShortcut$Field is not defined", async () => {

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                let results = [{
                    "thickness": {
                        "min": 0,
                        "max": null
                    },
                    "length": {
                        "min": 0,
                        "max": null
                    },
                    "name": "Renal hilum",
                    "id": 18,
                    "cardinalityBase": 1,
                    "class": "Lyph"
                }];
                return results;
            }
        });
        const model = environment.classes;

        let bla = await model.Lyph.getAll();
        // console.log('================================================================================');
        // console.log(bla);
        // console.log('--------------------------------------------------------------------------------');
        let lyphs = [...bla];
        let jsonLyphs = lyphs.map(lyph => lyph.toJSON());

        expect(lyphs).to.have.length(1);
    });

    it("Relationship resources in commit_new should have property 'class'", async () => {
        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                return [{
                    "name": "Kidney",
                    "id": 17,
                    "cardinalityBase": 1,
                    "class": "Lyph"
                }, {
                    "name": "Renal hilum",
                    "id": 18,
                    "cardinalityBase": 1,
                    "class": "Lyph"
                }];
            },
            async commit_new({commandType, values}) {
                values.id = 1;
                expect(values[1]).to.have.property('class');
                expect(values[2]).to.have.property('class');
                return values;
            },
        });
        const {Lyph, HasLayer} = environment.classes;

        let lyphs = [...await Lyph.getAll()];
        expect(lyphs).to.have.length(2);
        let hasLayer = HasLayer.new({ 1: lyphs[0], 2: lyphs[1]});
        await hasLayer.commit();
    });

    it("toJSON() should not fail on relationships", async () => {
        const {Lyph, HasLayer} = environment.classes;
        let lyph1 = Lyph.new({name: "Kidney"});
        let lyph2 = Lyph.new({name: "Kidney lobus"});
        let hasLayer = HasLayer.new({ 1: lyph1, 2: lyph2});
        expect(::hasLayer.toJSON).not.to.throw;
    });

    it("Resource should be committed together with its relationships", async () => {
        const {Lyph, HasLayer} = environment.classes;

        let heart = Lyph.new({name: "Heart"});
        await heart.commit();

        let body = Lyph.new({ name: "Body", layers: [heart] });
        await body.commit();

        expect(backend.readAll()).to.include.something.with.property('class', 'HasLayer');
    });

    it("Problem with id (was href) while committing resources with relationships", async () => {
        let UID = 0;

        let environment = moduleFactory({
            async commit_new({values}) {
                expect(values).not.to.be.null;
                values = values::cloneDeep();
                values.id = ++UID;
                let result = backend.create(values, values.id);
                return result;
            },
            async load(addresses, options = {}) {
                return addresses.map(addr => backend.read(addr)::cloneDeep());
            },
            async loadAll(cls, options = {}) {
                return backend.readAll().filter(e => cls.hasSubclass(cls.environment.classes[e.class]))::cloneDeep();
            }
        });

        const {Measurable, Causality, IsCauseOf} = environment.classes;

        let measurable = Measurable.new({ name:  "Concentration of water"});
        let causality = Causality.new({ name:   "Functional dependency", cause:  measurable});

        await measurable.commit();
        await causality.commit();

        let isCauseOf = [...await IsCauseOf.getAll()][0];
        expect(isCauseOf).to.have.property(1).which.is.not.null;
        expect(isCauseOf).to.have.property(2).which.is.not.null;
        expect(isCauseOf[1].id).to.equal(measurable.id);
        expect(isCauseOf[2].id).to.equal(causality .id);
    });

    it("Canonical tree nodes should not duplicate", async() => {
        const {CanonicalTree, CanonicalTreeBranch} = environment.classes;

        /* canonical trees */
        let initial = {};
        initial.canonicalTree1         = CanonicalTree.new({ name: "SLN"        });
        initial.canonicalTree1_2       = CanonicalTree.new({ name: "SLN tail 1" });
        initial.canonicalTreeBranch1_2 = CanonicalTreeBranch.new({
            name:       "SLN 1st level branch",
            parentTree: initial.canonicalTree1,
            childTree:  initial.canonicalTree1_2
        });

        await initial.canonicalTree1.commit();
        await initial.canonicalTreeBranch1_2.commit();

        let nodes    = backend.readAll()::filter(v => v.class === 'CanonicalTree');
        let branches = backend.readAll()::filter(v => v.class === 'CanonicalTreeBranch');
        expect(nodes.length).to.be.equal(2);
        expect(branches.length).to.be.equal(1);

    });

    it("Lyphs with axis extracted as resources", async() => {
        const {Lyph, Border, Resource} = environment.classes;

        let border1 = Border.new({name: "Border 1", nature: "open"});
        let border2 = Border.new({name: "Border 2", nature: "closed"});
        let heart = Lyph.new({name: "Heart", longitudinalBorders: [border1, border2], axis: border1});
        await border1.commit();
        await border2.commit();
        await heart.commit();

        //Note: the error most likely is in toJSON() because without map(x => x.toJSON()) the test passes
        let resources = [...await Resource.getAll()];
        let lyphs = resources.filter(x => x.class === "Lyph").map(x => x.toJSON());
        expect(lyphs).to.have.length(1);
        expect(lyphs[0]).to.have.property('-->HasLongitudinalBorder');
        let borderRels = [...lyphs[0]['-->HasLongitudinalBorder']];
        expect([...lyphs[0]['-->HasLongitudinalBorder']]).to.have.length(1);
        expect(lyphs[0]['-->HasAxis']).to.not.be.null;
    });

    it("Some related relationship expectations", async () => {
        const {Lyph, Border, Resource} = environment.classes;

        let border1 = Border.new({name: "Border 1", nature: "open"});
        let border2 = Border.new({name: "Border 2", nature: "closed"});
        let heart = Lyph.new({name: "Heart", longitudinalBorders: [border2], axis: border1});
        await heart.commit();

        expect(backend.readAll().filter(x => x.class === 'Lyph')).to.have.length(1);
        expect(backend.readAll().filter(x => x.class === 'HasAxis')).to.have.length(1);
        expect(backend.readAll().filter(x => x.class === 'HasLongitudinalBorder')).to.have.length(1);
        expect(backend.readAll().filter(x => x.class === 'Border')).to.have.length(2);
    });

    it("Constraint violation while reconstructing resources", async () => {
    	
	    backend.create({
           name: 'Blood',
           id: 2,
           class: 'Type',
           '<--DefinesType': { id: 3, class: 'DefinesType' }
        });
	    backend.create({
            name: 'Blood',
            id: 1,
            class: 'Material',
            '-->DefinesType': {id: 3, class: 'DefinesType'}
        });
	    backend.create({
		    id: 3,
		    class: 'DefinesType',
            [1]: {
               id:  1,
               class: 'Material',
            },
            [2]: {
               id:  2,
               class: 'Type',
            }
	    });

        const model = environment.classes;

        let resources = [...await model.Resource.getAll()];
        expect(resources).to.have.length(2);
    });

    it("Layers are lost", async () => {
        let lyph1 = {
            "name": "Blood",
            "id": 1,
            "class": "Lyph",
            "-->HasLayer": [
                {
                    "id": 3,
                    "class": "HasLayer"
                }
            ]
        };
        let lyph2 = {
            "name": "Cytosol",
            "id": 2,
            "class": "Lyph",
            "<--HasLayer": [
                {
                    "id": 3,
                    "class": "HasLayer"
                }
            ],
        };
        let rel = {
            "id": 3,
            "class": "HasLayer",
            "1": {
                "id": 1,
                "class": "Lyph"
            },
            "2": {
                "id": 2,
                "class": "Lyph"
            }
        };

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                if (cls.name === "Lyph"){
                    return [lyph1, lyph2]
                }
                if (cls.name === "HasLayer"){
                    return [rel];
                }
            },
            async load(addresses, options = {}) {
                let response = [];
                for (let address of Object.values(addresses)){
                    if (address.id === 1){ response.push(lyph1); }
                    if (address.id === 2){ response.push(lyph2); }
                    if (address.id === 3){ response.push(rel);   }
                }
                return response;
            },
        });

        const {Lyph} = environment.classes;
        let mainLyph = await Lyph.get(1);
        expect(mainLyph).to.have.property('-->HasLayer');
        expect([...mainLyph['-->HasLayer']]).to.have.length(1);
    });

    it("Investigation performance issue - something fails", async () => {
        let r1 = {
            "name": "Kidney",
            "id": 30,
            "class": "Lyph",
            "-->HasLongitudinalBorder": [
                {"id": 36, "class": "HasLongitudinalBorder"}]
        };

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                return [r1];
            },
            async load(addresses, options = {}) {
                return [r1];
            }
        });

        const {Lyph} = environment.classes;
        let lyph = await Lyph.get(30);
        let border = [...lyph['-->HasLongitudinalBorder']][0];
        expect(border).not.to.be.undefined;
        expect(border).to.have.property('id');
        expect(border.id).not.to.be.undefined;
    });

    it("Types are missing <--DefinesType relationship", async () => {
        let r1 = {
            "name"  : "Renal parenchyma type",
            "id"    :46,
            "class" :"Type",
            "<--DefinesType" : {
                "id": 47,
                "class":"DefinesType"
            }
        };

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                return [r1];
            },
            async load(addresses, options = {}) {
                return [r1];
            }
        });

        const {Type} = environment.classes;
        let type = await Type.get(46);
        let definition = type['<--DefinesType'];
        expect(definition).not.to.be.undefined;
        expect(definition).not.to.be.null;
        expect(definition).to.have.property('id');
        expect(definition.id).not.to.be.undefined;
    });

    it("CanonicalBranches are missing links to parent and child tree", async () => {

        let r1 = {
            "name":"SLN 1st level branch",
            "id":62,
            "cardinalityBase":1,
            "class":"CanonicalTreeBranch",
            "-->IsConveyedBy": { "id": 65, "class":"IsConveyedBy"},
            "-->BranchesTo":   { "id": 64, "class":"BranchesTo"},
            "<--HasBranch":    { "id": 63, "class":"HasBranch"}
        };

        let environment = moduleFactory({
            async loadAll(cls, options = {}) {
                return [r1];
            },
            async load(addresses, options = {}) {
                return [r1];
            }
        });

        const {CanonicalTreeBranch} = environment.classes;
        let ctb = await CanonicalTreeBranch.get(62);
        let rels = [ctb["-->IsConveyedBy"], ctb["-->BranchesTo"], ctb["<--HasBranch"]];
        for (let rel of rels){
            expect(rel).not.to.be.undefined;
            expect(rel).not.to.be.null;
            expect(rel).to.have.property('id');
            expect(rel.id).not.to.be.undefined;
        }

    });

    it("Parameter with incorrect class does not cause exception", async () => {
        const {Lyph, Material} = environment.classes;

        let material1 = Material.new({name: "Blood"});
        await material1.commit();

        //materials expects parameter of class 'Type'
        let lyph1 = Lyph.new({name: "Heart", materials: [material1]});
        await expect(lyph1.commit()).to.be.rejected;
        // NOTE: Why did the test above expect the commit() promise to be fulfilled,
        //     : while it was already known that a different class was expected?
        //     : The promise is rejected, and should be, so I changed the expectation.
        //     : If not, please clarify.
    });
});
