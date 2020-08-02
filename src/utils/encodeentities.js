/***********************************************************************************************************************

	utils/encodeentities.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import mappingFrom from './utils/mappingfrom';


/*
	Returns an entity encoded version of the passed string.

	NOTE: Only escapes the five primary special characters and the backquote.
*/
const encodeEntities = (() => {
	const htmlCharsRe    = /[&<>"'`]/g;
	const hasHtmlCharsRe = new RegExp(htmlCharsRe.source); // to drop the global flag
	const htmlCharsTable = mappingFrom({
		'&' : '&amp;',
		'<' : '&lt;',
		'>' : '&gt;',
		'"' : '&quot;',
		"'" : '&#39;',
		'`' : '&#96;'
	});

	function encodeEntities(str) {
		if (str == null) { // lazy equality for null
			return '';
		}

		const val = String(str);
		return val && hasHtmlCharsRe.test(val)
			? val.replace(htmlCharsRe, ch => htmlCharsTable[ch])
			: val;
	}

	return encodeEntities;
})();


/*
	Module Exports.
*/
export default encodeEntities;
