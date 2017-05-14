/** @private */
export const identifierRegex = `^[a-zA-Z_][a-zA-Z0-9_]*$`;

/** @private */
export const qualitySchema = {
	type: 'string'
};

/** @private */
export const identifierSchema = {
	type:    'string',
	pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
};

/** @private */
export const uriSchema = {
	type: 'string',
	format: 'uri'
};

/** @private */
export const idSchema = {
	type: 'integer'
};

/** @private */
export const enumSchema = (...candidates) => ({
	type: 'string',
	enum: candidates
});

/** @private */
export const enumArraySchema = (...candidates) => ({
	type       : 'array',
	items      : { ...enumSchema(...candidates) },
	uniqueItems: true,
	maxItems   : candidates.length
});

/** @private */
export const oneOf = (...schemas) => ({ oneOf: schemas });

/** @private */
export const typedDistributionSchema = {
	type: 'object',
	properties: {
		'value': { type: 'number' },
		'min':   { type: 'number' },
		'max':   { type: 'number' },
		'mean':  { type: 'number' },
		'std':   { type: 'number' },
		'class': { type: 'string', required: true }
		// 'UniformDistribution' | 'BoundedNormalDistribution' | 'Number' | 'NumberRange'
	}
};

/** @private */
export const rangeSchema = {
	type: 'object',
	properties: {
		'min':  { type: 'number', required: true },
		'max':  { type: 'number', required: true }
	}
};

/** @private */
export const universalDistanceRange = {
	'min': 0,
	'max': Infinity
};

/** @private */
export const normalDistributionSchema = {
	type: 'object',
	properties: {
		'distribution': { value: 'normal' },
		'mean': { type: 'number', required: true },
		'std':  { type: 'number', required: true }
	}
};

/** @private */
export const boundedNormalDistributionSchema = {
	type: 'object',
	properties: {
		'distribution': { value: 'bounded-normal' },
		'mean': { type: 'number', required: true },
		'std':  { type: 'number', required: true },
		'min':  { type: 'number', required: true },
		'max':  { type: 'number', required: true }
	}
};

/** @private */
export const uniformDistributionSchema = {
	type: 'object',
	properties: {
		'distribution': { value: 'uniform' },
		'min':  { type: 'number', required: true },
		'max':  { type: 'number', required: true }
	}
};

// export const distributionSchema = {
// 	oneOf: [
// 		{ ...normalDistributionSchema        },
// 		{ ...boundedNormalDistributionSchema },
// 		{ ...uniformDistributionSchema       }
// 	]
// };

/** @private */
export const distributionSchemaOr = (otherSchema) => ({
	oneOf: [
		boundedNormalDistributionSchema,
		uniformDistributionSchema,
		otherSchema
	]
});

/** @private */
export const dimensionalitySchema = {
	type: 'object',
	patternProperties: {
		'[a-zA-Z0-9 ]+': { type: 'integer' }
	}
};
