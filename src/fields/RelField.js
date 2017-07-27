import Field_factory from './Field.js';

/** @wrapper */
export default (env) => {
	
	const Field = Field_factory(env);
	
	/**
	 * A field on an `Entity` representing one side of a relationship.
	 */
	class RelField extends Field {
		
		/**
		 * @return {Set} A new `Set` data-structure populated with
		 *               the entities related through this field.
		 */
		getAll() {
		} // to be implemented in subclasses
		
		
		/**
		 * Add an additional entity to this field, or replace the current entity if this is a `Rel1Field`.
		 * @param {Entity}   newValue - the new entity to be added into this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality or value
		 */
		add(newValue, options) {
		} // to be implemented in subclasses
		
		/**
		 * Remove a specific entity from this field.
		 * @param {Entity}   oldValue - the entity to be removed from this field
		 * @param {Object}  [options={}]
		 * @param {boolean} [options.ignoreReadonly=false]   - allow this field's value to be changed even if it is read-only
		 * @param {boolean} [options.ignoreValidation=false] - don't validate the new cardinality
		 */
		delete(oldValue, options) {
		} // to be implemented in subclasses
		
		/**
		 * Validate a specific entity as appropriate to be included in this field.
		 * Throws an exception if the entity is invalid. Otherwise does nothing.
		 * @param {Entity} entity     - the entity to test
		 * @param {Array} [stages=[]] - the validation stages to validate for (e.g., 'commit')
		 */
		validateElement(entity, stages) {
		} // to be implemented in subclasses
		
	}
	
	return env.registerFieldClass('RelField', RelField);
	
};
