import defaults from 'lodash-bound/defaults';
import {
	defineProperty,
	defineProperties
} from 'bound-native-methods';
import {
	mapOptionalArray,
	wrapInArray,
	definePropertyByValue
} from 'utilities';

import Module from './Module.js';


/**
 * Typed Modules allow to more easily create related
 * Type, Template and HasType classes. For example,
 * to create LyphType and LyphTemplate resources and
 * their HasType relationship from one description.
 **/
export default class TypedModule extends Module {

	TYPED_RESOURCE(config) {
		return mapOptionalArray(config, (conf) => {
			
			this.basicNormalization(conf);
			
			const superClasses = wrapInArray(conf.extends    || [this.classes.vertexValue('Template')]);
			const subClasses   = wrapInArray(conf.extendedBy || []);
			
			/* handling properties */
			conf::defaults({
				properties:        {},
				patternProperties: {}
			});
			
			/* Template class */
			const newTemplateClass = this.RESOURCE({
				
				name: conf.name,
				
				abstract: !!conf.abstract,
				
				extends:  superClasses,
				extendedBy: subClasses,
				
				singular: conf.singular,
				plural: conf.plural,
				
				icon: conf.icon,

				properties:        conf.properties,
				patternProperties: conf.patternProperties,
				
				behavior: conf.behavior
				
			});
			
			// TODO: go back to a specific Type class for each Template Class
			// -- for now, all Template subclasses have a reference to the only Type class
			const Type = this.classes.vertexValue('Type');
			newTemplateClass::definePropertyByValue('Type', Type);
			
			/* register and return */
			return newTemplateClass;
		});

	}

}
