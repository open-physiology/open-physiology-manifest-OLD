import TypedModule from '../TypedModule';

import resources from './resources';
import typed     from './typed';


export default TypedModule.create('groups', [
	resources, typed
], (M, {
	IsRelatedTo, Template, PullsIntoTypeDefinition
}) => {
	
	
	const Group = M.TYPED_RESOURCE({/////////////////////////////////////////
		
		name: 'Group',
		
		extends: Template,
		
		singular: "group",
				
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQw1ERspwQAABCJJREFUWMPtlkuIHVUQhr/q7nvnzoxxCEiQoJKYhS4EQRe6UXElgkTNc2MERdy7EFy5cqG7rLNQMAExJkrEMYiELMQgEQTdRAhJEOMQMzjJ9Ptx6pSL7pm5mZsbvMH4gBQ0fTh9Tv//qVN/VcFt+5dNJln8w77ooIi+JL2gnbChjwamHrPw0CMH3b6/+s9oEgLmTTY8sJHNz27DVw4aD41CrQQeFk79RvxrNtGhJiKAQW+2z8zWOUhqqByU2r7ViKbCia8gmnSDmUHhsLyBqgW3SgnUg/O3ngBqHXAHXirUDpy1324pAQG8b10+DF5qe3pvIPIPeKBcB15qS8wm90Aw8Q7fXoE0ilQeqdvxzdpEHpAguLp0Zmlx8aclhwxlke4dhkQS9q7eOgLSf49+eCDqY2OXWHgFmv95Kt69d6fYmIA6cvhTe2H79qA33XsbeLKbPpmm6TvH57+yXXt2yPVdI3zy8VG7IYFde3Y+LMITwEYzC8YRFJFp4GXg7m7qEvChmRXj8peIeOCKGd8cOXz0xxECu/a8+LhIcBIYdFM1EI9PylSAH1LT1A2K251AvxuXZv7pI4c/++6aIDTjkggfAdNAAbwPnJu0Yo4huw14deXfZlz67wTh8wemH1RVbNWb0h1ZOm1HHrh47PU8v/+5dzer2pxzait+kTYoWk2HgQSBLJ//4q2FQ73eDGb3OOcCGRP9Qa9HBP741NQUgQRDPYZh3ahp6hzjFeC0GW9GUbBzdmZKV1Via6tdo6E3Owq8YaoPifcfTM/Ozqwrp2CGqeKcI4qiaMszj+1m8133UWtBZRm15tQ+Q4Oaz+eP5VEQDQBU/aZHH9p672t7n6Ioa4pKyWolrxyNF778+jTnzi9s6oAGDrbs2L9/pilLKEssy7AkgSzjjwsX+P7ECSIQBv0B/X4fpwWhhyDwiFcIGjC5pvHqRREb7hjgPFTeEXhBnKxqfV1FssHcHKEZvq4xs7af8J6eKrKiAmcNpU+pfEqlKbXPKH2KUo5IwJtRVEpaOrLKkZVKVjkqB43aiGisLPFxjCUJliT4JEHSFMtzMCMCo/EFlU+oNaXyWUckw1k+Ut+dWgteOtLKkXcESgdO/QhhGwaPY0gSrCNgQGRAbQWV9iiHwCtLcZqtamKVgPek68Cz0lE4Q3U0a9jyMhbH+CSBOMbStCWRZes8YCGVb91fW3sdFjYj2lE10lLJqw68UtLKUXvw1ymSlqZroGmKxTFkGTRNGwNmxlJ8mdJias2ofUFjBc5qglDW4QtJVnLul99J84qi9hSNUjYOJKSpmxGtL549i1tehjxvVZDnSNOQlCVmRqSqnPn5DCLSJaO1HAB0JFoiQSBcXFjk8vFvOzm3K62LPW1cp4RWEaEZp+bn19q1lacLZr2JFu62/e32J4u63QWs1oUKAAAAAElFTkSuQmCC'
		
	});/////////////////////////////////////////////////////////////////////////////
	
	
	const IncludesElement = M.RELATIONSHIP({
		
		name: 'IncludesElement',
		
		extends: PullsIntoTypeDefinition,
		
		singular: "includes element",
		
		1: [Group,    '0..*', { anchors: true, key: 'elements' }],
		2: [Template, '0..*',                                   ],
		
	});



});

