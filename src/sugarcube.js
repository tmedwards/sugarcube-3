/***********************************************************************************************************************

	sugarcube.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

// TODO: If it's decided to move browser support to ES6-native browsers, look
// into switching to core-js for our polyfill needs.
//
// import 'core-js/stable'; // Or whatever.

// Non-binding imports for local polyfills, extensions, and plugins.
import './extensions/ecmascript-polyfills';
import './extensions/ecmascript-extensions';
import './extensions/jquery-plugins';

// Non-binding imports for utility functions to guarantee availability for users.
// TODO: Add imports for any utility functions we want to be public.
// import './utils/createdeferred';

// Non-binding imports for the core macros and parsers.
import './macros/macrolib';
import './markup/parserlib';

// Binding imports for everything this file needs or is exporting.
import Scripting, { setup } from './markup/scripting';
import Setting, { settings } from './setting';
import Alert from './lib/alert';
import Browser from './lib/browser';
import Config from './config';
import Db from './db';
import DebugBar from './debugbar';
import DebugView from './lib/debugview';
import Dialog from './dialog';
import Engine from './engine';
import Fullscreen from './lib/fullscreen';
import Has from './lib/has';
import L10n from './l10n/l10n';
import LoadScreen from './loadscreen';
import { MIN_DOM_ACTION_DELAY } from './constants';
import Macro from './macros/macro';
import Passage from './passage';
import Save from './save';
import SimpleAudio from './audio/simpleaudio';
import State from './state';
import Story from './story';
import StyleWrapper from './lib/stylewrapper';
import UI from './ui';
import UIBar from './uibar';
import Visibility from './lib/visibility';
import Wikifier from './markup/wikifier';


/*
	Version object.
*/
const version = Object.freeze(Object.assign(Object.create(null), {
	title      : 'SugarCube',
	major      : '{{BUILD_VERSION_MAJOR}}',
	minor      : '{{BUILD_VERSION_MINOR}}',
	patch      : '{{BUILD_VERSION_PATCH}}',
	prerelease : '{{BUILD_VERSION_PRERELEASE}}',
	build      : '{{BUILD_VERSION_BUILD}}',
	date       : new Date('{{BUILD_VERSION_DATE}}'),

	toString() {
		const prerelease = this.prerelease ? `-${this.prerelease}` : '';
		return `${this.major}.${this.minor}.${this.patch}${prerelease}+${this.build}`;
	},

	short() {
		const prerelease = this.prerelease ? `-${this.prerelease}` : '';
		return `${this.title} (v${this.major}.${this.minor}.${this.patch}${prerelease})`;
	},

	long() {
		return `${this.title} v${this.toString()} (${this.date.toUTCString()})`;
	}
}));


/*
	Global `SugarCube` object.  Allows scripts to detect if they're running in SugarCube by
	testing for the object—e.g., `"SugarCube" in window`—and contains exported identifiers
	for debugging purposes.
*/
Object.defineProperty(window, 'SugarCube', {
	// WARNING: We need to assign new values at points, so seal it, do not freeze it.
	value : Object.seal(Object.assign(Object.create(null), {
		Browser,
		Config,
		Db,
		DebugBar,
		DebugView,
		Dialog,
		Engine,
		Fullscreen,
		Has,
		L10n,
		Macro,
		Passage,
		Save,
		Scripting,
		Setting,
		SimpleAudio,
		State,
		Story,
		UI,
		UIBar,
		Visibility,
		Wikifier,
		settings,
		setup,
		version
	}))
});


/*
	Document ready function, the entry point for the story.
*/
jQuery(() => {
	if (BUILD_DEBUG) { console.log('[SugarCube/main()] Document loaded; beginning startup.'); }

	// WARNING!
	//
	// The ordering of the code within this block is critically important,
	// so be very careful when mucking around with it.

	// Acquire an initial lock for and initialize the loading screen.
	const lockId = LoadScreen.lock();
	LoadScreen.init();

	// Normalize the document.
	if (document.normalize) {
		document.normalize();
	}

	// Remove #init-no-js & #init-lacking from #init-screen.
	jQuery('#init-no-js,#init-lacking').remove();

	// From this point on it's promises all the way down.
	Promise.resolve()
		.then(() => {
			// Load the story data.
			Story.load();

			// Initialize the databases and pass on the returned promise for the next step
			// in the chain.  We do it this way to give the databases time to become fully
			// ready—really only IndexedDB, asynchronous pig that it is.
			return Db.init(Story.domId);
		})
		.then(() => {
			// Initialize the user interfaces.
			//
			// NOTE: Must be done before user scripts are loaded.
			Dialog.init();
			UI.init();
			UIBar.init();
			Engine.init();

			// Load the user styles.
			(() => {
				const storyStyle = document.createElement('style');

				new StyleWrapper(storyStyle)
					.add(Story.getAllStylesheet().map(style => style.source.trim()).join('\n'));

				jQuery(storyStyle)
					.appendTo(document.head)
					.attr({
						id   : 'style-story',
						type : 'text/css'
					});
			})();

			// Load the user scripts.
			Story.getAllScript().forEach(script => {
				try {
					Scripting.evalJavaScript(script.source);
				}
				catch (ex) {
					Alert.error(script.title, ex);
				}
			});

			// Load the user widgets.
			Story.getAllWidget().forEach(widget => {
				try {
					Wikifier.wikifyEval(widget.text);
				}
				catch (ex) {
					Alert.error(widget.title, ex);
				}
			});

			// Alert the player when the browser is degrading required capabilities.
			//
			// NOTE: Must be done after user scripts are loaded to allow for the
			// modification of the L10N strings.
			if (Db.storage.name === 'cookie' && !Db.session.has('rcWarn')) {
				/* eslint-disable no-alert */
				Db.session.set('rcWarn', 1);
				window.alert(L10n.get('warningNoGoodStorage'));
				/* eslint-enable no-alert */
			}

			// Initialize the saves.
			Save.init();

			// Initialize the settings.
			Setting.init();

			// Initialize the macros.
			Macro.init();

			// Pre-start the engine.
			Engine.prestart();

			// Initialize the debug bar interface.
			DebugBar.init();

			// Schedule the start of the engine and interfaces once both the DOM is
			// reporting non-empty dimensions for the viewport and our loading screen
			// lock is the only remaining one.
			return new Promise(resolve => {
				const $window   = jQuery(window);
				const vpReadyId = setInterval(() => {
					if ($window.width() && LoadScreen.size <= 1) {
						clearInterval(vpReadyId);
						resolve();
					}
				}, MIN_DOM_ACTION_DELAY);
			});
		})
		.then(() => {
			// Start the UI bar interface.
			UIBar.start();

			// Start the engine and pass on the returned promise for the next step in the
			// chain.
			return Engine.start();
		})
		.then(() => {
			// Start the debug bar interface.
			DebugBar.start();

			// Trigger the `:storyready` global synthetic event and release
			// our loading screen lock after a short delay.
			jQuery.event.trigger(':storyready');
			setTimeout(() => LoadScreen.unlock(lockId), MIN_DOM_ACTION_DELAY * 2);

			if (BUILD_DEBUG) { console.log('[SugarCube/main()] Startup complete; story ready.'); }
		})
		.catch(ex => {
			LoadScreen.clear();
			Alert.fatal(null, ex);
		});
});
