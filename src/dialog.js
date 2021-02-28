/***********************************************************************************************************************

	dialog.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Has from '~/lib/has';
import I18n from '~/i18n/i18n';
import getActiveElement from '~/utils/getactiveelement';


/*
	Dialog API static object.
*/
const Dialog = (() => {
	// Dialog element caches.
	let $overlay       = null;
	let $dialog        = null;
	let $dialogTitle   = null;
	let $dialogBody    = null;

	// The last active/focused non-dialog element.
	let lastActive     = null;

	// The width of the browser's scrollbars.
	let scrollbarWidth = 0;

	// Dialog mutation resize handler.
	let dialogObserver = null;


	/*******************************************************************************
		Dialog Functions.
	*******************************************************************************/

	function dialogBodyAppend(...args) {
		$dialogBody.append(...args);
		return Dialog;
	}

	function dialogBody() {
		return $dialogBody.get(0);
	}

	function dialogClose(ev) {
		// Trigger a `:dialogclosing` event on the dialog body.
		$dialogBody.trigger(':dialogclosing');

		// Largely reverse the actions taken in `dialogOpen()`.
		jQuery(document)
			.off('.dialog-close');
		if (dialogObserver) {
			dialogObserver.disconnect();
			dialogObserver = null;
		}
		else {
			$dialogBody
				.off('.dialog-resize');
		}
		jQuery(window)
			.off('.dialog-resize');
		$dialog
			.removeAttr('data-open')
			.css({ left : '', right : '', top : '', bottom : '' });

		jQuery('#ui-bar,#story')
			.find('[tabindex=-2]')
			.removeAttr('aria-hidden')
			.attr('tabindex', 0);
		jQuery('body>[tabindex=-3]')
			.removeAttr('aria-hidden')
			.removeAttr('tabindex');

		$overlay
			.removeAttr('data-open');
		jQuery(document.documentElement)
			.removeAttr('data-dialog');

		// Clear the dialog's content.
		$dialog
			.removeClass();
		$dialogTitle
			.empty();
		$dialogBody
			.empty()
			.removeClass();

		// Attempt to restore focus to whichever element had it prior to opening the dialog.
		if (lastActive !== null) {
			jQuery(lastActive).focus();
			lastActive = null;
		}

		// Call the given "on close" callback function, if any.
		if (ev && ev.data && typeof ev.data.closeFn === 'function') {
			ev.data.closeFn(ev);
		}

		// Trigger a `:dialogclosed` event on the dialog body.
		$dialogBody.trigger(':dialogclosed');

		return Dialog;
	}

	function dialogFinalize() {
		if (BUILD_DEBUG) { console.log('[Dialog/dialogFinalize()]'); }

		$dialog.find('#ui-dialog-close').attr('aria-label', I18n.get('close'));
	}

	function dialogInit() {
		if (BUILD_DEBUG) { console.log('[Dialog/dialogInit()]'); }

		if (document.getElementById('ui-dialog')) {
			return;
		}

		// Calculate and cache the width of scrollbars.
		scrollbarWidth = (() => {
			let scrollbarWidth;

			try {
				const inner = document.createElement('p');
				const outer = document.createElement('div');

				inner.style.width      = '100%';
				inner.style.height     = '200px';
				outer.style.position   = 'absolute';
				outer.style.left       = '0px';
				outer.style.top        = '0px';
				outer.style.width      = '100px';
				outer.style.height     = '100px';
				outer.style.visibility = 'hidden';
				outer.style.overflow   = 'hidden';

				outer.appendChild(inner);
				document.body.appendChild(outer);

				const w1 = inner.offsetWidth;
				// The `overflow: scroll` style property value does not work consistently
				// with scrollbars which are styled with `::-webkit-scrollbar`, so we use
				// `overflow: auto` with dimensions guaranteed to force a scrollbar.
				outer.style.overflow = 'auto';
				let w2 = inner.offsetWidth;

				if (w1 === w2) {
					w2 = outer.clientWidth;
				}

				document.body.removeChild(outer);

				scrollbarWidth = w1 - w2;
			}
			catch (ex) { /* no-op */ }

			return scrollbarWidth || 17; // 17px is a reasonable failover
		})();

		// Generate the dialog elements and insert them into the page before the
		// main script.
		jQuery(document.createDocumentFragment())
			.append(
				  '<div id="ui-overlay" class="ui-close"></div>'
				+ '<div id="ui-dialog" tabindex="0" role="dialog" aria-labelledby="ui-dialog-title">'
				+     '<div id="ui-dialog-titlebar">'
				+         '<h1 id="ui-dialog-title"></h1>'
				+         '<button id="ui-dialog-close" class="ui-close" tabindex="0" aria-label=""></button>'
				+     '</div>'
				+     '<div id="ui-dialog-body"></div>'
				+ '</div>'
			)
			.insertBefore('body>script#script-sugarcube');

		// Cache the dialog elements, since they're going to be used often.
		//
		// NOTE: We rewrap the elements themselves, rather than simply using
		// the results of `find()`, so that we cache uncluttered jQuery-wrappers
		// (i.e. `context` refers to the elements and there is no `prevObject`).
		$overlay     = jQuery('#ui-overlay');
		$dialog      = jQuery('#ui-dialog');
		$dialogTitle = jQuery($dialog.find('#ui-dialog-title').get(0));
		$dialogBody  = jQuery($dialog.find('#ui-dialog-body').get(0));
	}

	function dialogIsOpen(classNames) {
		return $dialog.is('[data-open]')
			&& (classNames ? classNames.splitOrEmpty(/\s+/).every(cn => $dialogBody.hasClass(cn)) : true);
	}

	function dialogOpen(options, closeFn) {
		// Trigger a `:dialogopening` event on the dialog body.
		$dialogBody.trigger(':dialogopening');

		// Merge the options onto our defaults and grab the ones we care about.
		const { top } = { top : 50, ...options };

		// Record the last active/focused non-dialog element.
		if (!dialogIsOpen()) {
			lastActive = getActiveElement();
		}

		// Add the `data-dialog` attribute to <html> (mostly used to style <body>).
		jQuery(document.documentElement)
			.attr('data-dialog', 'open');

		// Display the overlay.
		$overlay
			.attr('data-open', 'open');

		/*
			Add the imagesLoaded handler to the dialog body, if necessary.

			NOTE: We use `querySelector()` here as jQuery has no simple way to
			check if, and only if, at least one element of the specified type
			exists.  The best that jQuery offers is analogous to `querySelectorAll()`,
			which enumerates all elements of the specified type.
		*/
		if ($dialogBody[0].querySelector('img') !== null) {
			$dialogBody
				.imagesLoaded()
				.always(() => resizeHandler({ data : { top } }));
		}

		// Add `aria-hidden=true` to all direct non-dialog-children of <body> to
		// hide the underlying page from screen readers while the dialog is open.
		jQuery('body>:not(script,tw-storydata,#ui-bar,#ui-overlay,#ui-dialog)')
			.attr('tabindex', -3)
			.attr('aria-hidden', true);
		jQuery('#ui-bar,#story')
			.find('[tabindex]:not([tabindex^=-])')
			.attr('tabindex', -2)
			.attr('aria-hidden', true);

		// Display the dialog.
		$dialog
			.css(calcPosition(top))
			.attr('data-open', 'open')
			.focus();

		// Add the UI resize handler.
		jQuery(window)
			.on('resize.dialog-resize', null, { top }, jQuery.throttle(40, resizeHandler));

		// Add the dialog mutation resize handler.
		if (Has.mutationObserver) {
			dialogObserver = new MutationObserver(mutations => {
				for (let i = 0; i < mutations.length; ++i) {
					if (mutations[i].type === 'childList') {
						resizeHandler({ data : { top } });
						break;
					}
				}
			});
			dialogObserver.observe($dialogBody[0], {
				childList : true,
				subtree   : true
			});
		}
		else {
			$dialogBody
				.on(
					'DOMNodeInserted.dialog-resize DOMNodeRemoved.dialog-resize',
					null,
					{ top },
					jQuery.throttle(40, resizeHandler)
				);
		}

		// Set up the delegated UI close handler.
		jQuery(document)
			.one('click.dialog-close', '.ui-close', { closeFn }, ev => {
				// NOTE: Do not allow this event handler to return the `Dialog` static object,
				// as doing so causes Edge (ca. 18) to throw a "Number expected" exception due
				// to `Dialog` not having a prototype.
				dialogClose(ev);
				return undefined;
			})
			.one('keypress.dialog-close', '.ui-close', function (ev) {
				if (ev.which === 13 /* Enter/Return */ || ev.which === 32 /* Spacebar */) {
					jQuery(this).trigger('click');
				}
			});

		// Trigger a `:dialogopened` event on the dialog body.
		$dialogBody.trigger(':dialogopened');

		return Dialog;
	}

	function dialogResize(data) {
		return resizeHandler(typeof data === 'object' ? { data } : undefined);
	}

	function dialogSetup(title, classNames) {
		$dialog
			.removeClass();
		$dialogTitle
			.empty()
			.append(title ?? '\u00A0'); // lazy equality for null
		$dialogBody
			.empty();

		if (classNames != null) { // lazy equality for null
			$dialog.addClass(classNames);
		}

		return Dialog;
	}

	function dialogBodyWiki(...args) {
		$dialogBody.wiki(...args);
		return Dialog;
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function calcPosition(topPos) {
		const top       = topPos != null ? topPos : 50; // lazy equality for null
		const $parent   = jQuery(window);
		const dialogPos = { left : '', right : '', top : '', bottom : '' };

		// Unset the dialog's positional properties before checking its dimensions.
		$dialog.css(dialogPos);

		let horzSpace = $parent.width() - $dialog.outerWidth(true) - 1;   // -1 to address a Firefox issue
		let vertSpace = $parent.height() - $dialog.outerHeight(true) - 1; // -1 to address a Firefox issue

		if (horzSpace <= 32 + scrollbarWidth) {
			vertSpace -= scrollbarWidth;
		}

		if (vertSpace <= 32 + scrollbarWidth) {
			horzSpace -= scrollbarWidth;
		}

		if (horzSpace <= 32) {
			dialogPos.left = dialogPos.right = 16;
		}
		else {
			dialogPos.left = dialogPos.right = horzSpace / 2 >> 0;
		}

		if (vertSpace <= 32) {
			dialogPos.top = dialogPos.bottom = 16;
		}
		else {
			if (vertSpace / 2 > top) {
				dialogPos.top = top;
			}
			else {
				dialogPos.top = dialogPos.bottom = vertSpace / 2 >> 0;
			}
		}

		Object.keys(dialogPos).forEach(key => {
			if (dialogPos[key] !== '') {
				dialogPos[key] += 'px';
			}
		});

		return dialogPos;
	}

	function resizeHandler(ev) {
		const top = ev && ev.data && typeof ev.data.top !== 'undefined' ? ev.data.top : 50;

		if ($dialog.css('display') === 'block') {
			// Stow the dialog.
			$dialog.css({ display : 'none' });

			// Restore the dialog with its new positional properties.
			$dialog.css(jQuery.extend({ display : '' }, calcPosition(top)));
		}
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		append   : { value : dialogBodyAppend },
		body     : { value : dialogBody },
		close    : { value : dialogClose },
		finalize : { value : dialogFinalize },
		init     : { value : dialogInit },
		isOpen   : { value : dialogIsOpen },
		open     : { value : dialogOpen },
		resize   : { value : dialogResize },
		setup    : { value : dialogSetup },
		wiki     : { value : dialogBodyWiki }
	}));
})();


/*
	Module Exports.
*/
export default Dialog;
