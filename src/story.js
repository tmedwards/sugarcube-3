/***********************************************************************************************************************

	story.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import Passage from '~/passage';
import createSlug from '~/utils/createslug';
import decodeEntities from '~/utils/decodeentities';
import sameValueZero from '~/utils/samevaluezero';


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

	// Story name.
	let _name = '';

	// Story IFID.
	let _ifId = '';

	// DOM-compatible ID.
	let _id = '';


	/*******************************************************************************
		Story Functions.
	*******************************************************************************/

	function storyLoad() {
		if (BUILD_DEBUG) { console.log('[Story/storyLoad()]'); }

		const codeTags = Object.freeze([
			'widget'
		]);
		const specialPassages = Object.freeze([
			'PassageDone',
			'PassageFooter',
			'PassageHeader',
			'PassageReady',
			'StoryAuthor',
			'StoryBanner',
			'StoryCaption',
			'StoryDisplayTitle',
			'StoryInit',
			'StoryInterface',
			'StoryMenu',
			'StorySubtitle'
		]);

		const $storydata = jQuery('tw-storydata');
		const startNode  = $storydata.attr('startnode') ?? '';

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
				const pid     = $this.attr('pid') ?? '';
				const passage = new Passage($this.attr('name'), this);

				// Special cases.
				if (pid === startNode && startNode !== '') {
					if (passage.tags.includesAny(codeTags)) {
						throw new Error(`starting passage "${passage.name}" contains illegal tags; invalid: "${passage.tags.filter(tag => codeTags.includes(tag)).sort().join('", "')}"`);
					}

					Config.navigation.start = passage.name;
					_passages.set(passage.name, passage);
				}
				else if (passage.tags.includes('widget')) {
					_widgets.push(passage);
				}

				// All other passages.
				else {
					if (specialPassages.includes(passage.name) && passage.tags.includesAny(codeTags)) {
						throw new Error(`special passage "${passage.name}" contains illegal tags; invalid: "${passage.tags.filter(tag => codeTags.includes(tag)).sort().join('", "')}"`);
					}

					_passages.set(passage.name, passage);
				}
			});

		// Get the story IFID.
		_ifId = $storydata.attr('ifid');

		// Set the story name.
		_name = $storydata.attr('name');

		if (_name == null) { // lazy equality for null
			throw new Error('story name must not be null or undefined');
		}

		_name = decodeEntities(_name).trim();

		if (_name === '') { // lazy equality for null
			throw new Error('story name must not be empty or consist solely of whitespace');
		}

		// Generate the story ID from its name's slug and IFID.
		_id = `${createSlug(_name)}_${_ifId.replace(/-/g, '')}`;

		// Set the default saves ID to the story's ID.
		Config.saves.id = _id;

		// Set the document title.
		document.title = _name;
	}

	function storyName() {
		return _name;
	}

	function storyId() {
		return _id;
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

		const title = passage.name;

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
		results.sort((a, b) => a.name === b.name ? 0 : a.name < b.name ? -1 : +1);
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
		results.sort((a, b) => a.name === b.name ? 0 : a.name < b.name ? -1 : +1);
		/* eslint-enable no-nested-ternary */

		return results;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Story Functions.
		load : { value : storyLoad },
		name : { get : storyName },
		id   : { get : storyId },
		ifId : { get : storyIfId },

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
