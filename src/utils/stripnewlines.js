/***********************************************************************************************************************

	utils/stripnewlines.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Return a copy of the given string with the leading & trailing newlines removed
	and all internal sequences of newlines compacted into single spaces.
*/
const stripNewlines = (() => {
	const startEndRE = /^\n+|\n+$/g;
	const internalRE = /\n+/g;

	function stripNewlines(source) {
		startEndRE.lastIndex = internalRE.lastIndex = 0;
		return String(source).replace(startEndRE, '').replace(internalRE, ' ');
	}

	return stripNewlines;
})();


/*
	Module Exports.
*/
export default stripNewlines;
