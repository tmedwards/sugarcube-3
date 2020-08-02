/***********************************************************************************************************************

	utils/createexternallink.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns an external link created from the passed parameters.
*/
function createExternalLink(output, url, text) {
	const $link = jQuery(document.createElement('a'))
		.attr('target', '_blank')
		.addClass('link-external')
		.text(text)
		.appendTo(output);

	if (url != null) { // lazy equality for null
		$link.attr({
			href     : url,
			tabindex : 0 // for accessiblity
		});
	}

	// For legacy-compatibility we must return the DOM node.
	return $link[0];
}


/*
	Module Exports.
*/
export default createExternalLink;
