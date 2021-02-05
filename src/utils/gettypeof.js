/***********************************************************************************************************************

	utils/gettypeof.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns the value `'null'` for `null`, the value yielded by `typeof` for
	primitives and functions, or the `@@toStringTag` internal property for objects.

	NOTE: In ≤ES5, returns the value of the `[[Class]]` internal slot for objects.

	Examples:
		getTypeOf(42n)            → 'bigint'
		getTypeOf(true)           → 'boolean'
		getTypeOf(function () {}) → 'function'
		getTypeOf(42)             → 'number'
		getTypeOf(null)           → 'null'
		getTypeOf("fnord")        → 'string'
		getTypeOf(Symbol("ZETA")) → 'symbol'
		getTypeOf(undefined)      → 'undefined'
		getTypeOf(['a', 'b'])     → 'Array'
		getTypeOf({ a : 'b' })    → 'Object'
		getTypeOf(new Date())     → 'Date'
		getTypeOf(new Map())      → 'Map'
		getTypeOf(new Set())      → 'Set'
		Etc.
*/
const getTypeOf = (() => {
	// Cache the `<Object>.toString()` method.
	const toString = Object.prototype.toString;

	function getTypeOf(O) {
		// Special case for `null`, since `typeof` is a buggy piece of shit.
		if (O === null) { return 'null'; }

		const baseType = typeof O;
		return baseType === 'object' ? toString.call(O).slice(8, -1) : baseType;
	}

	return getTypeOf;
})();


/*
	Module Exports.
*/
export default getTypeOf;
