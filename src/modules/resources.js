import {idSchema, uriSchema, identifierSchema} from '../util/schemas';
import Module                                  from '../Module';


export default Module.create('resources', [], (M) => {
	
	
	const Resource = M.RESOURCE({/////////////////////////////////////////////////////////////////
		
		name: 'Resource',
		
		abstract: true,
		
		singular: "resource",
		
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEQYKXZLsdgAABrZJREFUWMPtln9wFGcZxz+7e7t7d7k7QhISUkJoQlNoQX7IUGisUjuIKBUiSG2x/lGr6IAdW2aojmU6/hrtCFJ+VaCKgv0pDMXSotDqQNFiCg2WiiIFQ4CEJEdyd8nt3u3v1z8uCRaBdrTUccZn5pndd/d9v8/3efbd7/vA/+1qWdWKwdy04f2PK03dCBPXT5q68IXu/1ryi578y8GZS18WUv3jc78hxBXnht7LwNr0TdBj1R+fcP3kxLFOCOvrHpGk5660Rn4vCTi/vZeGr07b+DsnhKMoiIheGZr+8wXvSwW0hicosezpxyeMHosP+VAIdI0gxBrg6ateAedXn6fuzg+tO2IAjiCvKBAOERRFS7U5T9zzrgksu8zEZVcIHv/cs9Tc/dQnm2uqR2G7YDnkZQU0DTQNPxZf9Y4E+gOchOu2zp79s9dWr247smWLOLh2bfv2+fN/cRpuvByR7FN3on14/Pq2nA+OC7aHpcgQDkE4hB+PJcILnl102Qz6QdffcMPKlpdeEp5hiHwyOeBuNita9+8Xj0+YsPFSJKq+vG1e4sWUYGda8EJa8GJGjFjxhuBrrwx40X17cpfUjf6bR1R145eamhZGKysxWlpA/tftIQnB1lumPbPo/uEL1a7YYg1lnummny6fvOWB5LAx1QingChJVDafo73DGFgbUWWKs51L2tfMfvRtmMsAAfWTpk59deaOHajxON2HD+Nk0hd2uKTQbeXY2f1XXmn7M8moTCA8zhtpUkaGvJ2B4g9A5Wyo+ASE45ScaSPVbV6IJKAm7HqnHqpXE4u30fvYfACU/cAc2DyqoaEmUVdHd9MhjOa/45lZ/J4sz58/wi7pDC/HzqFUFSGX68gJHyeaw41ZOPEcVsKGaCd4++D8Buj9E0FewZdqQFUgVHA5GpVr6xvc1h/O/v3bdECB2+xUilTT65inm1EUmQQqdVM2MbpkBPkuB1u4BJkAV3h4socX9fHCLl6xjxR4iH9OVewnVNKIZ1n4b70OUh6AlCe4/pqK7wHfH7z0OdLL56LcA0VV8M14ZSXJxj+gF0UQuR5UI4s8YxpfGHUHlPq0y+cg6tOmN2MV5XBiFl7cJoi7kHAhYXHdkFrKy4tRqyFd0kXgAt33gepDSAY1hBuOSlNmzJOOPTRz38AmXAMiUVKKn+mmbMxIikdey2BkvvigxHfGfJ0wOk7g0pg5RJed4oQ4QTLeTpN9gEl6PcPNEWR6TQ4aTeTkXtBk0AJIhqCrGfKZvkgSBIJZQzx2za1TSh/eGUgAK+FMBIbrakE7dE2iNBpj647FJMo0PjroIxiuie05BEFAey5JW28H44pv5NtHVnDWPQm6BiqgigverYDWDoEBVkEfEIKqmMqt9pnlT941+UEZIAdrNV3H8yDwwfMEuXSWFuMMEyPjONB1EMMxMR2TdL4HyZcZqpXzWvthzqZOgxsBSwZLgrwEebngViFjBKCrMCgCsTCtroSoGLoU5ulyn7As73GcjsHjxuMJBccBx4bdrbs51nOCTL4XwzLJ2iaGncO0THotA9txwJXABhwKV7tvbEngSAWt7XcJkGXqhxdRV6wxatXC22WAJcBvYMrZo0eNqllzqJ77WeJjJoKn8YOjq6mL1vJq5yFydh7DMcm6BoZvkJPMQqklwJcKZNw+Mg6Fsa6CpoKqcXOZxt2RZIe8d+t3v/XBiqHH7//49gEl1CDswOgH4OHRZWWfHjV+Mrfe9QZEHUZGa7h92Ax63SyxUBF24OD4DueVJLv+tgdk9cIviASSAAXoCaGM62Ck3UVt8q19e7c985i9fd2evlq5gJAuUtsIUArE58DY538ydCsJB4TPxypvQ0KmOjYMM2zgxPKk/BR7s3uhKwxppVAFqY+EANI6Y+3N644u/cwGnOxpSdUs4TreJc+Ci57JgM/mcsFguwAW8plf00Cb1EZZqAxbOPR4GRqzjSCFQBZgyGDK4EkFlK4I3NvRjxe8245IAD4A4QAifuE7hwS/Tu9mUnwiKTeFAHJevlBMqU8HlQAGBYVKOBLoAzGDf68jOhX5EWldEPLBB9Mzac6dotPuxPQM8l4eAqkA3+8+oPiQ0QUt+pp3bOMv+0aVwQ1kUGMsvuYr3GwuYWS2AgJG6NfiCgcZmVantZBHP9LJeJID0VX8uH09uFmKwz4Z6z9u+WRA5VO1d7CprJEDYaG9GRGlb1YIjiiCP4YFPy09xKzaBUC4cL5dDYuqMqBRXXMTjw75ZXjPEMHKsu1UV98CRNCUqxT4YlNkCdCBYqAIWZL5X7V/AC3K9MnQdPk5AAAAAElFTkSuQmCC',
		
		properties: {
			'id':    { ...idSchema,         readonly: true },
			'class': { ...identifierSchema, readonly: true },
			'name':  { type: 'string' }
		}
		
	});//////////////////////////////////////////////////////////////////////////
	
	
	const IsRelatedTo = M.RELATIONSHIP({
		
		name: 'IsRelatedTo',
		
		abstract: true,
		
		singular: "is related to",
		
		1: [Resource, '0..*'],
		2: [Resource, '0..*'],
		
		properties: {
			'id':    { ...idSchema,         readonly: true }, // TODO: id will disappear from relationships in future refactoring
			'class': { ...identifierSchema, readonly: true }
		}
		
	});
	
	
	const ExternalResource = M.RESOURCE({///////////////////////////////////////
		
		name: 'ExternalResource',
		
		extends: Resource,
		
		singular: "external resource",
		
		icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QQDEREV1RllFQAAA25JREFUWMPFl11sDFEYhp8zM7uLlrQRNITQNLgQCTd0kbouF2jFhaa1liYNvfCTiEjcE3EjqtmNTYuQKBJCJBKhIUgq/tIgLkhRfy1t7Xa77ezOuDiz25Z2O7O7+JK5mnPO+34/5/3OJ3BqteYc4CM5Mi3rE8wM9ogcEVAETJ0MQtjHjRsQjuWCgAEzCyFQBZNd9raoCrz6DLvOAWq2BBT40gM/+qGm1P62wimj06ZkAK0DkeTubSFofmh/c8IYXQPOCQTEN6Ac6EqROA1NDzIOZAYWEPeAHUC3TC74zzqLRHYEpA0A0eRV1BTojWaiA7WPDzm8+CbMngZsBuYlCTRuBZ83MyE67Ex18oFZSuoG6XBpN1Qsz1wJ3fbB84BFsoxNqQWX62HTshxIsSKgME9jkibGDHpXxIOeWJgCd2sQrE4Pfu05dPZCXdlEBEwoyNO4UV/Civl5fyx60QkbG+Btt1ybPwmOVkD1yvEPPvsIqoPg8oBLBf+qsSU7dQsM0yQ8kPhjwa2XsO4EvP1GyvOjFem9OtUK/jPyeuo67GmB4H3LY2W0EqaV4tY3sL0ZOr9bVA0Z9nSeN9yFA1dAj1uKJyAShX0t8n/RNJvdsK0DNjRAb7/VOPSJC67pIextgUE9BZIAvqMwMxKT/9zqcCMal0B4EFYfgaG45XkMTvpgYxrwy0/BFxr22uoZK2XcuIOgoH8Q+u0o4VQPNFaBqlr58sChq/D8w/jglSes0wTAENDlJyCeEBDPgErgPfAT6Bv5jZsCn1d2rj0XITIAvWFYexyu1kHZwtFh94UA18hm+Q74GR3RO25Ta64DSqyI2CvCHavBMGUBRQagLwJbghCqgfIlsuD2tlhem4A5BEoHELaUBag1ISAgINqBdsdvwp1r5FF15yGegK99sPsClBbDzXar4AC3ZlA84wuvP/WlsC3vs+uGwopEsMqqaQHvuuFCG/REk+Bwvd5kcZEuQ/Y32vE2LzT5hzNomjLsHhc8OgjeYgvb4SvZ0XugphRCPimtxGF6PrTuh2Vz5Wv3n8wFPq/Uh1OtcKwSViz4D4OJbxWsXwqzC3I4GQlAVexNGG4V5vwGrqnC9oAyJoG4Aa8+xyicopEwnM9bkUGDnmgcpyy0pPvhWIJd5zpkFYsM46kI0EQWNaAK/rUp/Gf7BTnyF+pF5ztFAAAAAElFTkSuQmCC',
		
		properties: {
			'uri':  { ...uriSchema, required: true },
			'type': { type: 'string'               } // "fma" or "cocomac", etc.
		}
		
	});/////////////////////////////////////////////////////////////////////////
	
	
	const IsExternallyRelatedTo = M.RELATIONSHIP({
		
		name: 'IsExternallyRelatedTo',
		
		extends: IsRelatedTo,
		
		singular: "is externally related to",
		
		1: [ExternalResource, '0..*'],
		2: [ExternalResource, '0..*'],
		
		properties: {
			'type': { type: 'string', required: true }
		}
		
	});
	
	
	const CorrespondsTo = M.RELATIONSHIP({
		
		name: 'CorrespondsTo',
		
		extends: IsRelatedTo,
		
		singular: "corresponds to",
		
		1: [Resource,         '0..*', { anchors: true, key: 'externals' }],
		2: [ExternalResource, '0..*', {                key: 'locals'    }],
		
	});
	
	
});
