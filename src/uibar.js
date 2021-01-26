/***********************************************************************************************************************

	uibar.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Alert from './lib/alert';
import Config from './config';
import Dialog from './dialog';
import Engine from './engine';
import L10n from './l10n/l10n';
import { MIN_DOM_ACTION_DELAY } from './constants';
import Setting from './setting';
import State from './state';
import Story from './story';
import UI from './ui';
import setDisplayTitle from './utils/setdisplaytitle';
import setPageElement from './utils/setpageelement';


/*
	UIBar API static object.
*/
const UIBar = (() => {
	// UI bar element cache.
	let $uiBar = null;


	/*******************************************************************************
		UI Bar Functions.
	*******************************************************************************/

	function uiBarDestroy() {
		if (BUILD_DEBUG) { console.log('[UIBar/uiBarDestroy()]'); }

		if (!$uiBar) {
			return;
		}

		// Hide the UI bar.
		$uiBar.hide();

		// Remove its namespaced events.
		jQuery(document).off('.ui-bar');

		// Remove its styles.
		jQuery(document.head).find('#style-ui-bar').remove();

		// Remove it from the DOM.
		$uiBar.remove();

		// Drop the reference to the element.
		$uiBar = null;
	}

	function uiBarHide() {
		if ($uiBar) {
			$uiBar.hide();
		}

		return this;
	}

	function uiBarInit() {
		if (BUILD_DEBUG) { console.log('[UIBar/uiBarInit()]'); }

		if (document.getElementById('ui-bar')) {
			return;
		}

		if (Story.has('StoryInterface') && Boolean(Story.get('StoryInterface').source.trim())) {
			// Remove its styles.
			jQuery(document.head).find('#style-ui-bar').remove();

			return;
		}

		// Generate the UI bar elements.
		const $elems = (() => {
			const toggleLabel   = L10n.get('uiBarToggle');
			const backwardLabel = L10n.get('uiBarBackward');
			const jumptoLabel   = L10n.get('uiBarJumpto');
			const forwardLabel  = L10n.get('uiBarForward');

			return jQuery(document.createDocumentFragment())
				.append(
					/* eslint-disable max-len */
					  '<div id="ui-bar">'
					+     '<div id="ui-bar-tray">'
					+         `<button id="ui-bar-toggle" tabindex="0" title="${toggleLabel}" aria-label="${toggleLabel}"></button>`
					+         '<div id="ui-bar-history">'
					+             `<button id="history-backward" tabindex="0" title="${backwardLabel}" aria-label="${backwardLabel}">\uE821</button>`
					+             `<button id="history-jumpto" tabindex="0" title="${jumptoLabel}" aria-label="${jumptoLabel}">\uE839</button>`
					+             `<button id="history-forward" tabindex="0" title="${forwardLabel}" aria-label="${forwardLabel}">\uE822</button>`
					+         '</div>'
					+     '</div>'
					+     '<div id="ui-bar-body">'
					+         '<header id="title" role="banner">'
					+             '<div id="story-banner"></div>'
					+             '<h1 id="story-title"></h1>'
					+             '<div id="story-subtitle"></div>'
					+             '<div id="story-title-separator"></div>'
					+             '<p id="story-author"></p>'
					+         '</header>'
					+         '<div id="story-caption"></div>'
					+         '<nav id="menu" role="navigation">'
					+             '<ul id="menu-story"></ul>'
					+             '<ul id="menu-core">'
					+                 `<li id="menu-item-saves"><a tabindex="0">${L10n.get('savesTitle')}</a></li>`
					+                 `<li id="menu-item-settings"><a tabindex="0">${L10n.get('settingsTitle')}</a></li>`
					+                 `<li id="menu-item-restart"><a tabindex="0">${L10n.get('restartTitle')}</a></li>`
					+             '</ul>'
					+         '</nav>'
					+     '</div>'
					+ '</div>'
					/* eslint-enable max-len */
				);
		})();

		/*
			Cache the UI bar element, since its going to be used often.

			NOTE: We rewrap the element itself, rather than simply using the result
			of `find()`, so that we cache an uncluttered jQuery-wrapper (i.e. `context`
			refers to the element and there is no `prevObject`).
		*/
		$uiBar = jQuery($elems.find('#ui-bar').get(0));

		// Insert the UI bar elements into the page before the main script.
		$elems.insertBefore('body>script#script-sugarcube');
	}

	function uiBarIsHidden() {
		return $uiBar && $uiBar.css('display') === 'none';
	}

	function uiBarIsStowed() {
		return $uiBar && $uiBar.hasClass('stowed');
	}

	function uiBarShow() {
		if ($uiBar) {
			$uiBar.show();
		}

		return this;
	}

	function uiBarStart() {
		if (BUILD_DEBUG) { console.log('[UIBar/uiBarStart()]'); }

		if (!$uiBar) {
			return;
		}

		// Set up the #ui-bar's initial state.
		if (
			typeof Config.ui.stowBarInitially === 'boolean'
				? Config.ui.stowBarInitially
				: jQuery(window).width() <= Config.ui.stowBarInitially
		) {
			uiBarStow(true);
		}

		// Set up the #ui-bar-toggle and #ui-bar-history widgets.
		jQuery('#ui-bar-toggle')
			.ariaClick({
				label : L10n.get('uiBarToggle')
			}, () => $uiBar.toggleClass('stowed'));

		if (Config.ui.historyControls) {
			const $backward = jQuery('#history-backward');
			const $forward  = jQuery('#history-forward');

			// Set up a global handler for `:historyupdate` events.
			jQuery(document)
				.on(':historyupdate.ui-bar', () => {
					$backward.ariaDisabled(State.length < 2);
					$forward.ariaDisabled(State.length === State.size);
				});

			$backward
				.ariaDisabled(State.length < 2)
				.ariaClick({
					label : L10n.get('uiBarBackward')
				}, () => Engine.backward());

			if (Story.lookup('tags', 'bookmark').length > 0) {
				jQuery('#history-jumpto')
					.ariaClick({
						label : L10n.get('uiBarJumpto')
					}, () => UI.jumpto());
			}
			else {
				jQuery('#history-jumpto').remove();
			}

			$forward
				.ariaDisabled(State.length === State.size)
				.ariaClick({
					label : L10n.get('uiBarForward')
				}, () => Engine.forward());
		}
		else {
			jQuery('#ui-bar-history').remove();
		}

		// Set up the story display title.
		if (Story.has('StoryDisplayTitle')) {
			setDisplayTitle(Story.get('StoryDisplayTitle').text);
		}
		else {
			// Twine 1 build.
			if (BUILD_TWINE_1) {
				setPageElement('story-title', 'StoryTitle', Story.title);
			}
			// Twine 2 build.
			else {
				jQuery('#story-title').text(Story.title);
			}
		}

		// Set up the dynamic page elements.
		if (!Story.has('StoryCaption')) {
			jQuery('#story-caption').remove();
		}

		if (!Story.has('StoryMenu')) {
			jQuery('#menu-story').remove();
		}

		// Set up the Saves menu item.
		jQuery('#menu-item-saves a')
			.ariaClick(ev => {
				ev.preventDefault();
				UI.buildSaves();
				Dialog.open();
			})
			.text(L10n.get('savesTitle'));

		// Set up the Settings menu item.
		if (!Setting.isEmpty()) {
			jQuery('#menu-item-settings a')
				.ariaClick(ev => {
					ev.preventDefault();
					UI.buildSettings();
					Dialog.open();
				})
				.text(L10n.get('settingsTitle'));
		}
		else {
			jQuery('#menu-item-settings').remove();
		}

		// Set up the Restart menu item.
		jQuery('#menu-item-restart a')
			.ariaClick(ev => {
				ev.preventDefault();
				UI.buildRestart();
				Dialog.open();
			})
			.text(L10n.get('restartTitle'));

		// Schedule routine updates of the dynamic page elements on `:passagedisplay`.
		jQuery(document).on(':passagedisplay.ui-bar', () => {
			if (Config.ui.updateStoryElements) {
				uiBarUpdate();
			}
		});

		// Schedule a one-time update of the dynamic page elements, if they're not
		// initially configured to routinely update on `:passagedisplay`.
		if (!Config.ui.updateStoryElements) {
			jQuery(document).one(':passagedisplay.ui-bar', () => uiBarUpdate);
		}
	}

	function uiBarStow(noAnimation) {
		if ($uiBar && !$uiBar.hasClass('stowed')) {
			let $story;

			if (noAnimation) {
				$story = jQuery('#story');
				$story.addClass('no-transition');
				$uiBar.addClass('no-transition');
			}

			$uiBar.addClass('stowed');

			if (noAnimation) {
				setTimeout(() => {
					$story.removeClass('no-transition');
					$uiBar.removeClass('no-transition');
				}, MIN_DOM_ACTION_DELAY);
			}
		}

		return this;
	}

	function uiBarUnstow(noAnimation) {
		if ($uiBar && $uiBar.hasClass('stowed')) {
			let $story;

			if (noAnimation) {
				$story = jQuery('#story');
				$story.addClass('no-transition');
				$uiBar.addClass('no-transition');
			}

			$uiBar.removeClass('stowed');

			if (noAnimation) {
				setTimeout(() => {
					$story.removeClass('no-transition');
					$uiBar.removeClass('no-transition');
				}, MIN_DOM_ACTION_DELAY);
			}
		}

		return this;
	}

	function uiBarUpdate() {
		if (BUILD_DEBUG) { console.log('[UIBar/uiBarUpdate()]'); }

		if (!$uiBar) {
			return;
		}

		// Set up the (non-navigation) dynamic page elements.
		setPageElement('story-banner', 'StoryBanner');
		if (Story.has('StoryDisplayTitle')) {
			setDisplayTitle(Story.get('StoryDisplayTitle').text);
		}
		setPageElement('story-subtitle', 'StorySubtitle');
		setPageElement('story-author', 'StoryAuthor');
		setPageElement('story-caption', 'StoryCaption');

		// Set up the #menu-story items.
		const menuStory = document.getElementById('menu-story');

		if (menuStory !== null) {
			jQuery(menuStory).empty();

			if (Story.has('StoryMenu')) {
				try {
					UI.assembleLinkList('StoryMenu', menuStory);
				}
				catch (ex) {
					Alert.error('StoryMenu', ex);
				}
			}
		}
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		destroy  : { value : uiBarDestroy },
		hide     : { value : uiBarHide },
		init     : { value : uiBarInit },
		isHidden : { value : uiBarIsHidden },
		isStowed : { value : uiBarIsStowed },
		show     : { value : uiBarShow },
		start    : { value : uiBarStart },
		stow     : { value : uiBarStow },
		unstow   : { value : uiBarUnstow },
		update   : { value : uiBarUpdate }
	}));
})();


/*
	Module Exports.
*/
export default UIBar;
