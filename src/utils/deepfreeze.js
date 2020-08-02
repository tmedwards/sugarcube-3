/***********************************************************************************************************************

	utils/deepfreeze.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a deeply frozen version of the given object.

	WARNING: Does not handle cyclic graphs!
*/
function deepFreeze(O) {
	// Only shallow freeze functions.
	if (typeof O === 'function') {
		return Object.freeze(O);
	}

	// Do not attempt to freeze primitives.  Attempting to do so in ≥ES6-based
	// browsers will simply return the original value, but ES5-based browsers
	// will throw an exception.
	if (O === null || typeof O !== 'object') {
		return O;
	}

	// Recursively freeze all descendant objects.
	Object.getOwnPropertyNames(O).concat(Object.getOwnPropertySymbols(O))
		.forEach(P => {
			const value = O[P];

			if (typeof value === 'object') {
				deepFreeze(value);
			}
		});

	// Finally, freeze and return the object itself.
	return Object.freeze(O);
}


/*
	Module Exports.
*/
export default deepFreeze;
