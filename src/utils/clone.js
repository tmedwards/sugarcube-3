/***********************************************************************************************************************

	utils/clone.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a deep copy of the given object.

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
const clone = (() => {
	function _clone(orig, cache) {
		// Immediately return the primitives and functions.
		if (typeof orig !== 'object' || orig === null) {
			return orig;
		}

		// Unbox instances of the primitive exemplar objects.
		//
		// QUESTION: Do we really want to do this?
		if (orig instanceof Boolean) {
			return Boolean(orig);
		}
		if (orig instanceof Number) {
			return Number(orig);
		}
		if (orig instanceof String) {
			return String(orig);
		}

		// Check the cache and, if we get a hit, return the existing copy.
		if (cache.has(orig)) {
			return cache.get(orig);
		}

		// Create a copy of the original object.
		let copyProps = true;
		let copy;

		// Handle objects with native clone methods.
		if (typeof orig.clone === 'function') {
			copyProps = false;
			copy = orig.clone(true);
		}

		// Handle `Node` instances.
		else if (orig.nodeType && typeof orig.cloneNode === 'function') {
			copyProps = false;
			copy = orig.cloneNode(true);
		}

		// Handle instances of the core supported object types, unknown, and
		// generic objects.
		//
		// NOTE: Each non-generic object that we wish to support must be
		// explicitly handled below.

		// Handle `Array` instances.
		else if (orig instanceof Array) {
			copy = new Array(orig.length);
		}

		// Handle `Date` instances.
		else if (orig instanceof Date) {
			copy = new Date(orig.getTime());
		}

		// Handle `Error` instances.
		else if (orig instanceof Error) {
			// NOTE: It's impossible to perfectly clone `…Error` objects,
			// but this should work well enough.
			copy = Object.create(orig);
			// WARNING: If we ever change the property duplication code further below
			// to handle property descriptors, then this may also need to change.
			Object.defineProperties(copy, Object.getOwnPropertyDescriptors(orig));
		}

		// Handle `Map` instances.
		else if (orig instanceof Map) {
			copy = new Map();
			orig.forEach((val, key) => copy.set(_clone(key, cache), _clone(val, cache)));
		}

		// Handle `Promise` instances.
		else if (orig instanceof Promise) {
			// NOTE: It's impossible to perfectly clone `Promise` objects,
			// but this should work well enough.
			copy = new Promise(
				(resolve, reject) => orig.then(
					value => resolve(_clone(value, cache)),
					error => reject(_clone(error, cache))
				)
			);
		}

		// Handle `RegExp` instances.
		else if (orig instanceof RegExp) {
			copy = new RegExp(orig);
			copy.lastIndex = orig.lastIndex;
		}

		// Handle `Set` instances.
		else if (orig instanceof Set) {
			copy = new Set();
			orig.forEach(val => copy.add(_clone(val, cache)));
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

		// Add an entry for the orig→copy pair to the reference cache.
		cache.set(orig, copy);

		// If necessary, copy the properties of the original object.
		if (copyProps) {
			// Duplicate the original object's own enumerable properties, which will
			// include expando properties on non-generic objects.
			//
			// NOTE: This preserves neither symbol properties nor property attributes.
			// Neither does the serialization code, however, so it's not really an issue
			// at the moment.
			Object.keys(orig).forEach(name => copy[name] = _clone(orig[name], cache));
		}

		return copy;
	}

	function clone(orig, refCache) {
		const cache = refCache ?? new Map();

		if (!(cache instanceof Map)) {
			throw new TypeError('clone refCache parameter must be an instance of Map');
		}

		return _clone(orig, cache);
	}

	return clone;
})();


/*
	Module Exports.
*/
export default clone;
