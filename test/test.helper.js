import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import 'babel-polyfill';
import 'polyfill-function-prototype-bind';
import chai                   from 'chai';
import sinon                  from 'sinon';

export { chai, sinon };

import genericPlugin          from './generic.plugin';
import propertiesPlugin       from './properties.plugin';
import resourceCheckingPlugin from './resourceChecking.plugin';
import chaiAsPromised         from 'chai-as-promised';
import chaiThings             from 'chai-things';
import sinonChai              from 'sinon-chai';

/* activating chai plugins */
chai.use(chaiAsPromised); // keep this as the first plugin or it messes up other plugins
chai.use(genericPlugin);
chai.use(propertiesPlugin);
chai.use(resourceCheckingPlugin);
chai.use(chaiThings);
chai.use(sinonChai);

/* direct exports from respective packages */
import mocha from 'mocha';
import {global} from 'utilities';
export const describe   = mocha.describe   || global.describe;
export const it         = mocha.it         || global.it;
export const beforeEach = mocha.beforeEach || global.beforeEach;
export const afterEach  = mocha.afterEach  || global.afterEach;
export const expect     = chai.expect;

/* importing rxjs */
import Rx from 'rxjs';
//noinspection JSAnnotator
global.Rx = Rx;
