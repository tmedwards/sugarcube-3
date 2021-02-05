/***********************************************************************************************************************

	utils/clone.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import getTypeOf from './utils/gettypeof';


/*
	Returns a deep copy of the given object, which may contain circular references.

	Supports: arrays, {array buffers}, bigints, booleans, dates, functions, generic
	objects, maps, numbers, null, regexps, sets, strings, symbols, {typed arrays},
	and undefined.  Throws an error for any other value.

	NOTE: {…} = Currently unimplemented.

	WARNING: For generic objects, only their own enumerable properties are duplicated.
	Non-enumerable properties and property descriptors—e.g., getters/setters and
	configuration metadata—are not duplicated and likely will never be.
*/
const clone = (() => {
	function _clone(O, cache) {
		// Immediately return primitives and functions.
		if (typeof O !== 'object' || O === null) {
			return O;
		}

		// Check the cache and, if we get a hit, return the existing copy.
		if (cache.has(O)) {
			return cache.get(O);
		}

		let copy;
		let final = false;

		// Handle instances of supported object types and generic objects.
		//
		// NOTE: Each non-generic object that we wish to support must be explicitly
		// handled below.

		// Defer to objects' native `clone` method.
		if (typeof O.clone === 'function') {
			final = true;
			copy = O.clone(true);
		}

		// Initialize copies of `Array` objects.
		else if (O instanceof Array) {
			copy = new Array(O.length);
		}

		// Copy `Date` objects.
		else if (O instanceof Date) {
			final = true;
			copy = new Date(O.getTime());
		}

		// Copy `…Error` objects.
		else if (O instanceof Error) {
			final = true;
			copy = Object.create(O);
			Object.defineProperties(copy, Object.getOwnPropertyDescriptors(O));
		}

		// Initialize copies of `Map` objects.
		else if (O instanceof Map) {
			copy = new Map();
		}

		// Copy `RegExp` objects.
		else if (O instanceof RegExp) {
			final = true;
			copy = new RegExp(O);
			// TODO: Either make `Serial` also handle `.lastIndex` or remove this.
			copy.lastIndex = O.lastIndex;
		}

		// Initialize copies of `Set` objects.
		else if (O instanceof Set) {
			copy = new Set();
		}

		else {
			const type = getTypeOf(O);

			// Initialize copies of generic objects.
			if (type === 'Object') {
				// We try to ensure that the returned copy has the same prototype as
				// the original, but this may produce less than satisfactory results
				// on non-generics.
				copy = Object.create(Object.getPrototypeOf(O));
			}

			// Unsupported type, so get out the hot irons.
			else {
				throw new TypeError(`attempted to clone unsupported type: ${type}`);
			}
		}

		// Add an entry for the original→copy pair to the reference cache.
		cache.set(O, copy);

		if (final) {
			return copy;
		}

		// Duplicate the original's entries.
		if (O instanceof Array) {
			O.forEach((val, i) => copy[i] = _clone(val, cache));
		}
		else if (O instanceof Map) {
			O.forEach((val, key) => copy.set(_clone(key, cache), _clone(val, cache)));
		}
		else if (O instanceof Set) {
			O.forEach(val => copy.add(_clone(val, cache)));
		}

		// Duplicate the original's own enumerable properties.
		else {
			// WARNING: This does not preserve symbol properties. Neither does `Serial`,
			// however, so it's not really an issue at the moment.
			Object.keys(O).forEach(P => copy[P] = _clone(O[P], cache));
		}

		return copy;
	}

	function clone(O, cache = new Map()) {
		if (!(cache instanceof Map)) {
			throw new TypeError('clone cache parameter must be an instance of Map');
		}

		return _clone(O, cache);
	}

	return clone;
})();


/*
	Module Exports.
*/
export default clone;
