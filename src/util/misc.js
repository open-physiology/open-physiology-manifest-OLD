////////////////////////////////////////////////////////////////////////////////

import {isString} from 'lodash-bound';

import assert from 'power-assert';

// export * from 'utilities';

////////////////////////////////////////////////////////////////////////////////

/**
 * Transform a string representation of a cardinality range into an object.
 * @private
 * @param cardinality {string} a string representation of minimum and maximum cardinality `"min..max"`,
 *                     where `min` is a natural number and `max` is a natural number greater or
 *                     equal to `min` or an asterisk symbol `*` to represent an unbounded maximum
 * @returns {{min: number, max: number}} an object with `min` and `max` fields
 */
export function parseCardinality(cardinality) {
	assert(cardinality::isString(), `
		A cardinality range has to be a string,
		but a value ${JSON.stringify(cardinality)} was given.
	`);
	let match = cardinality.match(/^(\d+)\.\.(\d+|\*)$/);
	assert(match && match.length === 3, `
		A cardinality range has to be in the form "min..max",
		but a value ${JSON.stringify(cardinality)} was given.
	`);
	let [,min,max] = match;
	if (max === '*') { max = Infinity }
	else { max = parseInt(max, 10) }
	min = parseInt(min, 10);
	return {min, max};
}

/**
 * Transform an object representation of a cardinality range into a representative string.
 * @private
 * @param cardinality {{min: number, max: number}} an object representation of minimum and maximum cardinality `{min, max}`
 * @param abbreviate  {boolean} whether or not to collapse the resulting string if `min === max`
 * @returns {string} a string representing the given cardinality range, possibly collapsed if `min === max` and `abbreviate === true`
 */
export function stringifyCardinality(cardinality, {abbreviate} = {}) {
	return (cardinality.min === cardinality.max && abbreviate)
		? `   ${cardinality.min}`
		: `${cardinality.min}..${cardinality.max === Infinity ? '*' : cardinality.max}`;
}

/**
 * Compare two sets for equality.
 * @private
 * @param setA {Iterable<T>}
 * @param setB {Iterable<T>}
 * @returns {boolean} `true`, if both sets have the same elements; `false`, otherwise
 */
export function setEquals<T>(setA: Iterable<T>, setB: Iterable<T>): boolean {
	setA = new Set(setA);
	setB = new Set(setB);
	if (setA.size !== setB.size) return false;
	for (let a of setA) if (!setB.has(a)) return false;
	return true;
}

/**
 * Express an assertion that's tied to outside input.
 * We may later replace this with a more sophisticated mechanism.
 * @private
 * @param {boolean} constraint - the condition to check
 * @param {string}  message    - the message to display if the condition fails
 */
export function constraint(constraint, message) {
	if (!constraint) {
		throw new Error('Constraint Failure: ' + (message || '(no message)'));
	}
}
