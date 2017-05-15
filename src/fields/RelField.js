import Field_factory from './Field.js';

/** @wrapper */
export default (env) => {
	
	const Field = Field_factory(env);
	
	/**
	 *
	 */
	class RelField extends Field {
		
		getAll() {
			// to be implemented in subclasses
		}
		
		add(newValue, options) {
			// to be implemented in subclasses
		}
		
		delete(oldValue, options) {
			// to be implemented in subclasses
		}
		
		validateElement(element, options) {
			// to be implemented in subclasses
		}
		
	}
	
	return env.registerFieldClass('RelField', RelField);
	
};
