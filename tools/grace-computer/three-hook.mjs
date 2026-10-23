// Lets Node load the site's three.js modules: maps the bare 'three' import to the vendored build.
import {register} from 'node:module';
const vendor = new URL('../../prototypes/ranch-atelier/dist/vendor/three.module.js', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, next) { return s === 'three' ? {url: ${JSON.stringify(vendor)}, shortCircuit: true} : next(s, c); }`));
