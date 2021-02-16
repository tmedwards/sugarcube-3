/***********************************************************************************************************************

	utils/appenderror.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import I18n from '~/i18n/i18n';


/*
	Appends an error view to the given DOM element and logs a message to the console.
*/
function appendError(output, message, source) {
	const $wrapper = jQuery(document.createElement('div'));
	const $toggle  = jQuery(document.createElement('button'));
	const $source  = jQuery(document.createElement('pre'));
	const mesg     = `${I18n.get('errorTitle')}: ${message || 'unknown error'}`;

	$toggle
		.addClass('error-toggle')
		.ariaClick({
			label : I18n.get('errorToggle')
		}, () => {
			if ($toggle.hasClass('enabled')) {
				$toggle.removeClass('enabled');
				$source.attr({
					'aria-hidden' : true,
					hidden        : 'hidden'
				});
			}
			else {
				$toggle.addClass('enabled');
				$source.removeAttr('aria-hidden hidden');
			}
		})
		.appendTo($wrapper);
	jQuery(document.createElement('span'))
		.addClass('error')
		.text(mesg)
		.appendTo($wrapper);
	jQuery(document.createElement('code'))
		.text(source)
		.appendTo($source);
	$source
		.addClass('error-source')
		.attr({
			'aria-hidden' : true,
			hidden        : 'hidden'
		})
		.appendTo($wrapper);
	$wrapper
		.addClass('error-view')
		.appendTo(output);

	console.warn(`${mesg}\n\t${source.replace(/\n/g, '\n\t')}`);

	return false;
}


/*
	Module Exports.
*/
export default appendError;
