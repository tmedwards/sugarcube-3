/***********************************************************************************************************************

	utils/assert.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Throws a JavaScript error if `claim` is `false`.  Either the given error or,
	if a string is given, a new `Error` with the given message.
*/
function assert(claim, error) {
	if (claim) {
		return;
	}

	throw error instanceof Error ? error : new Error(error);
}


/*
	Module Exports.
*/
export default assert;
