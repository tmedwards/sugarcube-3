/***********************************************************************************************************************

	utils/deepseal.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a deeply sealed version of the given object.

	WARNING: Does not handle cyclic graphs!
*/
function deepSeal(O) {
	// Only shallow seal functions.
	if (typeof O === 'function') {
		return Object.seal(O);
	}

	// Do not attempt to seal primitives.  Attempting to do so in ≥ES6-based
	// browsers will simply return the original value, but ES5-based browsers
	// will throw an exception.
	if (O === null || typeof O !== 'object') {
		return O;
	}

	// Recursively seal all descendant objects.
	Object.getOwnPropertyNames(O).concat(Object.getOwnPropertySymbols(O))
		.forEach(P => {
			const value = O[P];

			if (typeof value === 'object') {
				deepSeal(value);
			}
		});

	// Finally, seal and return the object itself.
	return Object.seal(O);
}


/*
	Module Exports.
*/
export default deepSeal;
