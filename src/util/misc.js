////////////////////////////////////////////////////////////////////////////////

import {isString} from 'lodash-bound';

import assert from 'power-assert';

export * from 'utilities';

////////////////////////////////////////////////////////////////////////////////

export function parseCardinality(val) {
	assert(val::isString(), `
		A cardinality range has to be a string,
		but a value ${JSON.stringify(val)} was given.
	`);
	let match = val.match(/^(\d+)\.\.(\d+|\*)$/);
	assert(match && match.length === 3, `
		A cardinality range has to be in the form "min..max",
		but a value ${JSON.stringify(val)} was given.
	`);
	let [,min,max] = match;
	if (max === '*') { max = Infinity }
	else { max = parseInt(max, 10) }
	min = parseInt(min, 10);
	return {min, max};
}

export function stringifyCardinality(cardinality, {abbreviate} = {}) {
	return (cardinality.min === cardinality.max && abbreviate)
		? `   ${cardinality.min}`
		: `${cardinality.min}..${cardinality.max === Infinity ? '*' : cardinality.max}`;
}

export function constraint(constraint, message) {
	if (!constraint) {
		throw new Error('Constraint Failure: ' + (message || '(no message)'));
	}
}
