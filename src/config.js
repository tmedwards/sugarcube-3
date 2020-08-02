/***********************************************************************************************************************

	config.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import getTypeOf from './utils/gettypeof';


/*
	Config API static object.
*/
const Config = (() => {
	// General settings.
	let debug                 = false;
	let addVisitedLinkClass   = false;
	let cleanupWikifierOutput = false;

	// Audio settings.
	let audioPauseOnFadeToZero = true;
	let audioPreloadMetadata   = true;

	// State history settings.
	let historyMaxStates = 50;

	// Macros settings.
	let macrosIfAssignmentError   = true;
	let macrosForMaxIterations    = 5000;
	let macrosTypeSkipKey         = '\x20'; // Space
	let macrosTypeVisitedPassages = true;

	// Navigation settings.
	let navigationOverride;
	let navigationStart; // Initially set by `Story.load()`.
	let navigationTransitionOut;

	// Passages settings.
	let passagesDescriptions;
	let passagesNobr         = false;
	let passagesOnProcess;

	// Saves settings.
	let savesAutoload;
	let savesAutosave;
	let savesId        = 'untitled-story';
	let savesIsAllowed;
	let savesOnLoad;
	let savesOnSave;
	let savesSlots     = 8;
	let savesVersion;

	// Startup settings.
	let startupDelay = 0;

	// UI settings.
	let uiHistoryControls     = true;
	let uiStowBarInitially    = 800;
	let uiUpdateStoryElements = true;


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.freeze({
		/*
			General settings.
		*/
		get debug() { return debug; },
		set debug(value) { debug = Boolean(value); },

		// QUESTION: Make a `Config.links` hierarchy: `Config.links.addVisitedClass`?
		get addVisitedLinkClass() { return addVisitedLinkClass; },
		set addVisitedLinkClass(value) { addVisitedLinkClass = Boolean(value); },

		// QUESTION: Make a `Config.markup` hierarchy: `Config.markup.convertBreaks`?
		// QUESTION: Make a `Config.parser` hierarchy: `Config.parser.convertBreaks`?
		get cleanupWikifierOutput() { return cleanupWikifierOutput; },
		set cleanupWikifierOutput(value) { cleanupWikifierOutput = Boolean(value); },

		/*
			Audio settings.
		*/
		audio : Object.freeze({
			get pauseOnFadeToZero() { return audioPauseOnFadeToZero; },
			set pauseOnFadeToZero(value) { audioPauseOnFadeToZero = Boolean(value); },

			get preloadMetadata() { return audioPreloadMetadata; },
			set preloadMetadata(value) { audioPreloadMetadata = Boolean(value); }
		}),

		/*
			State history settings.
		*/
		history : Object.freeze({
			get maxStates() { return historyMaxStates; },
			set maxStates(value) {
				if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
					throw new RangeError('Config.history.maxStates must be an integer in the range 1–100');
				}

				historyMaxStates = value;
			}
		}),

		/*
			Macros settings.
		*/
		macros : Object.freeze({
			get ifAssignmentError() { return macrosIfAssignmentError; },
			set ifAssignmentError(value) { macrosIfAssignmentError = Boolean(value); },

			get forMaxIterations() { return macrosForMaxIterations; },
			set forMaxIterations(value) {
				if (!Number.isSafeInteger(value) || value < 0) {
					throw new RangeError('Config.macros.forMaxIterations must be a non-negative integer');
				}

				macrosForMaxIterations = value;
			},

			get typeSkipKey() { return macrosTypeSkipKey; },
			set typeSkipKey(value) { macrosTypeSkipKey = String(value); },

			get typeVisitedPassages() { return macrosTypeVisitedPassages; },
			set typeVisitedPassages(value) { macrosTypeVisitedPassages = Boolean(value); }
		}),

		/*
			Navigation settings.
		*/
		navigation : Object.freeze({
			get override() { return navigationOverride; },
			set override(value) {
				if (!(value == null || value instanceof Function)) { // lazy equality for null
					throw new TypeError(`Config.navigation.override must be a function or null/undefined (received: ${getTypeOf(value)})`);
				}

				navigationOverride = value;
			},

			get start() { return navigationStart; },
			set start(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (valueType !== 'string' || value.trim() === '') {
						throw new TypeError(`Config.navigation.start must be a non-empty string or null/undefined (received: ${valueType})`);
					}
				}

				navigationStart = value;
			},

			get transitionOut() { return navigationTransitionOut; },
			set transitionOut(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (
						(valueType !== 'string' || value.trim() === '')
						&& (valueType !== 'number' || !Number.isSafeInteger(value) || value < 0)
					) {
						throw new TypeError(`Config.navigation.transitionOut must be a non-empty string, non-negative integer, or null/undefined (received: ${valueType})`);
					}
				}

				navigationTransitionOut = value;
			}
		}),

		/*
			Passages settings.
		*/
		passages : Object.freeze({
			get descriptions() { return passagesDescriptions; },
			set descriptions(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (valueType !== 'boolean' && valueType !== 'Object' && valueType !== 'function') {
						throw new TypeError(`Config.passages.descriptions must be a boolean, object, function, or null/undefined (received: ${valueType})`);
					}
				}

				passagesDescriptions = value;
			},

			get nobr() { return passagesNobr; },
			set nobr(value) { passagesNobr = Boolean(value); },

			get onProcess() { return passagesOnProcess; },
			set onProcess(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (valueType !== 'function') {
						throw new TypeError(`Config.passages.onProcess must be a function or null/undefined (received: ${valueType})`);
					}
				}

				passagesOnProcess = value;
			}
		}),

		/*
			Saves settings.
		*/
		saves : Object.freeze({
			get autoload() { return savesAutoload; },
			set autoload(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (valueType !== 'boolean' && valueType !== 'string' && valueType !== 'function') {
						throw new TypeError(`Config.saves.autoload must be a boolean, string, function, or null/undefined (received: ${valueType})`);
					}
				}

				savesAutoload = value;
			},

			get autosave() { return savesAutosave; },
			set autosave(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (
						valueType !== 'boolean'
						&& (valueType !== 'Array' || !value.every(item => typeof item === 'string'))
						&& valueType !== 'function'
					) {
						throw new TypeError(`Config.saves.autosave must be a boolean, Array of strings, function, or null/undefined (received: ${valueType}${valueType === 'Array' ? ' of mixed' : ''})`);
					}
				}

				savesAutosave = value;
			},

			get id() { return savesId; },
			set id(value) {
				if (typeof value !== 'string' || value === '') {
					throw new TypeError(`Config.saves.id must be a non-empty string (received: ${getTypeOf(value)})`);
				}

				savesId = value;
			},

			get isAllowed() { return savesIsAllowed; },
			set isAllowed(value) {
				if (!(value == null || value instanceof Function)) { // lazy equality for null
					throw new TypeError(`Config.saves.isAllowed must be a function or null/undefined (received: ${getTypeOf(value)})`);
				}

				savesIsAllowed = value;
			},

			get onLoad() { return savesOnLoad; },
			set onLoad(value) {
				if (!(value == null || value instanceof Function)) { // lazy equality for null
					throw new TypeError(`Config.saves.onLoad must be a function or null/undefined (received: ${getTypeOf(value)})`);
				}

				savesOnLoad = value;
			},

			get onSave() { return savesOnSave; },
			set onSave(value) {
				if (!(value == null || value instanceof Function)) { // lazy equality for null
					throw new TypeError(`Config.saves.onSave must be a function or null/undefined (received: ${getTypeOf(value)})`);
				}

				savesOnSave = value;
			},

			get slots() { return savesSlots; },
			set slots(value) {
				if (!Number.isSafeInteger(value) || value < 0) {
					throw new TypeError(`Config.saves.slots must be a non-negative integer (received: ${getTypeOf(value)})`);
				}

				savesSlots = value;
			},

			get version() { return savesVersion; },
			set version(value) { savesVersion = value; }
		}),

		/*
			Startup settings.
		*/
		startup : Object.freeze({
			get delay() { return startupDelay; },
			set delay(value) {
				if (!Number.isSafeInteger(value) || value < 0) {
					throw new RangeError('Config.startup.delay must be a non-negative integer');
				}

				startupDelay = value;
			}
		}),

		/*
			UI settings.
		*/
		ui : Object.freeze({
			get historyControls() {
				// NOTE: Force `false` when `historyMaxStates` is `1`.
				return historyMaxStates === 1 ? false : uiHistoryControls;
			},
			set historyControls(value) { uiHistoryControls = Boolean(value); },

			get stowBarInitially() { return uiStowBarInitially; },
			set stowBarInitially(value) {
				const valueType = getTypeOf(value);

				if (
					valueType !== 'boolean'
					&& (valueType !== 'number' || !Number.isSafeInteger(value) || value < 0)
				) {
					throw new TypeError(`Config.ui.stowBarInitially must be a boolean or non-negative integer (received: ${valueType})`);
				}

				uiStowBarInitially = value;
			},

			get updateStoryElements() { return uiUpdateStoryElements; },
			set updateStoryElements(value) { uiUpdateStoryElements = Boolean(value); }
		})
	});
})();


/*
	Module Exports.
*/
export default Config;
