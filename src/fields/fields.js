import Field_factory          from './Field.js';
import PropertyField_factory  from './PropertyField.js';
import RelField_factory       from './RelField.js';
import Rel1Field_factory      from './Rel1Field.js';
import Rel$Field_factory      from './Rel$Field.js';

/** @ignore */
export default (env) => {
	env.fieldClasses = {};
	env.registerFieldClass = (name, FieldClass) => {
		if (!env.fieldClasses[name]) {
			env.fieldClasses[name] = FieldClass;
		}
		return env.fieldClasses[name];
	};

	return {
		PropertyField: PropertyField_factory(env),
		RelField:      RelField_factory     (env),
		Rel1Field:     Rel1Field_factory    (env),
		Rel$Field:     Rel$Field_factory    (env),
		Field:         Field_factory        (env)
	};
};
