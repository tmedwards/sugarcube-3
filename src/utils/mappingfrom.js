/***********************************************************************************************************************

	utils/mappingfrom.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a mapping table object created from the given Array, Map, Set, or generic object.
*/
function mappingFrom(O) {
	const pEnum = Object.create(null);

	if (O instanceof Array) {
		O.forEach((val, i) => pEnum[String(val)] = i);
	}
	else if (O instanceof Set) {
		// NOTE: Use `<Array>.forEach()` here rather than `<Set>.forEach()`
		// as the latter does not provide the indices we require.
		Array.from(O).forEach((val, i) => pEnum[String(val)] = i);
	}
	else if (O instanceof Map) {
		O.forEach((val, key) => pEnum[String(key)] = val);
	}
	else if (
		O !== null
		&& typeof O === 'object'
		&& Object.getPrototypeOf(O) === Object.prototype
	) {
		Object.assign(pEnum, O);
	}
	else {
		throw new TypeError('mappingFrom O parameter must be an Array, Map, Set, or generic object');
	}

	return Object.freeze(pEnum);
}


/*
	Module Exports.
*/
export default mappingFrom;
