/***********************************************************************************************************************

	utils/gettypeof.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns the value `'null'` for `null`, the value yielded by `typeof` for
	primitives and functions, or the `@@toStringTag` internal property for objects.

	NOTE: In ≤ES5, returns the value of the `[[Class]]` internal slot for objects.

	Examples:
		getTypeOf(null)           → 'null'
		getTypeOf(undefined)      → 'undefined'
		getTypeOf(true)           → 'boolean'
		getTypeOf(42)             → 'number'
		getTypeOf("fnord")        → 'string'
		getTypeOf(function () {}) → 'function'
		getTypeOf(['a', 'b'])     → 'Array'
		getTypeOf({ a : 'b' })    → 'Object'
		getTypeOf(new Date())     → 'Date'
		getTypeOf(new Map())      → 'Map'
		getTypeOf(new Set())      → 'Set'
*/
const getTypeOf = (() => {
	// Cache the `<Object>.toString()` method.
	const toString = Object.prototype.toString;

	// If the browser is using the `Map()` and `Set()` polyfills, then return a
	// version of `getTypeOf()` that contains special cases for them, since they
	// do not have a `[[Class]]` internal slot and the `@@toStringTag` internal
	// property is unavailable to them.
	if (toString.call(new Map()) === '[object Object]') {
		return function getTypeOf(O) {
			// Special case for `null`, since `typeof` is a buggy piece of shit.
			if (O === null) { return 'null'; }

			// Special cases for the `Map` and `Set` polyfills.
			//
			// NOTE: We don't special case the `WeakMap` and `WeakSet` polyfills
			// here since they're (a) unlikely to be used and (b) broken anyway.
			if (O instanceof Map) { return 'Map'; }
			if (O instanceof Set) { return 'Set'; }

			const baseType = typeof O;
			return baseType === 'object' ? toString.call(O).slice(8, -1) : baseType;
		};
	}

	// Elsewise, return the regular `getTypeOf()` function.
	return function getTypeOf(O) {
		// Special case for `null`, since `typeof` is a buggy piece of shit.
		if (O === null) { return 'null'; }

		const baseType = typeof O;
		return baseType === 'object' ? toString.call(O).slice(8, -1) : baseType;
	};
})();


/*
	Module Exports.
*/
export default getTypeOf;
