import resources      from './modules/resources';
import typed          from './modules/typed';
import lyphs          from './modules/lyphs';
import groups         from './modules/groups';
import measurables    from './modules/measurables';
import processes      from './modules/processes';
import canonicalTrees from './modules/canonicalTrees';
import research       from './modules/research';

import Module from './modules/Module.js';

export default Module.create('all', [
	resources,
	typed,
	lyphs,
	groups,
	measurables,
	processes,
	research,
	canonicalTrees,
]);
