/***********************************************************************************************************************

	utils/isiterable.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns whether the passed value has an iterator function.
*/
const isIterable = (() => {
	// If the browser does not support symbols, then return a version
	// of `isIterable()` that simply returns `false`.
	if (typeof Symbol !== 'function' || typeof Symbol.iterator !== 'symbol') {
		return function isIterable() {
			return false;
		};
	}

	// Elsewise, return the regular `isIterable()` function.
	return function isIterable(O) {
		return O != null && typeof O[Symbol.iterator] === 'function'; // lazy equality for null
	};
})();


/*
	Module Exports.
*/
export default isIterable;
