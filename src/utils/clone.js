/***********************************************************************************************************************

	utils/clone.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a deep copy of the passed object.

	NOTE:
		1. `clone()` does not clone functions, however, since function definitions
			are immutable, the only issues are with expando properties and scope.
			The former really should not be done.  The latter is problematic either
			way—damned if you do, damned if you don't.
		2. `clone()` does not maintain referential relationships—e.g. multiple
			references to the same object will, post-cloning, refer to different
			equivalent objects; i.e. each reference will receive its own clone
			of the original object.
*/
function clone(orig) {
	// Immediately return the primitives and functions.
	if (typeof orig !== 'object' || orig === null) {
		return orig;
	}

	// Unbox instances of the primitive exemplar objects.
	if (orig instanceof Boolean) {
		return Boolean(orig);
	}
	if (orig instanceof Number) {
		return Number(orig);
	}
	if (orig instanceof String) {
		return String(orig);
	}

	// Honor native clone methods.
	if (typeof orig.clone === 'function') {
		return orig.clone(true);
	}
	if (orig.nodeType && typeof orig.cloneNode === 'function') {
		return orig.cloneNode(true);
	}

	// Create a copy of the original object.
	//
	// NOTE: Each non-generic object that we wish to support must be
	// explicitly handled below.
	let copy;

	// Handle instances of the core supported object types.
	if (orig instanceof Array) {
		copy = new Array(orig.length);
	}
	else if (orig instanceof Date) {
		copy = new Date(orig.getTime());
	}
	else if (orig instanceof Error) {
		// NOTE: It's impossible to perfectly clone `…Error` objects,
		// but this should work well enough.
		copy = Object.create(orig);
		// WARNING: If we ever change the property duplication code further below
		// to handle property descriptors, then this may also need to change.
		Object.defineProperties(copy, Object.getOwnPropertyDescriptors(orig));
	}
	else if (orig instanceof Map) {
		copy = new Map();
		orig.forEach((val, key) => copy.set(clone(key), clone(val)));
	}
	else if (orig instanceof Promise) {
		// NOTE: It's impossible to perfectly clone `Promise` objects,
		// but this should work well enough.
		copy = new Promise(
			(resolve, reject) => orig.then(
				value => resolve(clone(value)),
				error => reject(clone(error))
			)
		);
	}
	else if (orig instanceof RegExp) {
		copy = new RegExp(orig);
		copy.lastIndex = orig.lastIndex;
	}
	else if (orig instanceof Set) {
		copy = new Set();
		orig.forEach(val => copy.add(clone(val)));
	}

	// Handle instances of unknown or generic objects.
	else {
		// We try to ensure that the returned copy has the same prototype as
		// the original, but this will probably produce less than satisfactory
		// results on non-generics.
		//
		// TODO: This can probably be improved.
		copy = Object.create(Object.getPrototypeOf(orig));
	}

	// Duplicate the original object's own enumerable properties, which will
	// include expando properties on non-generic objects.
	//
	// NOTE: This preserves neither symbol properties nor ES5 property attributes.
	// Neither does the delta coding or serialization code, however, so it's not
	// really an issue at the moment.
	Object.keys(orig).forEach(name => copy[name] = clone(orig[name]));

	return copy;
}


/*
	Module Exports.
*/
export default clone;
