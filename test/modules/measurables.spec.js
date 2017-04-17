import { describe, it, expect} from '../test.helper';

import moduleFactory from '../../src/modules/measurables';
import {simpleMockHandlers} from "../mock-handlers.helper";

describe("'measurables' Module", () => {
	
	let environment, backend, frontend;
	beforeEach(() => {
		let registerEnvironment;
		({backend, frontend, registerEnvironment} = simpleMockHandlers());
		environment = moduleFactory(frontend);
		registerEnvironment(environment);
	});
	
	it("exports the expected classes", () => {

		expect(environment.classes).to.contain.resources(
			'MeasurableLocation',
			'Measurable',
			'Causality'
		);
		expect(environment.classes).to.contain.relationships(
			'MeasuresMaterial',
			'HasMeasurable',
			'IsCauseOf',
			'HasEffect'
		);

	});
 
	it("exports an abstract MeasurableLocation class", () => {
		const {MeasurableLocation, Measurable} = environment.classes;
		expect(MeasurableLocation.abstract).to.be.true;
		expect(Measurable.abstract).to.be.false;
	});
	
});
