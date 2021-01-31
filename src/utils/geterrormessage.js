/***********************************************************************************************************************

	utils/geterrormessage.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns the value of the `message` property of the given value, if an
	object with such a property, or the value itself.
*/
function getErrorMessage(O) {
	return typeof O === 'object' && O !== null && 'message' in O ? O.message : O;
}


/*
	Module Exports.
*/
export default getErrorMessage;
