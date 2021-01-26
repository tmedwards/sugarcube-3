/***********************************************************************************************************************

	utils/createlink.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Engine from './engine';
import State from './state';
import Story from './story';


/*
	Returns an internal link created from the given parameters.
*/
function createLink(output, passage, text, callback) {
	const $link = jQuery(document.createElement('a'));

	if (passage != null) { // lazy equality for null
		$link.attr('data-passage', passage);

		if (Story.has(passage)) {
			$link.addClass('link-internal');

			if (Config.addVisitedLinkClass && State.hasPlayed(passage)) {
				$link.addClass('link-visited');
			}
		}
		else {
			$link.addClass('link-broken');
		}

		$link.ariaClick({ one : true }, () => {
			if (typeof callback === 'function') {
				callback();
			}

			Engine.play(passage);
		});
	}

	if (text) {
		$link.append(document.createTextNode(text));
	}

	if (output) {
		$link.appendTo(output);
	}

	// For legacy-compatibility we must return the DOM node.
	return $link[0];
}


/*
	Module Exports.
*/
export default createLink;
