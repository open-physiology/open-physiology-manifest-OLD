import TypedModule from '../TypedModule';
import {
	normalizeToRange
} from '../util/misc';
import {
	enumArraySchema
} from '../util/schemas';

import resources from './resources';
import typed     from './typed';
import {universalDistanceRange} from "../util/schemas";
import {wrapInArray} from "../util/misc";

import _union from 'lodash/union';

import defaults from 'lodash-bound/defaults';
import isUndefined from 'lodash-bound/isUndefined';
import assign from 'lodash-bound/assign';
import max from 'lodash-bound/max';
import map from 'lodash-bound/map';
import {typedDistributionSchema} from "../util/schemas";
import {Field} from '../fields/Field';

import {$$value} from '../fields/symbols';

export default TypedModule.create('lyphs', [
	resources, typed
], (M, {
	Resource, IsRelatedTo, Template, PullsIntoTypeDefinition, Has
}) => {
	
	const Material = M.TYPED_RESOURCE({/////////////////////////////////////////
		
		name: 'Material',
		
		extends: Template,
		
		singular: "material",
		
		icon: 'data:image/png;base64,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'
		
	});/////////////////////////////////////////////////////////////////////////
	
	 
	const ContainsMaterial = M.RELATIONSHIP({
		
		name: 'ContainsMaterial',
		
		extends: IsRelatedTo,
		
		singular: "has material",
		
		1: [Material,      '0..*', { anchors: true, key: 'materials' }],
		2: [Material.Type, '0..*'                                     ],
		
		noCycles: true
		
	});
	
	
	const Lyph = M.TYPED_RESOURCE({/////////////////////////////////////////////
		
		name: 'Lyph',
		
		extends: Material,
		
		singular: "lyph",
		
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQsDkeAqnwAABOBJREFUWMPtl0tsVUUYx3/zOI+e3j4pLVChFJHw1tgQH4QQjRESF4ZoTJS4MyYmuDXRRBbGqAuJG0iMGDcYYuLChSYiEMWAEhBixEJsCy1toS23D7jc17nnNS5uqaXIrSjETWdxZvIt5v/7HjPfHMEswxgjvt/zoNeysq3ZxMnmzFB6Y6lQXKe0btOu3SiksDEESRxPGEy/5Tidbo13TCCO+LncaN2ipsKqzV+b2+0vKomf/uqpB8b7h7Y23Ne8vZjJPaIsRUNrC3a1QynvExR8MAaEQWmNVIqwFBDkixgEUokTQoj9CHNgw3NHu/8xgDFGHN6zbofWekfLirYVo32XaF19P6V8gfT5QUq5AkJJpJQIKVGORiuN0ArtWNiugzEGYwxxGKEs3S2E2Nux7YcPZ2qpmYag+LY6/vkb72hLv79ozbJ5F0+eZc3Tj9H14yn6TnaSH7tGUPCJgpAkjMpCSTnCQkqkKkMJJYn8ADflUbyen6dt/cRr25c3qwO9B3/xMbeNQNfRbVsGfu06sOThVfSfOsuGF7Zw6KN9+Nk8TspD2xbKsbEcC23baMdCOxaWbd9sd20whtG+yzQvX8yVnn7qFjSRRNGLHduOfHFDT88EmBgY+aCmuYHR3kHWP7OJn/d9Q+CX8BpqJzcuC1iOhZqcyxD2NKDy7HhVGJNw6Uw3bR2rGem6SG1z46vAFICcCRD6pfVOykMqRRInZEcnqG6oxUl5ODUebrVXXqc83Enb9LWb8nBTVbgpD9tzaVq6iKuXrpBqrCPIF4mCcNN0vVsikMvF0qsvgTGU8kUaF7cQ+QGW69zkoeVYqMnQT/e6HIny7FRXkT4/iOXaJEmCkBI/5+uKAL1nRqmpVdTMn0f6wgCta5eT7u5H2TeEbZRtYd0Qcm/Ugj1VC2WbQ+j7nD10nIeefZJzB4+zcFU73T91UhFg8I8hli53sas9hBAUrmWpb20mKPgou5zX6Z6Wa8BBuzaW62A5Nn42z0jfRYbO9bJw5TIunemhvrWZ6+lxxvovVwYASF8YwLVjUotakUoQxAHKskBAMZtDFjVuyps8eoI4SshfvU5+IkOQ97GrXfITWaIwRFkWXn2K4tgIg529CCmBuDKAiROC7DVUPsFpXEBgPOIoIioFKK1QWhPkiwRFHxB/nWUhKGSyjA+O0NTeSuPi+WQHuggzE2THCkh5672nKzQBMAmpqpCaJU0kdiN+zpC/miEoFknihNAvYeIQIcFybSzbonV1O1om+OPDkB7AJUeQhIjbXPp61mYEIAX1C5uwqtsRtBOF9QSFakycYOJhTDxMEg2j9SiEV/Ez46hA48cWoV+x3cwOMAWSGJI4Qgi/nNe6hYCLiR1MaIijIibIUApMOXhmCv/uAMxMjyFBEGOSGGOSSZu5460k//OYA5gDmAOYA/g7gOTeSoqwIoBS4jdzLz2W8mhFgCpXvpnEs/0z/fuhNJ9UBFi2jMNOlX43uduJMIRKyt3pfu/Lit1w+8dxfPq9hp1jcXgFeB1Y8Z90y325CyH2Pr+rsAsKs7fjjrfGDLD79Kfed0KIrcBLwKN3VGrl7wmB2A98u3Xn9Z47fg90vDLcM3Ri7XkTx58JJeeD2AxsBNYhaDPGNIKxgRDDBNCP4XfgmIEjJonHHM8rPP7y0G3r+k+x9gzC7lZ5UwAAAABJRU5ErkJggg==',
		
		properties: {
			'thickness': { // size in radial dimension
				...typedDistributionSchema,
				default: universalDistanceRange,
				isRefinement(a, b) {
					a = normalizeToRange(a);
					b = normalizeToRange(b);
					return a.min <= b.min && b.max <= a.max;
				}
			},
			'length': { // size in longitudinal dimension
				...typedDistributionSchema,
				default: universalDistanceRange,
				isRefinement(a, b) {
					a = normalizeToRange(a);
					b = normalizeToRange(b);
					return a.min <= b.min && b.max <= a.max;
				}
			}
		},
		
		behavior: {
			new(command) {
				let {initialValues = {}, options = {}} = command;
				initialValues = { ...initialValues };
				initialValues::defaults({
					longitudinalBorders: [],
					radialBorders:       [],
					axis:              null
				});
				if (options.createAxis) {
					const axis = Border.new({}, { forcedDependencies: [command] });
					initialValues::assign({ axis });
				}
				if (initialValues.axis) {
					initialValues.longitudinalBorders = _union(
						[...initialValues.longitudinalBorders],
						[initialValues.axis]
					);
				}
				if (options.createRadialBorders) {
					if (options.createRadialBorders === true) {
						options.createRadialBorders = 2;
					}
					const nr = Math.min(options.createRadialBorders , 2);
					for (let i = initialValues.radialBorders.length; i < nr; ++i) {
						initialValues.radialBorders.push(
							Border.new({}, { forcedDependencies: [command] })
						);
					}
				}
				return new Lyph(
					initialValues,
					{ ...options, allowInvokingConstructor: true }
				);
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const HasPart = M.RELATIONSHIP({
		
		name: 'HasPart',
		
		extends: Has,
		
		singular: "has part",
		
		1: [Lyph, '0..*', { anchors: true, key: 'parts' }],
		2: [Lyph, '0..*',                                ],
		
		noCycles: true,
		
	});
	
	const HasLayer = M.RELATIONSHIP({
		
		name: 'HasLayer',
		
		extends: Has,
		
		singular: "has layer",
		
		1: [Lyph, '0..*', { anchors: true, key: 'layers' }],
		2: [Lyph, '0..*'                                  ],
		
		properties: {
			'relativePosition': {
				type: 'number',
				required: true,
				default() { return [...this[1]['-->HasLayer']]::map((hasLayerRel) => {
					let pos = hasLayerRel.fields.relativePosition[$$value];
					if (pos::isUndefined()) { pos = -Infinity }
					return pos;
					// TODO: Having to reference $$value here to avoid getting
					//     : a stack-overflow by using .get() (which would call this default function again)
					//     : Not a very nice solution.
					// TODO: go back to explicitly setting the default value at initialization,
					//     : but time it right, so that this[1] above is already defined
				}).concat([0])::max() + 1 }
			}
			// TODO: CONSTRAINT - two layers of the same lyph cannot have the same relativePosition
		},
		
		noCycles: true,
		
	});
	
	const HasPatch = M.RELATIONSHIP({
		
		name: 'HasPatch',
		
		extends: HasPart,
		
		singular: "has part",
		
		1: [Lyph, '0..*', { anchors: true, key: 'patches' }],
		2: [Lyph, '0..*'                                   ],
		
		properties: {
			'patchMap': { type: 'string' }
		},
		
		noCycles: true,
		
	});
	
	const HasSegment = M.RELATIONSHIP({

		name: 'HasSegment',

		extends: HasPatch,

		singular: "has segment",

		1: [Lyph, '0..*', { anchors: true, key: 'segments' }],
		2: [Lyph, '0..*'                                    ],
		
		properties: {
			'relativePosition': {
				type: 'number',
				required: true,
				default() { return [...this[1]['-->HasSegment']]::map((hasLayerRel) => {
					let pos = hasLayerRel.fields.relativePosition[$$value];
					if (pos::isUndefined()) { pos = -Infinity }
					return pos;
					// TODO: See layer relativePosition above
				}).concat([0])::max() + 1 }
			}
			// TODO: CONSTRAINT - two segments of the same lyph cannot have the same relativePosition
		},

		noCycles: true
		
		// Note that two segments can only be formally adjacent if they share
		// a radial border (which must therefore exist; used to be enforced with the Cylindrical)

	});
	
	
	const Border = M.TYPED_RESOURCE({///////////////////////////////////////////
		
		name: 'Border',
		
		extends: Template,
		
		singular: "border",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQ8T6Dv//wAAAXJJREFUWMPt1z9LHUEUBfCfLy9FJAGDFrEQAmIIooWNySfQ0lY7CyWksrFWyLfIN0iXTkFIK89K8k9CQkQFi1QKCYqgT5v7ZFhmTTcKvoFhzs697Dl7d2b3DPe99eB7Zr4XEzjGLFbRruRsYjHwJzyrxB9iPvL6sI2TKlETozXimjE+xctM/DDBIxjK5DxO7vX8JhL4ip+BH+Es8C4+ZirwJcHr6M9U4E/gM6zhNK5fYLyTeBl9qeCrX+rwNpLJBwUFXHOlAhoFBTTSXTAT+Bt+FxIwjLE78y1oYQtzBTnngrPVxKuYHCwoYBCTpRfezauxK6AroCvgLgjoKezErsFCjK0wJSXaOF6HJ7h9U3rrv+OOJVsu+ODLOUvWLiigndsFFwUFXKRr4LLGls/iL6bxpsaWvwv8vsaWr+AznuDD/2x5tQ9E/G1NfCMhO6jJmYr4QB1PEzs1R7PzwEf4kanAfoJ/RbWqFfgX+Bx7uaNZt10BmZ9eLKWdZQIAAAAASUVORK5CYII=',
		
		properties: {
			nature: {
				...enumArraySchema('open', 'closed'),
				default: ['open', 'closed'],
				required: true,
				isRefinement(a, b) {
					a = new Set(a ? wrapInArray(a) : []);
					b = new Set(b ? wrapInArray(b) : []);
					return !(b.has('open'  ) && !a.has('open'  )) &&
					       !(b.has('closed') && !a.has('closed'));
				}
			}
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	const borderRel = (name, Superclass, c1, c2, key, singular, flags = {}, options = {}) => M.RELATIONSHIP({
			 
			name: name,
			
			extends: Superclass,
			
			singular: singular,
		
			...flags,
			
			1: [Lyph,   c1, { ...options, sustains: true, anchors: true, expand: true, key }],
			2: [Border, c2                                                                  ],
			
			// Two lyphs never share the same border, formally speaking.
			// The degree to which two borders overlap can be controlled through
			// the existence of shared nodes on those borders.
			// (1) Simply a single shared node between two borders indicates that they overlap anywhere.
			// (2) If a node is on, e.g., the minus and top borders, it is in the corner, with all meaning it implies.
			// (3) In the strictest case, two nodes could be used to connect four corners and perfectly align two lyphs.
			
			// TODO: CONSTRAINT: Outer border                 always has `nature: 'closed'`.
			//     :             Inner border of position = 0 always has `nature: 'open'  `.
			//     :             Inner border of position > 0 always has `nature: 'closed'`.
			//     : Plus border and minus border can be either.
			
			// TODO: CONSTRAINT - a lyph can only have a non-infinite thickness
			//     :              if it has two longitudinal borders
			
			// TODO: CONSTRAINT - a lyph can only have a non-infinite length
			//     :              if it has two radial borders
		
		});
	
	//// //// //// //// ////
	// We're using a cylindrical coordinate system:
	// + https://en.wikipedia.org/wiki/Cylindrical_coordinate_system
	// + longitudinal dimension = 'length' dimension
	// +              borders   = inner & outer borders
	// + radial dimension       = 'thickness' dimension
	// +        borders         = minus & plus borders
	//// //// //// //// ////
	
	/* 4 borders maximum; at least two longitudinal borders; optionally one or two radial borders */
	const HasBorder             = borderRel('HasBorder',             Has,       '0..4', '1..1', 'borders',             'has border', { abstract: true });
	const HasLongitudinalBorder = borderRel('HasLongitudinalBorder', HasBorder, '2..2', '0..1', 'longitudinalBorders', 'has longitudinal border', {}, {});
	const HasRadialBorder       = borderRel('HasRadialBorder',       HasBorder, '0..2', '0..1', 'radialBorders',       'has radial border');
	
	/* one of the longitudinal borders can be an axis */
	const HasAxis = borderRel('HasAxis', HasLongitudinalBorder, '0..1', '0..1', 'axis', 'has axis');
	
	
	const CoalescenceScenario = M.TYPED_RESOURCE({//////////////////////////////
		
		name: 'CoalescenceScenario',
		
		extends: Template,
		
		singular: "coalescence scenario",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEREAuMSB/gAAA5RJREFUWMOlV81u20YYnFmuHauw01N6qfsWKSAlEKIARK6Fr30QI1JaJIdWCvIgORZ+AMJVEbjxwa9Q9NRLDkmLWDIlcXd6IEWR1B+l8CQMP+337XC+2W95cXqieyTSR4g9cPbPZ4ZhJwCg7IXJA/bEomiYXHx7onsGEAgCmEiwiQcOzDyamGX/iqKhw+LxWH42YmHYsQBYLGYGwIpZJiDxgB07watQrouFR69EPwUpQMzfAaiFGeAN8OdPFSYwcoJnmhwA7iTYkRcSLMISHxDBUc8obkjpBkiIAkBxC3YHsQ/6SSU5AWDsAM9F6bEA+9EJBx74ysWa0XKMAHj3fPA0pbC4AFcsWsKiaOhMq9tPC1qKw6fE4zDTmwgkEuyLj+MUefxKMEc9vHs++OHR9wejxfeslXyeBGKR9TzurPnQvri+YVU0Ngw7QRQNHd0UxseNp2HH7pk83zZTOZTiPh8frxSmmf8ghTXUaQcsBZTjW/9rci5UYmef5At1UbU/mZkbRUrDMnW7Jt+VSVva9gbq/rhtth35BEorz3o/70AACFrNOEvevrxtvVwXR+rIvX99HoYdY+tS58gnEn8GQFLwMrnpMqs+wwSgQ7CDzXHnAGhrizCtnrruU5VWKrlisycD9dz1YIAVcUGz2xXQn4fbsgiFrd839flgVVx+flCNcI2RXY5wVKy4tggLDOGLRCiwsIpMXRFmzo96Tri5SCyWkqkrwvK6m51wByZpdhEhy3razwkrTO7ihCXq9nXCCpOwmQh9dojcVSah/AlazXje0+tidmEye1l2Qoh90+r2V00880XZ7GnLZKRt7Vxk0haOxTegn6yfeNAG0DFQD9TGaSmgft8kQr9ovtQJU9NYmuFKC1zetl4S7LjrwSDcY1raJsK6x2wdEW7EqiI0haFk4wI1nXA7tsYJd6buCweWhQijaJhUW+nHxw/th8bxMnXa6oRrsW/ubvn26iZB+1kMN523s7cXpyc6LJAykXB2dcOlAbLSv7vu/O3VTfLb6X3d//tXHCrR7XdfayKfXs2sWfzL+bW7BCgEzW43O1K5YeJZwtB+Fpu/fsHEWEwYUBKckN6MnMrXpVV+T+rIy0BAf8V0g20Y3Ayz2UxTG+Q2GUuwIwe4ynVplTDd+9fn2Ri1NAXVxT48OFZjvltlt+N/E49DZkwRmEnVVgMAH4YdUzx2CwzVwqJo6P9zHmMSzHJMBfwPDI62nARtE/MAAAAASUVORK5CYII='
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const JoinsLyph = M.RELATIONSHIP({
		
		name: 'JoinsLyph',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "joins lyph",
		
		1: [CoalescenceScenario, '2..2', { anchors: true, key: 'lyphs' }],
		2: [Lyph,                '0..*'                                 ],
		
		// cardinality max=2, because we're only working in two dimensions right now
		
		// TODO: CONSTRAINT: both joint lyphs of a given scenario need to
		//     :             use the same Lyph entity as their outer layer
		// TODO: CONSTRAINT: cardinality = 1 on both lyphs and their layers
		
	});
	
	const Coalescence = M.RESOURCE({////////////////////////////////////////////
		
		name: 'Coalescence',
		
		extends: Resource,
		
		singular: "coalescence",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQ4uqUiCrwAABDdJREFUWMPtln1M1HUcx1+/457ggIPj6RDkSSFD5pYk2F8+gNmyyZTSMTCbUCztD1dtupm5clZY5lqsUpdROf9g82FMUxb5VFuQmRXCSVhwHnI8yB3ccQ/c3e+uPw53MR/6YVD94efP7+fz+b7f+zzDA/mPRbhfx4ravgKVUj5TJgjO37rNhvO78rqXbG/n7M7c6SGQ9uwZrn+xlFW7uwpzMpKb42NUaFRgd4PHB8ZeS+O3FztWlizL9+x+RjU9EVi07UrB0sfmtmTGwaxEcHuhzQyW0aDeanP0f1AeqY9ZfYLho09J+lMmxWjmum8AWLIwCF6YCdmJ4PKCzRWy02k1SdWfWt6RCi6ZgOnLIua88N0ClQISosDtgx+NcOUG+MSQnd8PkZrwlycTVblUw0fystYG/HBjGLqHYMAOgUBQ5/ND7wiIIqTq1ArYEAUH7VNKQBRFh0eEHuvEd58ffu0Jvuu1kBIDcNQ7pSkAaLzwyye3VbAAvw/CZRMMOUAbDi63sx+G3VNKQLOygZzMZPOYxyv+9d3pgUE7aJTwsB6yEsA64nh92gZRakVTeOXaIuctJ7sbjBZQyCAjASxD1oZ9lboSiuuhac3UpoDienoOFbt+buvWmMxDrYIA0eEwRw+ZcSIdncYN+yp1Jcvf6JAM/o9G8bIdhqgZSTqNKIriobpTVi5V+v6t/VF6D13OdIOvB9LvoW8AIqeTQKoEm+zpAi+QaBcLpE0Z6ty3AgDqSbpp7zh2nzhy91G84JWfuLhnPutq+zYnxEU/FxYm6H0+/zVjj3FPGxybDPqKXddGTm6bLVQftO5N1qlWeEUhYtQlXrpw0bD18mna79qGG+tGmnLSoovSY8HihOsWkAnQZRqsqXsxcasU8MS1jQwYTOotr5WbCrPV8fGR0NYL/TYIBAI0X+58XCaTfX1qe/ZEAhW1fWWP5iYdXpwN4Qo43wm9w6GPa/Y1aF0nSmxSSGz6fOTw4rzoskU5wV1xrgPGfLdWtt/zZkmY6rZJqNNGbM6Kgyg1GPpC4H4/eEUoXV5QIzUFuihVWUwEdPTBD13B+0EY35wBQaZMX38m/7YakMtlaVYnnO0IrdxhJ1zth5hwiFQrJV+bMrkcg3n8XhxfX9etwX8z4iF3dupcI1yaEAG329f8xyCYxsEdY3CuEwxmiFDCTYv9uFQCow6P3eIIRk4AeizQZAgeMVFKOFV/9vSEFMx7qYVBq22nIISKomcY/AHIT4cUrT9wfEvG3ryN30siYLU5dglC6GAxWUGngfw0kAueG7RWD9yxC9a8b3r+oVkz9ofJZAyOBjtAq/KN1X/VPF+lULS3frRQcitWHRg6kpIUu9qPwIAtWFsKPP1vP63S/926Fso/NL9btX/odOl7xlcB5m1qua8hFr3q5Iz1H/d/VrX/ZsOyHVdLAdRPHuOB/K/kT9eKm/y5BWfsAAAAAElFTkSuQmCC'
		
		// coalescence between two or more lyph templates means
		// that at least one lyph from each participating lyph template
		// shares its outer layer with the other participating lyphs
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const Coalesces = M.RELATIONSHIP({
		
		name: 'Coalesces',
		
		extends: IsRelatedTo,
		
		singular: "coalesces",
		
		1: [Coalescence, '2..2', { anchors: true, key: 'lyphs'        }],
		2: [Lyph,        '0..*', {                key: 'coalescences' }],
		
		// cardinality max=2, because we're only working in two dimensions right now
				
	});
	
	
	const CoalescesLike = M.RELATIONSHIP({
		
		name: 'CoalescesLike',
		
		extends: IsRelatedTo,
		
		singular: "coalesces through",
		
		1: [Coalescence,         '0..*', { anchors: true, key: 'scenarios' }],
		2: [CoalescenceScenario, '0..*',                                    ],
		
		// TODO: CONSTRAINT: the two lyphs for every scenario each have to be
		//     :             a refinement of their respective lyphs in the coalescence
		
	});
	
	
	const Node = M.TYPED_RESOURCE({/////////////////////////////////////////////
		
		name: 'Node',
		
		extends: Template,
		
		singular: "node",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEzcoTSt+TgAABUZJREFUWMO9l11sFFUUx//n7rTdLqUNIhWKEJEYLR8GmVnAj8LSTpH4EbCIJhggJTwoxigPiC8oaKISExPCg8YHDT6oiYk1gaDQ2XY3YghlboRIg4YHQcoS+t3ttut2Z+b40N12HLa7LVYn2ezumXPu7957vu4lXQ/5MPpw5lu4/v/XMlvB+CMAEABmZoTDUTv7oq5unSAi9up5BrwTmVCyP7IvHIcxNJScparqdwDWADgbjw9vnTkz0CMEIcegVEhmGBHXYkIK0biecBkwAG5piVqWZUsiegKAAqDGcZy2lpaoNVU4M8O2mVRVPaZp2p+qqh4fHBya5Tic1YHIfMYGWLUqWElEC5jZ5R0sXL169ZyprjwcjlrxeOJHItrBzAsAPGPbziX3YoQnAKmt7XynBw4iwrlz57pc4jEQWZRvQiCiOs94lcFgcFlWj1xZQACotLTEicW6twP4Igtn5i4AvwUC/vriYsX2jQg6/VNren7zkudZ8HIwhoqS4tS1Z9sv1j61ThEjxIGAH93dA6Wp1MigdzFC0N3l5TP64dr+sdknkyls3LjqmKL45hJRAxHNk1JWAugYHv4rGQ5HrfYDt/Sq1mqbFf4WhLch6HC6zLlQ1VJ99tqWAf9IkSVise79GfhxN5yZj7a1ne8ZE+l6SADwFfKvYUTsYDB4X+yDxCL2oWXccRk1GnPmzVjt5SpVVb8non2maV7RNG0xgCcB/GKa5tnMro+mlK6HFG8cTBRchhFJV7VWDwIomwA+KnP4nZh++d26unUKUd7UdcRk4QD43lNL1hSEgwGBxuyWF8qUsRgoKwswjVpMqOwIPFgQPmpxn7e+TLBAEoYRsfv7E493dHQe6e2Nv7ppU43NzMQMOniw0TaMSHpgYOie/v7EYxDcUxA+KovnqP85d5dUVW0kos9dudouhKhl5k3MXA+gIROkX+40N+/8MPLVeFJPtBsOfX1Db99Wr6/3FXAtBIADnkKxlJlvMfNLAEwiWimlJCnlzgT9IeDQR3nhIKCc3ghqwZWZHpA3rkhV1Q4A8925CnCNacoz9fXrfcx8W2OpClc3gWhzLjiloS/aW/5zsjSdBPBDSUnx1rIyf8pxOJcrHAHgU0+h6DZNeUbXQ7fBAaBuQ0iJ1V1+DswbAJwAcBWMS+TQEf8NZfaKfVWRknl+a+HCeT4i6kqlRhI9PfEXDSNiOw4Lw4hYhhFJr137sA1gNE9UVd1FRFuY+WpxcdGbpaUlqXytd3AwOcOyrPellHuyk38FW8UVvYu8dUPTtEeZ+TSAX4noLWZ+D8BiAE1SytdI10OCiHzNza3pxsYX6Pr1TpHPb0II7u2Nv87MG6WU9boeKsoX7cxM4XDU0jTtE2Z+2dMXPptSJczEgKWq6i0iaqyoKGvOHC4K2vb1DeoATnrc3TWlSgiANU1bAaDSNM2Tk4UDYCK66YEDQKeYCry5udVm5r1E9HFDw9NTsjVN8wKAJhccRLTntnacb1AiAhHtIMLReHyIJgsHAF0PKVLKBoDXA9gthJgzd+5dZybdjgFQf39iGzPvl1IudbXUKR9S3ZVQ8Z4JvcpEhEQiWZxOW7XMvA/AYVfg/ht44XbMzNTXF38knbaGmfkEgGUAagwjYk0D/B/tOKdyOBy1ADrm6RW7g8Hg8umAZ+8F+YIQzHy/91DpOM4D0wDPfTHxKANAkzd//f6Sk9MBz3kxcSvrekiZPbtiO4BviCjFzL8TQQsEStLTAM99MfEos+M4dOjQrm2mafqllA9VVMy8mKtL3umESNdD5Lqcuo9R9H/I/gbz7j8/ArBcTAAAAABJRU5ErkJggg=='
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const NodeLocation = M.TYPED_RESOURCE({/////////////////////////////////////
		
		name: 'NodeLocation',
		
		abstract: true,
		
		extends:    Template,
		extendedBy: [Lyph, Border],
		
		singular: "node location",
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const ContainsNode = M.RELATIONSHIP({
		
		name: 'ContainsNode',
		
		singular: "contains node",
		
		extends: PullsIntoTypeDefinition,
		
		1: [NodeLocation, '0..*', { anchors: true, key: 'nodes'     }],
		2: [Node,         '0..*', { anchors: true, key: 'locations' }],
		
	});

});

