"use strict";

import propertiesPlugin from './properties.plugin';
import genericPlugin    from './generic.plugin';


export default function resourceCheckingPlugin(chai/*, utils*/) {
	chai.use(propertiesPlugin);
	chai.use(genericPlugin);

	let Assertion = chai.Assertion;

	Assertion.addMethod('resource', function (name) {
		this.branch().contains.properties({
			isResource: true,
			name:       name
		});
	});

	Assertion.addMethod('resources', function (...classes) {
		for (let cls of classes) {
			this.branch().property(cls).that.is.a.resource(cls);
		}
	});

	Assertion.addMethod('relationship', function (name) {
		this.branch().contains.properties({
			isRelationship: true,
			name          : name,
			domainPairs   : undefined
		});
	});

	Assertion.addMethod('relationships', function (...names) {
		for (let name of names) {
			this.branch().contains.property(name).that.is.a.relationship(name);
		}
	});

};
