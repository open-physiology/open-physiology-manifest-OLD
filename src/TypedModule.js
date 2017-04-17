import Module                       from './Module';

import defaults from 'lodash-bound/defaults';
import {
	defineProperty,
	defineProperties
} from 'bound-native-methods';
import {
	mapOptionalArray,
	wrapInArray,
	definePropertyByValue
} from './util/misc';

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
			
			// TODO: figure out if we still want to set
			//     : a property `Type` on each template class,
			//     : since a module now only has one Type class.
			const Type = this.classes.vertexValue('Type');
			newTemplateClass::definePropertyByValue('Type', Type);
			
			/* register and return */
			return newTemplateClass;
		});

	}

}
