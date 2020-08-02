/***********************************************************************************************************************

	utils/hasown.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns whether the given object has an own property by the given name.
*/
const hasOwn = (() => {
	// Cache the `<Object>.hasOwnProperty()` method.
	const hasOwnProperty = Object.prototype.hasOwnProperty;

	function hasOwn(O, P) {
		return hasOwnProperty.call(O, P);
	}

	return hasOwn;
})();


/*
	Module Exports.
*/
export default hasOwn;
