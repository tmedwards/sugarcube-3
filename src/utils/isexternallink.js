/***********************************************************************************************************************

	utils/isexternallink.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Patterns from './lib/patterns';
import Story from './story';


/*
	Returns whether the given link source is external (probably).
*/
const isExternalLink = (() => {
	const externalUrlRe = new RegExp(`^${Patterns.externalUrl}`, 'gim');
	const fingerprintRe = /[/.?#]/;

	function isExternalLink(link) {
		return !Story.has(link) && (externalUrlRe.test(link) || fingerprintRe.test(link));
	}

	return isExternalLink;
})();


/*
	Module Exports.
*/
export default isExternalLink;
