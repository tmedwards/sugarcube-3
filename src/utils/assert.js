/***********************************************************************************************************************

	utils/assert.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Throws the given exception `ex`, if `result` is not `true`.
*/
function assert(result, ex) {
	if (typeof result !== 'boolean') {
		throw new TypeError('assert result parameter must be a boolean');
	}
	if (!(ex instanceof Error)) {
		throw new TypeError('assert ex parameter must be a native JavaScript exception or inherited from one');
	}

	if (!result) {
		/* eslint-disable no-param-reassign */
		ex.result = false;
		ex.expected = true;
		/* eslint-enable no-param-reassign */
		throw ex;
	}
}


/*
	Module Exports.
*/
export default assert;
