/***********************************************************************************************************************

	loadscreen.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';


/*
	LoadScreen API static object.
*/
const LoadScreen = (() => {
	// Locks collection.
	const locks = new Set();

	// Auto-incrementing lock ID.
	let autoId = 0;


	/*******************************************************************************
		LoadScreen Functions.
	*******************************************************************************/

	/*
		Initialize management of the loading screen.
	*/
	function loadScreenInit() {
		if (BUILD_DEBUG) { console.log('[LoadScreen/loadScreenInit()]'); }

		// Add a `readystatechange` listener for hiding/showing the loading screen.
		jQuery(document).on('readystatechange.LoadScreen', () => {
			if (BUILD_DEBUG) { console.log(`[LoadScreen/<readystatechange>] document.readyState: "${document.readyState}"; locks(${locks.size}):`, locks); }

			if (locks.size > 0) {
				return;
			}

			// The value of `document.readyState` may be: 'loading' -> 'interactive' -> 'complete'.
			// Though, to reach this point, it must already be in, at least, the 'interactive' state.
			if (document.readyState === 'complete') {
				if (jQuery(document.documentElement).attr('data-init') === 'loading') {
					if (Config.startup.delay > 0) {
						setTimeout(loadScreenHide, Config.startup.delay);
					}
					else {
						loadScreenHide();
					}
				}
			}
			else {
				loadScreenShow();
			}
		});
	}

	/*
		Clear the loading screen.
	*/
	function loadScreenClear() {
		if (BUILD_DEBUG) { console.log('[LoadScreen/loadScreenClear()]'); }

		// Remove the event listener.
		jQuery(document).off('readystatechange.LoadScreen');

		// Clear all locks.
		locks.clear();

		// Hide the loading screen.
		loadScreenHide();
	}

	/*
		Hide the loading screen.
	*/
	function loadScreenHide() {
		if (BUILD_DEBUG) { console.log('[LoadScreen/loadScreenHide()]'); }

		jQuery(document.documentElement).removeAttr('data-init');
	}

	/*
		Show the loading screen.
	*/
	function loadScreenShow() {
		if (BUILD_DEBUG) { console.log('[LoadScreen/loadScreenShow()]'); }

		jQuery(document.documentElement).attr('data-init', 'loading');
	}

	/*
		Returns a new lock ID after locking and showing the loading screen.
	*/
	function loadScreenLock() {
		if (BUILD_DEBUG) { console.log('[LoadScreen/loadScreenLock()]'); }

		++autoId;
		locks.add(autoId);

		if (BUILD_DEBUG) { console.log(`\tacquired loading screen lock; id: ${autoId}`); }

		loadScreenShow();
		return autoId;
	}

	/*
		Remove the lock associated with the given lock ID and, if no locks remain,
		trigger a `readystatechange` event.
	*/
	function loadScreenUnlock(id) {
		if (BUILD_DEBUG) { console.log(`[LoadScreen/loadScreenUnlock(id: ${id})]`); }

		if (id == null) { // lazy equality for null
			throw new Error('LoadScreen.unlock called with a null or undefined ID');
		}

		if (locks.has(id)) {
			locks.delete(id);

			if (BUILD_DEBUG) { console.log(`\treleased loading screen lock; id: ${id}`); }
		}

		if (locks.size === 0) {
			jQuery(document).trigger('readystatechange');
		}
	}

	/*
		Returns the current number of locks.
	*/
	function loadScreenLockSize() {
		return locks.size;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		init   : { value : loadScreenInit },
		clear  : { value : loadScreenClear },
		hide   : { value : loadScreenHide },
		show   : { value : loadScreenShow },
		lock   : { value : loadScreenLock },
		unlock : { value : loadScreenUnlock },
		size   : { get : loadScreenLockSize }
	}));
})();


/*
	Module Exports.
*/
export default LoadScreen;
