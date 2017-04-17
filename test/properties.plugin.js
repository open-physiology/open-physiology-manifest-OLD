"use strict";

import genericPlugin from './generic.plugin';

export default function propertiesPlugin(chai/*, utils*/) {
	chai.use(genericPlugin);

	let Assertion = chai.Assertion;

	Assertion.addMethod('properties', function (props) {
		for (let key of Object.keys(props)) {
			if (typeof props[key] === 'undefined') {
				this.branch().property(key);
			} else {
				this.branch().property(key, props[key]);
			}
		}
	});

};
