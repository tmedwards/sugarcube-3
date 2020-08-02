/***********************************************************************************************************************

	utils/samevaluezero.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns whether the passed values pass a SameValueZero comparison.

	SEE: https://tc39.es/ecma262/#sec-samevaluezero
*/
function sameValueZero(a, b) {
	return a === b || a !== a && b !== b;
}


/*
	Module Exports.
*/
export default sameValueZero;
