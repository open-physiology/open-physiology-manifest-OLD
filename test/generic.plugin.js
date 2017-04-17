"use strict";

export default function propertiesPlugin(chai, utils) {
	const Assertion = chai.Assertion;

	Assertion.addMethod('branch', function () {
		let assertion = new Assertion(this._obj);
		utils.transferFlags(this, assertion, false);
		return assertion;
	});
	
	Assertion.addMethod('instanceOf', function (...classes) {
		for (let cls of classes) {
			this.assert(
				this._obj instanceof cls || cls.hasInstance && cls.hasInstance(this._obj)
				, 'expected #{this} to be an instance of ' + cls.name
				, 'expected #{this} to not be an instance of ' + cls.name
			);
		}
	});

};
