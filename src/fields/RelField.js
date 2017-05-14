import Field_factory from './Field.js';

/** @private */
export default (env) => env.registerFieldClass('RelField', class RelField extends Field_factory(env) {
	
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
	
});
