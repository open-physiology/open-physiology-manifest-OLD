import TypedModule     from '../TypedModule';

import resources from './resources';
import typed     from './typed';
import lyphs     from './lyphs';
import processes from './processes';
import {dimensionalitySchema} from "../util/schemas";


export default TypedModule.create('measurables', [
	resources, typed, lyphs, processes
], (M, {
	Resource, IsRelatedTo, Template,
	Lyph, Material, Border, Node,
	Process, Has, PullsIntoTypeDefinition
}) => {
	
	
	const Measurable = M.TYPED_RESOURCE({///////////////////////////////////////
		
		name: 'Measurable',
		
		extends: Template,
		
		singular: "measurable",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAdCAIAAABE/PnQAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH4QQDEQM2D4pktAAAA01JREFUSMfNVltsVFUUXWuf++jQsZVHfLRpBZSAqamhgYRGTaQx0cQY6od8EKIJD2NSo0kbAoUYQT404YcPSNOAiT+mP3xgVNIoCm20MuIPLQqi4EggEEOs8hBm7j1n+zEMmabTO1OsCSfn656zz1pn7X3WvlTVgcHh9z785JeL4woBFP95GKeLmuZuW9e55oV2Hhw61tm9l2EKajkTpwOA0tGDc0P93SbrNV4cvyUaTbWZUIE6KiZNUQeasjGEU+GXh4fM5ZqFOjVvAo6eRpFGFrErnZKLEKaJPCDlY2mvRcZzKgnKKKDKzWuf++DtV29GOVEDaET6Nh9JeF/baqmrn1ooIavIKoHdB0aef2NHyg9D3wS+lzY6MPhNyyubUD+XWiHcq5gw0Tiy/GJ4FICCgALe4LGx83/8beiUJpmiVFERALR4iAIAFTAAqilrwf887kkAva0cZxQgHZZCzK6vg7oZA3CKra+tcihyJvt616f8qmINm5ZW3OQzf6T/HQIgi7TczX+uD584b+CUSVpR2tdVoA/z8vLGx5vmqWLOrLCnawNUAZCsW7HmBmtBd/cABFzsosx+UxTzTtnT5fZ9lnn9/Y9F7N3nwAFH+npI0YIvlSxZU7Nx1TMPpsFEiZJyIKoaR08233989NR3P5xobVnie6aEmipkWcuCjz7PkD5gp+dFBGJJnT6wffEjzYUv8URfK/jSymVPPPZAbfbKnw7+9CRykNZ5dlFTIwBVuIL7lKlg/ap/s+qs6efAxTt738z8+Ou3Y6fHr16fypYJND/8UEtDTaHLVSuRAk+3Pvri8iWOEAWSXUF1ZGDXnJVd1tmqbqAQyd863NerxqN4IkZEEq2Jtb7X0bbQlqMr5YrHdbS3nTxzbvTUmZM/n02uwjsYn+7uSftukn7lAGw+1726Ix0E6SCs9b0qHdYzWLygoVRMQgF6njGxnahdEBz9frTjrbWBb4rmVvkSv13+68KlK6Vv0ZLG5vjU+neP/5SN4ZWuqUJvXJ0/vyEIAoFLFscpf89m80xJ4E+UGrNTwoNHM51b9htaLfNj46CQRN9XUklooT9P9GDw631bqGoPjYy91LXTIQTjyVmaXqO7/YZMaKJDe3qfXbH0Xwd+XDVfm2gVAAAAAElFTkSuQmCC',
		
		properties: {
			'quality': {
				type: 'string',
				isRefinement(a, b) {
					return !a || a === b;
				}
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	  
	const MeasuresMaterial = M.RELATIONSHIP({
		
		name: 'MeasuresMaterial',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "measures material",
		
		1: [Measurable,    '0..*', { anchors: true, key: 'materials' }],
		2: [Material.Type, '0..*',                                    ],
		
		properties: {
			'dimensionality': { ...dimensionalitySchema }
		},
		
	});
	
	
	const MeasurableLocation = M.TYPED_RESOURCE({///////////////////////////////
		
		name: 'MeasurableLocation',
		
		abstract: true,
		
		extends: Template,
		
		extendedBy: [Lyph, Border, Node, Process],
		
		singular: "measurable location"
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const HasMeasurable = M.RELATIONSHIP({
		
		name: 'HasMeasurable',
		
		extends: Has,
		
		singular: "has measurable",
		
		1: [MeasurableLocation, '0..*', { anchors: true, sustains: true, key: 'measurables' }],
		2: [Measurable,         '0..*', {                                key: 'locations'   }],
		
		// TODO: maybe... auto-create classes for the inverse of relationships,
		//     : so that HasMeasurable_inverse can extend PullsIntoTypeDefinition
		
	});
	
	
	const Causality = M.TYPED_RESOURCE({////////////////////////////////////////
		
		name: 'Causality',
		
		extends: Template,
		
		singular: "causality",
		plural:   "causalities",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDERAXIgw1eAAABShJREFUWMO1l11sU2UYx3/n9Kxdx9ptjnYw2AYbbIPNCBvOqAEuCBFyAE2MUYNwI5GAMb0gGk3QRBONF0YpF9xA/DYxUSLiaowIJApKtmWJbG6MDYSOZR1s7T66j36cc7w4b2GbO1tHxj9tepLT9/0/7/M+H/9HIh34AwrgADYB24A6oAzIAyQgDHQBjUC9+I3iU5NiPfjUGbeWLAjNBf6ADagCdgMHABfpIQwcB74CruJTE/gD5ptphkizkC8RpK8C+dwfhoEjwAl8avdM3pCmkUv4VAN/oA74GHiShcEfwCF8auP0F/K0kxv4A1uBkwtIDrAROIk/8OhdrikeuOf2OkG+nAeDAWA9PrU7xSlN8sAS4PsFPvlMaBVGJPEHxBWY0X4gbXID0A3zO39UAx+lMiIVA1Ui2tNCbmYG1R43NUtycCry/RhxEH+gxgxCs8jsTjfVZAm2Fi/m9M5aXq8tJdeRIbxiQDwJCQ00fa5tFOBw6sEh3J8mJNx2haJsJ7/3RBiOm8Wu2O3kcN1qbg6P0zE4yg9dITTDsN4EavEHqmSRIq4573zSZn1jcfadbcFtV9hW4gVgJK6xKieLN2pL6R4Zn408BQ+wRQG2W/5F09lbXcTmwnzWe92829DJj50h6q+FQNe52Bvmu+01/Hg9RI5DYXm2k6FYkoq8bJr6htAxEJ+Z4ATqFNFYLBwl0ToQ5b3HyilyZdLcNwSyhCxJ6LJEV98Qweg420o8/HLzDjt/aqRvLE51vouXKpeR1A3aI1GaQ4Nm8MyQEYroatYRb1c41hJkhTsTT5aDrAwb+6qKCcfi1F+/zdftPexaWUB9Zy8dA1FIaqxZvZQjm9YQ03R2nG4S1zejAcWyaKmWodIdnSASi5OfaUfTDcYSGnsql/Hy2iIMoCUcpTJvkelnWQJZIjvDxqdtt2gIDWFgWPVcALfCbK/FnjtWeOkZjdE1NMrjS017o4kkZTlZNN8ZZlGGYkaqYYAk8c2VHnRAXeHlxfJC/gr2gyxb5mNYROSMMdDRP8Kxyzd5obyQ8aTO2WA/JZ+dQzMMkprBOq+bwXgCkKh4KJuKvGzO3xpgZCzOM2UFnLoWAsmyWA0rQsl4rF0g82t3P59sqsLrtBOKThAzdNNvms7D+S7awlEWu518vvURIhMJNhbmkeewY5Phi8tByLBZ7R6UhXyare5gxDWOXb7B0c1rUUsL8GbZTXcnNZ4qXsxvwX4cNolILMHpf29T482ha2iUXaeaZiMHaJWFhpsdNpkLvRFW5S5iQ0EOb24og6ROXYmH58sL6Roco28szpftPZS4nOw/18KHl65apV4KE0BDygPhudpfpmJD0w2uRKJU57tYme9id2UhB8//g3/zWpKxBN929PDWxSt0RUZBsc11rH7gjAxEhYBktji41Bvh6N83WOdxs/9cK7kOBY/TTiQWpyKVhpJkxoYkpdPQm/Cp7SlFVAX8CbjnXIaZamgGz1UW8nSpl/cbr9M+MJwO8WT3b8SnNqUMyBDt8Z15dXVNN0WJIs+HHOA4PvUVUxGZ2iwBnAAuzMsAm2xG+fzIm4HX7qliU4widPshoPsB6sFOYA8+NZYSpVNLlE9tAJ4V6vVBkO/Fp7ZNHk6k/01E5nMR8LMQkAuBZnHyNuvB5B556jrWA34ggaWmmDNnJkRsPXH35PMaTs3nGuBtoEb0DGcaKdYPNAEf3B3HLCZkaZaRfOoCs1ZsEQqqGiieVDeGgaAYOhqAM/jU9iljmMV4/h8kKvAQPrXYMwAAAABJRU5ErkJggg==',
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const IsCauseOf = M.RELATIONSHIP({
		
		name: 'IsCauseOf',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "is cause of",
		
		1: [Measurable, '0..*', {                key: 'effects' }],
		2: [Causality,  '1..1', { anchors: true, key: 'cause'   }],
		
	});
	
	const HasEffect = M.RELATIONSHIP({
		
		name: 'HasEffect',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "has effect",
		
		1: [Causality,  '1..1', { anchors: true, key: 'effect' }],
		2: [Measurable, '0..*', {                key: 'causes' }],
		
	});


});

