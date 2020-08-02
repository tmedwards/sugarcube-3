/***********************************************************************************************************************

	utils/encodeentities.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import mappingFrom from './utils/mappingfrom';


/*
	Returns a decoded version of the passed entity encoded string.

	NOTE: The extended replacement set here, in contrast to `encodeEntities()`,
	is required due to observed stupidity from various sources.
*/
const decodeEntities = (() => {
	const escapedHtmlRe    = /&(?:amp|#38|#x26|lt|#60|#x3c|gt|#62|#x3e|quot|#34|#x22|apos|#39|#x27|#96|#x60);/gi;
	const hasEscapedHtmlRe = new RegExp(escapedHtmlRe.source, 'i'); // to drop the global flag
	const escapedHtmlTable = mappingFrom({
		'&amp;'  : '&', // ampersand (HTML character entity, XML predefined entity)
		'&#38;'  : '&', // ampersand (decimal numeric character reference)
		'&#x26;' : '&', // ampersand (hexadecimal numeric character reference)
		'&lt;'   : '<', // less-than (HTML character entity, XML predefined entity)
		'&#60;'  : '<', // less-than (decimal numeric character reference)
		'&#x3c;' : '<', // less-than (hexadecimal numeric character reference)
		'&gt;'   : '>', // greater-than (HTML character entity, XML predefined entity)
		'&#62;'  : '>', // greater-than (decimal numeric character reference)
		'&#x3e;' : '>', // greater-than (hexadecimal numeric character reference)
		'&quot;' : '"', // double quote (HTML character entity, XML predefined entity)
		'&#34;'  : '"', // double quote (decimal numeric character reference)
		'&#x22;' : '"', // double quote (hexadecimal numeric character reference)
		'&apos;' : "'", // apostrophe (XML predefined entity)
		'&#39;'  : "'", // apostrophe (decimal numeric character reference)
		'&#x27;' : "'", // apostrophe (hexadecimal numeric character reference)
		'&#96;'  : '`', // backquote (decimal numeric character reference)
		'&#x60;' : '`'  // backquote (hexadecimal numeric character reference)
	});

	function decodeEntities(str) {
		if (str == null) { // lazy equality for null
			return '';
		}

		const val = String(str);
		return val && hasEscapedHtmlRe.test(val)
			? val.replace(escapedHtmlRe, entity => escapedHtmlTable[entity.toLowerCase()])
			: val;
	}

	return decodeEntities;
})();


/*
	Module Exports.
*/
export default decodeEntities;
