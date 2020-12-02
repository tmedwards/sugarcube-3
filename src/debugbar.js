/***********************************************************************************************************************

	debugbar.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Db from './db';
import DebugView from './lib/debugview';
import Engine from './engine';
import L10n from './l10n/l10n';
import Patterns from './lib/patterns';
import State from './state';
import encodeEntities from './utils/encodeentities';
import getToStringTag from './utils/gettostringtag';


/*
	DebugBar API static object.
*/
const DebugBar = (() => {
	const WATCH_UPDATE_DELAY   = 200; // in milliseconds
	const VARLIST_UPDATE_DELAY = 500; // in milliseconds

	const variableRE   = new RegExp(`^${Patterns.variable}$`);
	const numericKeyRE = /^\d+$/;
	const watchList    = [];
	let varList        = [];
	let stowed         = true;
	let watchTimerId   = null;
	let varListTimerId = null;
	let $debugBar      = null;
	let $watchBody     = null;
	let $varDatalist   = null;
	let $turnSelect    = null;


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
		const barToggleLabel   = L10n.get('debugBarToggle');
		const watchAddLabel    = L10n.get('debugBarAddWatch');
		const watchAllLabel    = L10n.get('debugBarWatchAll');
		const watchNoneLabel   = L10n.get('debugBarWatchNone');
		const watchToggleLabel = L10n.get('debugBarWatchToggle');
		const viewsToggleLabel = L10n.get('debugBarViewsToggle');

		jQuery(document.createDocumentFragment())
			.append(
				/* eslint-disable max-len */
				  '<div id="debug-bar">'
				+     '<div id="debug-bar-watch">'
				+         `<div>${L10n.get('debugBarNoWatches')}</div>`
				+     '</div>'
				+     '<div>'
				+         `<button id="debug-bar-watch-toggle" tabindex="0" title="${watchToggleLabel}" aria-label="${watchToggleLabel}">${L10n.get('debugBarLabelWatch')}</button>`
				+         `<label id="debug-bar-watch-label" for="debug-bar-watch-input">${L10n.get('debugBarLabelAdd')}</label>`
				+         '<input id="debug-bar-watch-input" name="debug-bar-watch-input" type="text" list="debug-bar-var-list" tabindex="0">'
				+         '<datalist id="debug-bar-var-list" aria-hidden="true" hidden="hidden"></datalist>'
				+         `<button id="debug-bar-watch-add" tabindex="0" title="${watchAddLabel}" aria-label="${watchAddLabel}"></button>`
				+         `<button id="debug-bar-watch-all" tabindex="0" title="${watchAllLabel}" aria-label="${watchAllLabel}"></button>`
				+         `<button id="debug-bar-watch-none" tabindex="0" title="${watchNoneLabel}" aria-label="${watchNoneLabel}"></button>`
				+     '</div>'
				+     '<div>'
				+         `<button id="debug-bar-views-toggle" tabindex="0" title="${viewsToggleLabel}" aria-label="${viewsToggleLabel}">${L10n.get('debugBarLabelViews')}</button>`
				+         `<label id="debug-bar-turn-label" for="debug-bar-turn-select">${L10n.get('debugBarLabelTurn')}</label>`
				+         '<select id="debug-bar-turn-select" tabindex="0"></select>'
				+     '</div>'
				+     `<button id="debug-bar-toggle" tabindex="0" title="${barToggleLabel}" aria-label="${barToggleLabel}"></button>`
				+ '</div>'
				+ '<div id="debug-bar-hint"></div>'
				/* eslint-enable max-len */
			)
			.insertAfter('body>#ui-dialog');

		// Cache various oft used elements.
		//
		// NOTE: We rewrap the elements themselves, rather than simply using
		// the results of `find()`, so that we cache uncluttered jQuery-wrappers
		// (i.e. `context` refers to the elements and there is no `prevObject`).
		$debugBar    = jQuery('#debug-bar');
		$watchBody   = jQuery($debugBar.find('#debug-bar-watch').get(0));
		$varDatalist = jQuery($debugBar.find('#debug-bar-var-list').get(0));
		$turnSelect  = jQuery($debugBar.find('#debug-bar-turn-select').get(0));

		const $barToggle   = jQuery($debugBar.find('#debug-bar-toggle').get(0));
		const $watchToggle = jQuery($debugBar.find('#debug-bar-watch-toggle').get(0));
		const $watchInput  = jQuery($debugBar.find('#debug-bar-watch-input').get(0));
		const $watchAdd    = jQuery($debugBar.find('#debug-bar-watch-add').get(0));
		const $watchAll    = jQuery($debugBar.find('#debug-bar-watch-all').get(0));
		const $watchNone   = jQuery($debugBar.find('#debug-bar-watch-none').get(0));
		const $viewsToggle = jQuery($debugBar.find('#debug-bar-views-toggle').get(0));

		// Set up the debug bar's local event handlers.
		$barToggle
			.ariaClick(debugBarToggle);
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
		$turnSelect
			.on('change', function () {
				Engine.goTo(Number(this.value));
			});
		$viewsToggle
			.ariaClick(() => {
				DebugView.toggle();
				updateSession();
			});

		// Set up the debug bar's global event handlers.
		jQuery(document)
			// Set up a handler for the history select.
			.on(':historyupdate.debug-bar', updateTurnSelect)
			// Set up a handler for engine resets to clear the active debug session.
			.on(':enginerestart.debug-bar', clearSession);
	}

	function debugBarStart() {
		if (BUILD_DEBUG) { console.log('[DebugBar/debugBarStart()]'); }

		if (!Config.debug) {
			return;
		}

		// Attempt to restore an existing session.
		if (!restoreSession()) {
			// If there's no active debug session, then initially stow the debug bar
			// and enable debug views.
			debugBarStow();
			DebugView.enable();
		}

		// Update the UI.
		updateTurnSelect();
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
			.append(`<div>${L10n.get('debugBarNoWatches')}</div>`);

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

	function stowDebugBar() {
		$debugBar.css('right', `-${$debugBar.outerWidth()}px`);
	}

	function unstowDebugBar() {
		$debugBar.css('right', 0);
	}

	function disableWatch() {
		$watchBody.attr({
			'aria-hidden' : true,
			hidden        : 'hidden'
		});
	}

	function disableWatchUpdates() {
		if (watchTimerId !== null) {
			clearInterval(watchTimerId);
			watchTimerId = null;
		}
	}

	function enableWatch() {
		$watchBody.removeAttr('aria-hidden hidden');
	}

	function enableWatchUpdates() {
		if (watchTimerId === null) {
			watchTimerId = setInterval(() => updateWatchBody(), WATCH_UPDATE_DELAY);
		}
	}

	function disableVarListUpdates() {
		if (varListTimerId !== null) {
			clearInterval(varListTimerId);
			varListTimerId = null;
		}
	}

	function enableVarListUpdates() {
		if (varListTimerId === null) {
			varListTimerId = setInterval(() => updateVarList(), VARLIST_UPDATE_DELAY);
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

		stowed = debugState.stowed;

		if (stowed) {
			disableVarListUpdates();
			debugBarStow();
		}
		else {
			enableVarListUpdates();
			debugBarUnstow();
		}

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
		const delLabel  = L10n.get('debugBarDeleteWatch');
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

	function updateTurnSelect() {
		const histLen = State.size;
		const offset  = 1 + State.expired.length;
		const options = document.createDocumentFragment();

		for (let i = 0; i < histLen; ++i) {
			jQuery(document.createElement('option'))
				.val(i)
				.text(`${offset + i}. ${encodeEntities(State.history[i].title)}`)
				.appendTo(options);
		}

		$turnSelect
			.empty()
			.ariaDisabled(histLen < 2)
			.append(options)
			.val(State.activeIndex);
	}

	function toWatchString(value) {
		// Handle the `null` primitive.
		if (value === null) {
			return 'null';
		}

		// Handle the rest of the primitives and functions.
		switch (typeof value) {
			case 'boolean':
			case 'number':
			case 'symbol':
			case 'undefined':
				return String(value);

			case 'string':
				return JSON.stringify(value);

			case 'function':
				// return JSON.stringify(value.toString());
				return 'function';
		}

		const objType = getToStringTag(value);

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
			return `Date\u202F{${value.toLocaleString()}}`;
		}

		// Handle `RegExp` objects.
		if (objType === 'RegExp') {
			return `RegExp\u202F${value.toString()}`;
		}

		const result = [];

		// Handle `Array` & `Set` objects.
		if (value instanceof Array || value instanceof Set) {
			const list = value instanceof Array ? value : Array.from(value);

			// own numeric properties
			// NOTE: Do not use `<Array>.forEach()` here as it skips undefined members.
			for (let i = 0, len = list.length; i < len; ++i) {
				result.push(list.hasOwnProperty(i) ? toWatchString(list[i]) : '<empty>');
			}

			// own enumerable non-numeric expando properties
			Object.keys(list)
				.filter(key => !numericKeyRE.test(key))
				.forEach(key => result.push(`${toWatchString(key)}: ${toWatchString(list[key])}`));

			return `${objType}(${list.length})\u202F[${result.join(', ')}]`;
		}

		// Handle `Map` objects.
		if (value instanceof Map) {
			value.forEach((val, key) => result.push(`${toWatchString(key)} \u2192 ${toWatchString(val)}`));

			return `${objType}(${value.size})\u202F{${result.join(', ')}}`;
		}

		// General object handling.
		// own enumerable properties
		Object.keys(value)
			.forEach(key => result.push(`${toWatchString(key)}: ${toWatchString(value[key])}`));

		return `${objType}\u202F{${result.join(', ')}}`;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Debug Bar Functions.
		init     : { value : debugBarInit },
		isStowed : { value : debugBarIsStowed },
		start    : { value : debugBarStart },
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
