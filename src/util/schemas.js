export const identifierRegex = `^[a-zA-Z_][a-zA-Z0-9_]*$`;

export const qualitySchema = {
	type: 'string'
};

export const identifierSchema = {
	type:    'string',
	pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
};

export const uriSchema = {
	type: 'string',
	format: 'uri'
};

export const idSchema = {
	type: 'integer'
};

export const enumSchema = (...candidates) => ({
	type: 'string',
	enum: candidates
});

export const enumArraySchema = (...candidates) => ({
	type       : 'array',
	items      : { ...enumSchema(...candidates) },
	uniqueItems: true,
	maxItems   : candidates.length
});

export const minusPlusSchema = enumSchema('minus', 'plus');

export const innerOuterSchema = enumSchema('inner', 'outer');

export const lyphDirectionSchema = enumSchema(...minusPlusSchema.enum, ...innerOuterSchema.enum);

export const oneOf = (...schemas) => ({ oneOf: schemas });

// export const rationalNumberSchema = oneOf({
// 	// TODO: specify format (https://github.com/infusion/Fraction.js)
// 	type: 'object',
// 	properties: {
// 		'n': { type: 'integer', minimum: 0,                required: true }, // numerator
// 		'd': { type: 'integer', minimum: 1,    default: 1, required: true }, // denominator
// 		's': { type: 'integer', enum: [-1, 1], default: 1, required: true }  // sign
// 	}
// }, { type: 'number' }, { type: 'string' });


//NK Simplified schema to avoid oneOf
export const rationalNumberSchema = {
	type: 'object',
	properties: {
		'n': { type: 'integer', minimum: 0,                required: true }, // numerator
		'd': { type: 'integer', minimum: 1,    default: 1, required: true }, // denominator
		's': { type: 'integer', enum: [-1, 1], default: 1, required: true }  // sign
	}
};

export const angleSchema = {
	type: 'number',
	minimum: 0,   exclusiveMinimum: false,
	maximum: 360, exclusiveMaximum: true
};

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

export const rangeSchema = {
	type: 'object',
	properties: {
		'min':  { type: 'number', required: true },
		'max':  { type: 'number', required: true }
	}
};

export const universalDistanceRange = {
	'min': 0,
	'max': Infinity
};

export const normalDistributionSchema = {
	type: 'object',
	properties: {
		'distribution': { value: 'normal' },
		'mean': { type: 'number', required: true },
		'std':  { type: 'number', required: true }
	}
};

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

export const distributionSchemaOr = (otherSchema) => ({
	oneOf: [
		boundedNormalDistributionSchema,
		uniformDistributionSchema,
		otherSchema
	]
});

export const dimensionalitySchema = {
	type: 'object',
	patternProperties: {
		'[a-zA-Z0-9 ]+': { type: 'integer' }
	}
};
