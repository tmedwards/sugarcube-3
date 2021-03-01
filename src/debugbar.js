/***********************************************************************************************************************

	debugbar.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import Db from '~/db';
import DebugView from '~/lib/debugview';
import Engine from '~/engine';
import I18n from '~/i18n/i18n';
import Patterns from '~/lib/patterns';
import State from '~/state';
import Story from '~/story';
import getToStringTag from '~/utils/gettostringtag';


/*
	DebugBar API static object.
*/
const DebugBar = (() => {
	const WATCH_UPDATE_DELAY = 200; // in milliseconds
	const LIST_UPDATE_DELAY  = 500; // in milliseconds

	const variableRE   = new RegExp(`^${Patterns.variable}$`);
	const numericKeyRE = /^\d+$/;
	const watchList    = [];
	let varList        = [];
	let stowed         = true;
	let watchTimerId   = null;
	let listTimerId    = null;
	let $debugBar      = null;
	let $watchBody     = null;
	let $watchToggle   = null;
	let $varDatalist   = null;
	let $turnValue     = null;
	let $jumpDatalist  = null;


	/*******************************************************************************
		Debug Bar Functions.
	*******************************************************************************/

	function debugBarInit() {
		if (BUILD_DEBUG) { console.log('[DebugBar/debugBarInit()]'); }

		if (!Config.debug) {
			// Remove its styles.
			jQuery(document.head).find('#style-ui-debug').remove();

			return;
		}

		// Generate the debug bar elements and insert them into the page before the
		// main script.
		jQuery(document.createDocumentFragment())
			.append(
				/* eslint-disable max-len */
				  '<div id="debug-bar">'
				+     '<div id="debug-bar-tray">'
				+         '<button id="debug-bar-toggle" tabindex="0" title="" aria-label=""></button>'
				+         '<div>'
				+             '<button id="debug-bar-views-toggle" tabindex="0" title="" aria-label=""></button>'
				+             '<span id="debug-bar-turn-label" class="label"></span>'
				+             '<span id="debug-bar-turn-value"></span>'
				+         '</div>'
				+         '<div>'
				+             '<label id="debug-bar-jump-label" for="debug-bar-jump-input"></label>'
				+             '<input id="debug-bar-jump-input" name="debug-bar-jump-input" type="text" list="debug-bar-jump-list" tabindex="0">'
				+             '<datalist id="debug-bar-jump-list" aria-hidden="true" hidden="hidden"></datalist>'
				+             '<button id="debug-bar-jump-play" tabindex="0" title="" aria-label=""></button>'
				+         '</div>'
				+         '<div>'
				+             '<label id="debug-bar-code-label" for="debug-bar-code-box"></label>'
				+             '<button id="debug-bar-run-code" tabindex="0" title="" aria-label=""></button>'
				+             '<textarea id="debug-bar-code-box" tabindex="0"></textarea>'
				+         '</div>'
				+         '<div>'
				+             '<button id="debug-bar-watch-toggle" tabindex="0" title="" aria-label=""></button>'
				+             '<label id="debug-bar-watch-label" for="debug-bar-watch-input"></label>'
				+             '<input id="debug-bar-watch-input" name="debug-bar-watch-input" type="text" list="debug-bar-var-list" tabindex="0">'
				+             '<datalist id="debug-bar-var-list" aria-hidden="true" hidden="hidden"></datalist>'
				+             '<button id="debug-bar-watch-add" tabindex="0" title="" aria-label=""></button>'
				+             '<button id="debug-bar-watch-all" tabindex="0" title="" aria-label=""></button>'
				+             '<button id="debug-bar-watch-none" tabindex="0" title="" aria-label=""></button>'
				+         '</div>'
				+     '</div>'
				+     '<div id="debug-bar-watch">'
				+         '<div></div>'
				+     '</div>'
				+ '</div>'
				+ '<div id="debug-bar-hint"></div>'
				/* eslint-enable max-len */
			)
			.insertAfter('body>#ui-dialog');

		// Cache the debug bar elements, since they're going to be used often.
		//
		// NOTE: We rewrap the elements themselves, rather than simply using
		// the results of `find()`, so that we cache uncluttered jQuery-wrappers
		// (i.e. `context` refers to the elements and there is no `prevObject`).
		$debugBar     = jQuery('#debug-bar');
		$watchBody    = jQuery($debugBar.find('#debug-bar-watch').get(0));
		$watchToggle  = jQuery($debugBar.find('#debug-bar-watch-toggle').get(0));
		$varDatalist  = jQuery($debugBar.find('#debug-bar-var-list').get(0));
		$turnValue    = jQuery($debugBar.find('#debug-bar-turn-value').get(0));
		$jumpDatalist = jQuery($debugBar.find('#debug-bar-jump-list').get(0));

		const $barToggle   = jQuery($debugBar.find('#debug-bar-toggle').get(0));
		const $jumpInput   = jQuery($debugBar.find('#debug-bar-jump-input').get(0));
		const $jumpPlay    = jQuery($debugBar.find('#debug-bar-jump-play').get(0));
		const $watchInput  = jQuery($debugBar.find('#debug-bar-watch-input').get(0));
		const $watchAdd    = jQuery($debugBar.find('#debug-bar-watch-add').get(0));
		const $watchAll    = jQuery($debugBar.find('#debug-bar-watch-all').get(0));
		const $watchNone   = jQuery($debugBar.find('#debug-bar-watch-none').get(0));
		const $viewsToggle = jQuery($debugBar.find('#debug-bar-views-toggle').get(0));

		// Set up the debug bar's local event handlers.
		$barToggle
			.ariaClick(debugBarToggle);
		$viewsToggle
			.ariaClick(() => {
				DebugView.toggle();
				updateSession();
			});
		$jumpInput
			.on(':play', function () {
				Engine.play(this.value.trim());
				this.value = '';
			})
			.on('keypress', ev => {
				if (ev.which === 13 /* Enter/Return */) {
					ev.preventDefault();
					$jumpInput.trigger(':play');
				}
			});
		$jumpPlay
			.ariaClick(() => $jumpInput.trigger(':play'));
		$watchToggle
			.ariaClick(debugBarWatchToggle);
		$watchInput
			.on(':addwatch', function () {
				debugBarWatchAdd(this.value.trim());
				this.value = '';
			})
			.on('keypress', ev => {
				if (ev.which === 13 /* Enter/Return */) {
					ev.preventDefault();
					$watchInput.trigger(':addwatch');
				}
			});
		$watchAdd
			.ariaClick(() => $watchInput.trigger(':addwatch'));
		$watchAll
			.ariaClick(debugBarWatchAddAll);
		$watchNone
			.ariaClick(debugBarWatchClear);

		// Set up the debug bar's global event handlers.
		jQuery(document)
			// Set up a handler for the turn display.
			.on(':stateupdate.debug-bar', updateTurnDisplay)
			// Set up a handler for engine resets to clear the active debug session.
			.on(':enginerestart.debug-bar', clearSession);
	}

	function debugBarFinalize() {
		if (BUILD_DEBUG) { console.log('[DebugBar/debugBarFinalize()]'); }

		if (!Config.debug) {
			return;
		}

		// Set various labels.
		const barToggleLabel   = I18n.get('debugBarToggle');
		const jumpPlayLabel    = I18n.get('debugBarPlayJump');
		const codeRunLabel     = I18n.get('debugBarCodeRun');
		const watchAddLabel    = I18n.get('debugBarAddWatch');
		const watchAllLabel    = I18n.get('debugBarWatchAll');
		const watchNoneLabel   = I18n.get('debugBarWatchNone');
		const watchToggleLabel = I18n.get('debugBarWatchToggle');
		const viewsToggleLabel = I18n.get('debugBarViewsToggle');

		$debugBar.find('#debug-bar-toggle').attr({ title : barToggleLabel, 'aria-label' : barToggleLabel });
		$debugBar.find('#debug-bar-jump-label').text(I18n.get('debugBarLabelJump'));
		$debugBar.find('#debug-bar-jump-play').attr({ title : jumpPlayLabel, 'aria-label' : jumpPlayLabel });
		$debugBar.find('#debug-bar-views-toggle').attr({ title : viewsToggleLabel, 'aria-label' : viewsToggleLabel }).text(I18n.get('debugBarLabelViews'));
		$debugBar.find('#debug-bar-turn-label').text(I18n.get('debugBarLabelTurn'));
		$debugBar.find('#debug-bar-code-label').text(I18n.get('debugBarLabelCode'));
		$debugBar.find('#debug-bar-run-code').attr({ title : codeRunLabel, 'aria-label' : codeRunLabel });
		$debugBar.find('#debug-bar-watch-toggle').attr({ title : watchToggleLabel, 'aria-label' : watchToggleLabel }).text(I18n.get('debugBarLabelWatch'));
		$debugBar.find('#debug-bar-watch-label').text(I18n.get('debugBarLabelAdd'));
		$debugBar.find('#debug-bar-watch-add').attr({ title : watchAddLabel, 'aria-label' : watchAddLabel });
		$debugBar.find('#debug-bar-watch-all').attr({ title : watchAllLabel, 'aria-label' : watchAllLabel });
		$debugBar.find('#debug-bar-watch-none').attr({ title : watchNoneLabel, 'aria-label' : watchNoneLabel });
		$watchBody.children('div').text(I18n.get('debugBarNoWatches'));

		// Attempt to restore an existing session.
		if (!restoreSession()) {
			// If there's no active debug session, then initially stow the debug bar,
			// enable debug views, and enable variable watching.
			debugBarStow();
			DebugView.enable();
			enableWatchUpdates();
			enableWatch();
		}

		// Update the UI.
		updateTurnDisplay();
		updateJumpList();
		updateVarList();
	}

	function debugBarIsStowed() {
		return stowed;
	}

	function debugBarStow() {
		disableWatchUpdates();
		disableVarListUpdates();
		stowDebugBar();
		stowed = true;
		updateSession();
	}

	function debugBarUnstow() {
		if (debugBarWatchIsEnabled()) {
			enableWatchUpdates();
		}

		enableVarListUpdates();
		unstowDebugBar();
		stowed = false;
		updateSession();
	}

	function debugBarToggle() {
		if (stowed) {
			debugBarUnstow();
		}
		else {
			debugBarStow();
		}
	}

	function debugBarWatchAdd(varName) {
		if (!variableRE.test(varName)) {
			return;
		}

		watchList.pushUnique(varName);
		watchList.sort();

		updateWatchBody();
		updateVarList();
		updateSession();
	}

	function debugBarWatchAddAll() {
		Object.keys(State.variables).map(name => watchList.pushUnique(`$${name}`));
		Object.keys(State.temporary).map(name => watchList.pushUnique(`_${name}`));
		watchList.sort();

		updateWatchBody();
		updateVarList();
		updateSession();
	}

	function debugBarWatchClear() {
		watchList.length = 0;
		$watchBody
			.empty()
			.append(`<div>${I18n.get('debugBarNoWatches')}</div>`);

		updateWatchBody();
		updateVarList();
		updateSession();
	}

	function debugBarWatchDelete(varName) {
		watchList.delete(varName);
		$watchBody.find(`tr[data-name="${varName}"]`).remove();

		updateWatchBody();
		updateVarList();
		updateSession();
	}

	function debugBarWatchDisable() {
		disableWatchUpdates();
		disableWatch();
		updateSession();
	}

	function debugBarWatchEnable() {
		enableWatchUpdates();
		enableWatch();
		updateSession();
	}

	function debugBarWatchIsEnabled() {
		return !$watchBody.attr('hidden');
	}

	function debugBarWatchToggle() {
		if ($watchBody.attr('hidden')) {
			debugBarWatchEnable();
		}
		else {
			debugBarWatchDisable();
		}
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	// The debug state storage key.
	const STORAGE_KEY = 'debugState';

	const toWatchString = (() => {
		function _toWatchString(O, cache) {
			// Handle the `null` primitive.
			if (O === null) {
				return 'null';
			}

			// Handle the rest of the primitives and functions.
			switch (typeof O) {
				case 'bigint':
				case 'boolean':
				case 'number':
				case 'symbol':
				case 'undefined':
					return String(O);

				case 'string':
					return JSON.stringify(O);

				case 'function':
					// return JSON.stringify(value.toString());
					return 'function';
			}

			// Check the cache and, if we get a hit, return a midline horizontal ellipsis.
			if (cache.has(O)) {
				return '\u22ef';
			}

			// Add an entry for the original to the reference cache.
			cache.add(O);

			const objType = getToStringTag(O);

			// /*
			// 	Handle instances of the primitive exemplar objects (`Boolean`, `Number`, `String`).
			// */
			// if (objType === 'Boolean') {
			// 	return `Boolean\u202F{${String(value)}}`;
			// }
			// if (objType === 'Number') {
			// 	return `Number\u202F{${String(value)}}`;
			// }
			// if (objType === 'String') {
			// 	return `String\u202F{"${String(value)}"}`;
			// }

			// Handle `Date` objects.
			if (objType === 'Date') {
				// return `Date\u202F${value.toISOString()}`;
				return `Date\u202F{${O.toLocaleString()}}`;
			}

			// Handle `RegExp` objects.
			if (objType === 'RegExp') {
				return `RegExp\u202F${O.toString()}`;
			}

			const result = [];

			// Handle `Array` & `Set` objects.
			if (O instanceof Array || O instanceof Set) {
				const list = O instanceof Array ? O : Array.from(O);

				// own numeric properties
				// NOTE: Do not use `<Array>.forEach()` here as it skips undefined members.
				for (let i = 0, len = list.length; i < len; ++i) {
					result.push(list.hasOwnProperty(i) ? _toWatchString(list[i], cache) : '<empty>');
				}

				// own enumerable non-numeric expando properties
				Object.keys(list)
					.filter(key => !numericKeyRE.test(key))
					.forEach(key => result.push(`${_toWatchString(key, cache)}: ${_toWatchString(list[key], cache)}`));

				return `${objType}(${list.length})\u202F[${result.join(', ')}]`;
			}

			// Handle `Map` objects.
			if (O instanceof Map) {
				O.forEach((val, key) => result.push(`${_toWatchString(key, cache)} \u2192 ${_toWatchString(val, cache)}`));

				return `${objType}(${O.size})\u202F{${result.join(', ')}}`;
			}

			// General object handling.
			// own enumerable properties
			Object.keys(O)
				.forEach(key => result.push(`${_toWatchString(key, cache)}: ${_toWatchString(O[key], cache)}`));

			return `${objType}\u202F{${result.join(', ')}}`;
		}

		function toWatchString(O) {
			const cache = new Set();
			return _toWatchString(O, cache);
		}

		return toWatchString;
	})();

	function stowDebugBar() {
		$debugBar.css('right', `-${$debugBar.outerWidth()}px`);
	}

	function unstowDebugBar() {
		$debugBar.css('right', 0);
	}

	// function disableJumpListUpdates() {
	// 	if (listTimerId !== null) {
	// 		clearInterval(listTimerId);
	// 		listTimerId = null;
	// 	}
	// }

	// function enableJumpListUpdates() {
	// 	if (listTimerId === null) {
	// 		listTimerId = setInterval(() => updateJumpList(), LIST_UPDATE_DELAY);
	// 	}
	// }

	function disableWatch() {
		$watchBody.attr({
			'aria-hidden' : true,
			hidden        : 'hidden'
		});
		jQuery(document.documentElement).dataListRemove('data-debug', 'watch');
	}

	function disableWatchUpdates() {
		if (watchTimerId !== null) {
			clearInterval(watchTimerId);
			watchTimerId = null;
		}
	}

	function enableWatch() {
		jQuery(document.documentElement).dataListAdd('data-debug', 'watch');
		$watchBody.removeAttr('aria-hidden hidden');
	}

	function enableWatchUpdates() {
		if (watchTimerId === null) {
			watchTimerId = setInterval(() => updateWatchBody(), WATCH_UPDATE_DELAY);
		}
	}

	function disableVarListUpdates() {
		if (listTimerId !== null) {
			clearInterval(listTimerId);
			listTimerId = null;
		}
	}

	function enableVarListUpdates() {
		if (listTimerId === null) {
			listTimerId = setInterval(() => updateVarList(), LIST_UPDATE_DELAY);
		}
	}

	function clearSession() {
		Db.session.delete(STORAGE_KEY);
	}

	function hasSession() {
		return Db.session.has(STORAGE_KEY);
	}

	function restoreSession() {
		if (!hasSession()) {
			return false;
		}

		const debugState = Db.session.get(STORAGE_KEY);

		watchList.push(...debugState.watchList);
		updateWatchBody();

		if (debugState.watchEnabled) {
			if (stowed) {
				disableWatchUpdates();
			}
			else {
				enableWatchUpdates();
			}

			enableWatch();
		}
		else {
			disableWatchUpdates();
			disableWatch();
		}

		if (debugState.viewsEnabled) {
			DebugView.enable();
		}
		else {
			DebugView.disable();
		}

		stowed = debugState.stowed;

		if (stowed) {
			disableVarListUpdates();
			debugBarStow();
		}
		else {
			enableVarListUpdates();
			debugBarUnstow();
		}

		return true;
	}

	function updateSession() {
		Db.session.set(STORAGE_KEY, {
			stowed,
			watchList,
			watchEnabled : debugBarWatchIsEnabled(),
			viewsEnabled : DebugView.isEnabled()
		});
	}

	function updateWatchBody() {
		if (watchList.length === 0) {
			return;
		}

		const $rowMap = new Map();
		let $table = jQuery($watchBody.children('table'));
		let $tbody;

		// If there's an existing watches table, cache its elements.
		if ($table.length > 0) {
			$tbody = jQuery($table.children('tbody'));
			$tbody.children('tr').each((_, el) => $rowMap.set(el.getAttribute('data-name'), jQuery(el)));
		}
		// Elsewise, create a new watches table.
		else {
			$table = jQuery(document.createElement('table'));
			$tbody = jQuery(document.createElement('tbody'));
			$table
				.append($tbody);
			$watchBody
				.empty()
				.append($table);
		}

		// Set up a function to add new watch rows.
		const delLabel  = I18n.get('debugBarDeleteWatch');
		const createRow = function (varName, value) {
			const $row    = jQuery(document.createElement('tr'));
			const $delBtn = jQuery(document.createElement('button'));
			const $code   = jQuery(document.createElement('code'));

			$row
				.attr('data-name', varName);
			$delBtn
				.addClass('watch-delete')
				.ariaClick({
					one   : true,
					label : delLabel
				}, () => debugBarWatchDelete(varName));
			$code
				.text(value);
			jQuery(document.createElement('td'))
				.append($delBtn)
				.appendTo($row);
			jQuery(document.createElement('td'))
				.text(varName)
				.appendTo($row);
			jQuery(document.createElement('td'))
				.append($code)
				.appendTo($row);

			return $row;
		};

		let cursor = $rowMap.size > 0 ? $tbody.children('tr').get(0) : null;
		watchList.forEach(varName => {
			const varKey = varName.slice(1);
			const store  = varName[0] === '$' ? State.variables : State.temporary;
			const value  = toWatchString(store[varKey]);
			let $row = $rowMap.get(varName);

			// If a watch row exists, update its code element value.
			if ($row) {
				const $code = $row.children().children('code');

				if (value !== $code.text()) {
					$code.text(value);
				}
			}
			// Elsewise, insert a new watch row.
			else {
				$row = createRow(varName, value);

				if (cursor) {
					$row.insertAfter(cursor);
				}
				else {
					$row.appendTo($tbody);
				}
			}

			cursor = $row.get(0);
		});
	}

	function updateVarList() {
		const names = [].concat(
			Object.keys(State.variables).map(name => `$${name}`),
			Object.keys(State.temporary).map(name => `_${name}`)
		);

		// If there are no variable names, then bail out.
		if (names.length === 0) {
			varList.length = 0;
			$varDatalist.empty();
			return;
		}

		// Sort the variable names and remove those already being watched.
		names.sort().delete(watchList);

		// If the new and existing lists of variable names match, then bail out.
		if (
			names.length === varList.length
			&& names.every((m, i) => m === varList[i])
		) {
			return;
		}

		// Update the variable names list.
		varList = names;

		// Update the datalist.
		const options = document.createDocumentFragment();
		names.forEach(name => {
			jQuery(document.createElement('option'))
				.val(name)
				.appendTo(options);
		});
		$varDatalist
			.empty()
			.append(options);
	}

	function updateTurnDisplay() {
		$turnValue
			.empty()
			.text(`${State.turns} ${JSON.stringify(State.passage)}`);
	}

	// Info passages are passages which contain solely structural data and code,
	// rather than any actual story content.
	const INFO_PASSAGES = Object.freeze([
		'StoryAuthor', 'StoryBanner', 'StoryCaption', 'StoryDisplayTitle',
		'StoryMenu', 'StorySubtitle', 'StoryTitle',

		'StoryInit', 'StoryInterface',

		'PassageReady', 'PassageDone', 'PassageHeader', 'PassageFooter'
	]);

	function updateJumpList() {
		const names = [...Story.getAllRegular().keys()].filter(name => !INFO_PASSAGES.includes(name));

		// Update the datalist.
		const options = document.createDocumentFragment();
		names.forEach(name => {
			jQuery(document.createElement('option'))
				.val(name)
				.appendTo(options);
		});
		$jumpDatalist
			.empty()
			.append(options);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Debug Bar Functions.
		init     : { value : debugBarInit },
		isStowed : { value : debugBarIsStowed },
		finalize : { value : debugBarFinalize },
		stow     : { value : debugBarStow },
		toggle   : { value : debugBarToggle },
		unstow   : { value : debugBarUnstow },

		// Watch Functions.
		watch : {
			value : Object.preventExtensions(Object.create(null, {
				add       : { value : debugBarWatchAdd },
				all       : { value : debugBarWatchAddAll },
				clear     : { value : debugBarWatchClear },
				delete    : { value : debugBarWatchDelete },
				disable   : { value : debugBarWatchDisable },
				enable    : { value : debugBarWatchEnable },
				isEnabled : { value : debugBarWatchIsEnabled },
				toggle    : { value : debugBarWatchToggle }
			}))
		}
	}));
})();


/*
	Module Exports.
*/
export default DebugBar;
