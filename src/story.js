/***********************************************************************************************************************

	story.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Passage from './passage';
import Wikifier from './markup/wikifier';
import characterAndPosAt from './utils/characterandposat';
import createSlug from './utils/createslug';
import decodeEntities from './utils/decodeentities';
import sameValueZero from './utils/samevaluezero';


/*
	Story API static object.
*/
const Story = (() => {
	// Map of normal passages.
	const _passages = new Map();

	// Array of script passages.
	const _scripts = [];

	// Array of style passages.
	const _styles = [];

	// Array of widget passages.
	const _widgets = [];

	// Story title.
	let _title = '';

	// Story IFID.
	let _ifId = '';

	// DOM-compatible ID.
	let _domId = '';


	/*******************************************************************************
		Story Functions.
	*******************************************************************************/

	function storyLoad() {
		if (BUILD_DEBUG) { console.log('[Story/storyLoad()]'); }

		const validationCodeTags = [
			'widget'
		];
		const validationNoCodeTagPassages = [
			'PassageDone',
			'PassageFooter',
			'PassageHeader',
			'PassageReady',
			'StoryAuthor',
			'StoryBanner',
			'StoryCaption',
			'StoryDisplayTitle',
			'StoryInit',
			'StoryMenu',
			'StorySubtitle'
		];
		const validateStartingPassage = function validateStartingPassage(passage) {
			if (passage.tags.includesAny(validationCodeTags)) {
				throw new Error(`starting passage "${passage.title}" contains illegal tags; invalid: "${passage.tags.filter(tag => validationCodeTags.includes(tag)).sort().join('", "')}"`);
			}
		};
		const validateSpecialPassages = function validateSpecialPassages(passage) {
			if (validationNoCodeTagPassages.includes(passage.title) && passage.tags.includesAny(validationCodeTags)) {
				throw new Error(`special passage "${passage.title}" contains illegal tags; invalid: "${passage.tags.filter(tag => validationCodeTags.includes(tag)).sort().join('", "')}"`);
			}
		};

		// Twine 1 build.
		if (BUILD_TWINE_1) {
			// Additional Twine 1 validation setup.
			validationCodeTags.unshift('script', 'stylesheet');
			validationNoCodeTagPassages.push('StoryTitle');

			const validateTwine1CodePassages = function validateTwine1CodePassages(passage) {
				const codeTags  = Array.from(validationCodeTags);
				const foundTags = [];

				passage.tags.forEach(tag => {
					if (codeTags.includes(tag)) {
						foundTags.push(...codeTags.delete(tag));
					}
				});

				if (foundTags.length > 1) {
					throw new Error(`code passage "${passage.title}" contains multiple code tags; invalid: "${foundTags.sort().join('", "')}"`);
				}
			};

			// Set the default starting passage.
			Config.navigation.start = (() => {
				/*
					Handle the Twine 1.4+ Test Play From Here feature.

					WARNING: Do not remove the `String()` wrapper from or change the quote
					style of the `"START_AT"` replacement target.  The former is there to
					keep UglifyJS from pruning the code into oblivion—i.e. minifying the
					code into something broken.  The latter is there because the Twine 1
					pattern that matches it depends upon the double quotes.

				*/
				const testPlay = String("START_AT"); // eslint-disable-line quotes

				if (testPlay !== '') {
					if (BUILD_DEBUG) { console.log(`\tTest play; starting passage: "${testPlay}"`); }

					Config.debug = true;
					return testPlay;
				}

				// In the absence of a `testPlay` value, return 'Start'.
				return 'Start';
			})();

			// Process the passages, excluding any tagged 'Twine.private' or 'annotation'.
			jQuery('#store-area')
				.children(':not([tags~="Twine.private"],[tags~="annotation"])')
				.each(function () {
					const $this   = jQuery(this);
					const passage = new Passage($this.attr('tiddler'), this);

					// Special cases.
					if (passage.title === Config.navigation.start) {
						validateStartingPassage(passage);
						_passages.set(passage.title, passage);
					}
					else if (passage.tags.includes('stylesheet')) {
						validateTwine1CodePassages(passage);
						_styles.push(passage);
					}
					else if (passage.tags.includes('script')) {
						validateTwine1CodePassages(passage);
						_scripts.push(passage);
					}
					else if (passage.tags.includes('widget')) {
						validateTwine1CodePassages(passage);
						_widgets.push(passage);
					}

					// All other passages.
					else {
						validateSpecialPassages(passage);
						_passages.set(passage.title, passage);
					}
				});

			// Set the story title or throw an exception.
			if (_passages.has('StoryTitle')) {
				const buf = document.createDocumentFragment();
				new Wikifier(buf, _passages.get('StoryTitle').text.trim(), { noCleanup : true });
				_storySetTitle(buf.textContent);
			}
			else {
				throw new Error('cannot find the "StoryTitle" special passage');
			}

			// Set the default saves ID (must be done after the call to `_storySetTitle()`).
			Config.saves.id = Story.domId;
		}

		// Twine 2 build.
		else {
			const $storydata = jQuery('tw-storydata');
			const startNode  = $storydata.attr('startnode') || '';

			// Set the default starting passage.
			Config.navigation.start = null; // no default in Twine 2

			// Process story options.
			//
			// NOTE: Currently, the only option of interest is 'debug', so we
			// simply use a regular expression to check for it.
			Config.debug = /\bdebug\b/.test($storydata.attr('options'));

			// Process stylesheet passages.
			$storydata
				.children('style') // alternatively: '[type="text/twine-css"]' or '#twine-user-stylesheet'
				.each(function (i) {
					_styles.push(new Passage(`tw-user-style-${i}`, this));
				});

			// Process script passages.
			$storydata
				.children('script') // alternatively: '[type="text/twine-javascript"]' or '#twine-user-script'
				.each(function (i) {
					_scripts.push(new Passage(`tw-user-script-${i}`, this));
				});

			// Process normal passages, excluding any tagged 'Twine.private' or 'annotation'.
			$storydata
				.children('tw-passagedata:not([tags~="Twine.private"],[tags~="annotation"])')
				.each(function () {
					const $this   = jQuery(this);
					const pid     = $this.attr('pid') || '';
					const passage = new Passage($this.attr('name'), this);

					// Special cases.
					if (pid === startNode && startNode !== '') {
						Config.navigation.start = passage.title;
						validateStartingPassage(passage);
						_passages.set(passage.title, passage);
					}
					else if (passage.tags.includes('widget')) {
						_widgets.push(passage);
					}

					// All other passages.
					else {
						validateSpecialPassages(passage);
						_passages.set(passage.title, passage);
					}
				});

			// Get the story IFID.
			_ifId = $storydata.attr('ifid');

			// Set the story title.
			//
			// QUESTION: Maybe `$storydata.attr('name')` should be used instead of `'{{STORY_NAME}}'`?
			// _storySetTitle($storydata.attr('name'));
			_storySetTitle('{{STORY_NAME}}');

			// Set the default saves ID (must be done after the call to `_storySetTitle()`).
			//
			// QUESTION: Maybe use `createSlug(_title)` instead of the DOM ID?
			Config.saves.id = Story.domId;
		}
	}

	function _storySetTitle(rawTitle) {
		if (rawTitle == null) { // lazy equality for null
			throw new Error('story title must not be null or undefined');
		}

		const title = decodeEntities(String(rawTitle)).trim();

		if (title === '') { // lazy equality for null
			throw new Error('story title must not be empty or consist solely of whitespace');
		}

		// Set the story title and initial document title.
		document.title = _title = title;

		// Generate the base DOM ID from the story title's slug.
		_domId = `${createSlug(_title)}-`;

		// In an attempt to help avoid collisions between stories whose titles
		// alone generate identical IDs, we append either the IFID, if available,
		// or the hexadecimal encoding of the story title's code points.
		if (_ifId) {
			_domId += _ifId.replace(/-/g, '');
		}
		else {
			for (let i = 0, length = _title.length; i < length; ++i) {
				const { char, start, end } = characterAndPosAt(_title, i);
				_domId += char.codePointAt(0).toString(16);
				i += end - start;
			}
		}
	}

	function storyTitle() {
		return _title;
	}

	function storyDomId() {
		return _domId;
	}

	function storyIfId() {
		return _ifId;
	}


	/*******************************************************************************
		Passage Functions.
	*******************************************************************************/

	function passagesAdd(passage) {
		if (!(passage instanceof Passage)) {
			throw new TypeError('Story.add passage parameter must be an instance of Passage');
		}

		const title = passage.title;

		if (!_passages.has(title)) {
			_passages.set(title, passage);
			return true;
		}

		return false;
	}

	function passagesHas(title) {
		let type = typeof title;

		switch (type) {
			// Valid types.
			case 'number':
			case 'string':
				return _passages.has(String(title));

			// Invalid types.  We do the extra processing just to make a nicer error.
			case 'undefined':
				/* no-op */
				break;

			case 'object':
				type = title === null ? 'null' : 'an object';
				break;

			default: // 'bigint', 'boolean', 'function', 'symbol'
				type = `a ${type}`;
				break;
		}

		throw new TypeError(`Story.has title parameter cannot be ${type}`);
	}

	function passagesGet(title) {
		let type = typeof title;

		switch (type) {
			// Valid types.
			case 'number':
			case 'string': {
				const id = String(title);
				return _passages.has(id) ? _passages.get(id) : new Passage(id || '(unknown)');
			}

			// Invalid types.  We do the extra processing just to make a nicer error.
			case 'undefined':
				/* no-op */
				break;

			case 'object':
				type = title === null ? 'null' : 'an object';
				break;

			default: // 'bigint', 'boolean', 'function', 'symbol'
				type = `a ${type}`;
				break;
		}

		throw new TypeError(`Story.get title parameter cannot be ${type}`);
	}

	function passagesGetAllRegular() {
		// NOTE: Return an immutable copy, rather than the internal mutable original.
		return Object.freeze(new Map(_passages));
	}

	function passagesGetAllScript() {
		// NOTE: Return an immutable copy, rather than the internal mutable original.
		return Object.freeze(Array.from(_scripts));
	}

	function passagesGetAllStylesheet() {
		// NOTE: Return an immutable copy, rather than the internal mutable original.
		return Object.freeze(Array.from(_styles));
	}

	function passagesGetAllWidget() {
		// NOTE: Return an immutable copy, rather than the internal mutable original.
		return Object.freeze(Array.from(_widgets));
	}

	function passagesLookup(key, value) {
		const results = [];

		_passages.forEach(passage => {
			// Objects (sans `null`).
			if (typeof passage[key] === 'object' && passage[key] !== null) {
				// The only object type currently supported is `Array`, since the
				// non-method `Passage` object properties currently yield only either
				// primitives or arrays.
				if (passage[key] instanceof Array && passage[key].some(m => sameValueZero(m, value))) {
					results.push(passage);
				}
			}

			// All other types (incl. `null`).
			else if (sameValueZero(passage[key], value)) {
				results.push(passage);
			}
		});

		/* eslint-disable no-nested-ternary */
		// QUESTION: Do we really need to sort the list?
		results.sort((a, b) => a.title === b.title ? 0 : a.title < b.title ? -1 : +1);
		/* eslint-enable no-nested-ternary */

		return results;
	}

	function passagesLookupWith(predicate) {
		if (typeof predicate !== 'function') {
			throw new TypeError('Story.lookupWith predicate parameter must be a function');
		}

		const results = [];

		_passages.forEach(passage => {
			if (predicate(passage)) {
				results.push(passage);
			}
		});

		/* eslint-disable no-nested-ternary */
		// QUESTION: Do we really need to sort the list?
		results.sort((a, b) => a.title === b.title ? 0 : a.title < b.title ? -1 : +1);
		/* eslint-enable no-nested-ternary */

		return results;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Story Functions.
		load  : { value : storyLoad },
		title : { get : storyTitle },
		domId : { get : storyDomId },
		ifId  : { get : storyIfId },

		// Passage Functions.
		add              : { value : passagesAdd },
		has              : { value : passagesHas },
		get              : { value : passagesGet },
		getAllRegular    : { value : passagesGetAllRegular },
		getAllScript     : { value : passagesGetAllScript },
		getAllStylesheet : { value : passagesGetAllStylesheet },
		getAllWidget     : { value : passagesGetAllWidget },
		lookup           : { value : passagesLookup },
		lookupWith       : { value : passagesLookupWith }
	}));
})();


/*
	Module Exports.
*/
export default Story;
