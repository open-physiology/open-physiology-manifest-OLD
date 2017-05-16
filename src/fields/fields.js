import Field_factory          from './Field.js';
import PropertyField_factory  from './PropertyField.js';
import Rel1Field_factory      from './Rel1Field.js';
import Rel$Field_factory      from './Rel$Field.js';

/** @ignore */
export default (env) => {
	env.fieldClasses = {};
	env.registerFieldClass = (name, FieldClass) => {
		if (!env.fieldClasses[name]) {
			env.fieldClasses[name] = FieldClass;
		}
		return env.fieldClasses[name]
	};
	
	PropertyField_factory(env);
	Rel1Field_factory    (env);
	Rel$Field_factory    (env);
	return Field_factory(env);
};
