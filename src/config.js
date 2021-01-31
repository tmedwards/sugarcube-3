/***********************************************************************************************************************

	config.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import { MAX_SAVE_ID } from './constants';
import getTypeOf from './utils/gettypeof';


/*
	Config API static object.
*/
const Config = (() => {
	// General settings.
	let debug                 = false;
	let language;
	let addVisitedLinkClass   = false;
	let cleanupWikifierOutput = false;

	// Audio settings.
	let audioPauseOnFadeToZero = true;
	let audioPreloadMetadata   = true;

	// Macros settings.
	let macrosIfAssignmentError   = true;
	let macrosForMaxIterations    = 5000;
	let macrosTypeSkipKey         = '\x20'; // Space
	let macrosTypeVisitedPassages = true;

	// Navigation settings.
	let navigationOverride;
	let navigationStart; // NOTE: Initially set by `Story.load()`.
	let navigationTransitionOut;

	// Passages settings.
	let passagesNobr      = false;
	let passagesOnProcess;

	// Saves settings.
	let savesDescriptions;
	let savesId; // NOTE: Initially set by `Story.load()`.
	let savesIsAllowed;
	let savesMaxAuto      = 5;
	let savesMaxSlot      = 10;
	let savesOnLoad;
	let savesOnSave;
	let savesVersion;

	// Startup settings.
	let startupDelay = 0;

	// UI settings.
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

		get language() { return language; },
		set language(value) {
			if (value != null) { // lazy equality for null
				const valueType = getTypeOf(value);

				if (valueType !== 'string' || value.trim() === '') {
					throw new TypeError(`Config.language must be a non-empty string or null/undefined (received: ${valueType})`);
				}
			}

			language = value;
		},

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
			get descriptions() { return savesDescriptions; },
			set descriptions(value) {
				if (value != null) { // lazy equality for null
					const valueType = getTypeOf(value);

					if (valueType !== 'function') {
						throw new TypeError(`Config.saves.descriptions must be a function or null/undefined (received: ${valueType})`);
					}
				}

				savesDescriptions = value;
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

			get maxAutoSaves() { return savesMaxAuto; },
			set maxAutoSaves(value) {
				if (!Number.isInteger(value)) {
					throw new TypeError('Config.saves.maxAutoSaves must be an integer');
				}
				else if (value < 0 || value > MAX_SAVE_ID + 1) {
					throw new RangeError(`Config.saves.maxAutoSaves out of bounds (range: 0–${MAX_SAVE_ID + 1}; received: ${value})`);
				}

				savesMaxAuto = value;
			},

			get maxSlotSaves() { return savesMaxSlot; },
			set maxSlotSaves(value) {
				if (!Number.isInteger(value)) {
					throw new TypeError('Config.saves.maxSlotSaves must be an integer');
				}
				else if (value < 0 || value > MAX_SAVE_ID + 1) {
					throw new RangeError(`Config.saves.maxSlotSaves out of bounds (range: 0–${MAX_SAVE_ID + 1}; received: ${value})`);
				}

				savesMaxSlot = value;
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
