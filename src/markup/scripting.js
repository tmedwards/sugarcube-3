/***********************************************************************************************************************

	markup/scripting.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	===============================================================================
	WARNING  *  WARNING  *  WARNING  *  WARNING  *  WARNING  *  WARNING  *  WARNING
	===============================================================================

	Rollup.js' tree shaking will gut this file since most of its functions are
	meant to be called by user code, via `evalJavaScript` and `evalTwineScript`,
	and are not referenced anywhere within the codebase.

	Until I can find a workaround, tree shaking MUST NOT be enabled.
*/

import Engine from './engine';
import Patterns from './lib/patterns';
import State from './state';
import Story from './story';
import getTypeOf from './utils/gettypeof';
import mappingFrom from './utils/mappingfrom';
import now from './utils/now';
import parseURL from './utils/parseurl';


// setup object.
const setup = {};

/*
	Scripting API static object.
*/
const Scripting = (() => {
	/* eslint-disable no-unused-vars */

	/*******************************************************************************
		User Functions.
	*******************************************************************************/

	/*
		Returns a random value from its given arguments.
	*/
	function either(/* variadic */) {
		if (arguments.length === 0) {
			return;
		}

		return Array.prototype.concat.apply([], arguments).random();
	}

	/*
		Removes the given key, and its value, from the story metadata store.
	*/
	function forget(key) {
		if (typeof key !== 'string') {
			throw new TypeError(`forget key parameter must be a string (received: ${getTypeOf(key)})`);
		}

		State.metadata.delete(key);
	}

	/*
		Returns whether a passage with the given title exists within the story
		history.  If multiple passage titles are given, returns the logical-AND
		aggregate of the set.
	*/
	function hasVisited(/* variadic */) {
		if (arguments.length === 0) {
			throw new Error('hasVisited called with insufficient parameters');
		}

		if (State.isEmpty()) {
			return false;
		}

		const needles = Array.prototype.concat.apply([], arguments);
		const played  = State.passages;

		for (let i = 0, iend = needles.length; i < iend; ++i) {
			if (!played.includes(needles[i])) {
				return false;
			}
		}

		return true;
	}

	/*
		Returns the number of turns that have passed since the last instance of the given passage
		occurred within the story history or `-1` if it does not exist.  If multiple passages are
		given, returns the lowest count (which can be `-1`).
	*/
	function lastVisited(/* variadic */) {
		if (arguments.length === 0) {
			throw new Error('lastVisited called with insufficient parameters');
		}

		if (State.isEmpty()) {
			return -1;
		}

		const needles = Array.prototype.concat.apply([], arguments);
		const played  = State.passages;
		const uBound  = played.length - 1;
		let turns = State.turns;

		for (let i = 0, iend = needles.length; i < iend && turns > -1; ++i) {
			const lastIndex = played.lastIndexOf(needles[i]);
			turns = Math.min(turns, lastIndex === -1 ? -1 : uBound - lastIndex);
		}

		return turns;
	}

	/*
		Sets the given key/value pair within the story metadata store.
	*/
	function memorize(key, value) {
		if (typeof key !== 'string') {
			throw new TypeError(`memorize key parameter must be a string (received: ${getTypeOf(key)})`);
		}

		State.metadata.set(key, value);
	}

	/*
		Returns the title of the current passage.
	*/
	function passage() {
		return State.passage;
	}

	/*
		Returns the title of a previous passage, either the most recent one whose title does not
		match that of the active passage or the one at the optional offset, or an empty string,
		if there is no such passage.
	*/
	function previous() {
		const passages = State.passages;

		for (let i = passages.length - 2; i >= 0; --i) {
			if (passages[i] !== State.passage) {
				return passages[i];
			}
		}

		return '';
	}

	/*
		Returns a pseudo-random whole number (integer) within the range of the given bounds.
	*/
	function random(/* [min ,] max */) {
		let min;
		let max;

		switch (arguments.length) {
			case 0:
				throw new Error('random called with insufficient parameters');

			case 1:
				min = 0;
				max = Math.trunc(arguments[0]);
				break;

			default:
				min = Math.trunc(arguments[0]);
				max = Math.trunc(arguments[1]);
				break;
		}

		if (!Number.isInteger(min)) {
			throw new Error('random min parameter must be an integer');
		}
		if (!Number.isInteger(max)) {
			throw new Error('random max parameter must be an integer');
		}

		if (min > max) {
			[min, max] = [max, min];
		}

		return Math.floor(State.random() * (max - min + 1)) + min;
	}

	/*
		Returns a pseudo-random real number (floating-point) within the range of the given bounds.

		NOTE: Unlike with its sibling function `random()`, the `max` parameter
		is exclusive, not inclusive—i.e. the range goes to, but does not include,
		the given value.
	*/
	function randomFloat(/* [min ,] max */) {
		let min;
		let max;

		switch (arguments.length) {
			case 0:
				throw new Error('randomFloat called with insufficient parameters');

			case 1:
				min = 0.0;
				max = Number(arguments[0]);
				break;

			default:
				min = Number(arguments[0]);
				max = Number(arguments[1]);
				break;
		}

		if (Number.isNaN(min) || !Number.isFinite(min)) {
			throw new Error('randomFloat min parameter must be a number');
		}
		if (Number.isNaN(max) || !Number.isFinite(max)) {
			throw new Error('randomFloat max parameter must be a number');
		}

		if (min > max) {
			[min, max] = [max, min];
		}

		return State.random() * (max - min) + min;
	}

	/*
		Returns the value of the given key from the story metadata store
		or the given default value if the key does not exist.
	*/
	function recall(key, defaultValue) {
		if (typeof key !== 'string') {
			throw new TypeError(`recall key parameter must be a string (received: ${getTypeOf(key)})`);
		}

		return State.metadata.has(key) ? State.metadata.get(key) : defaultValue;
	}

	/*
		Returns a new array consisting of all of the tags of the given passages.
	*/
	function tags(/* variadic */) {
		if (arguments.length === 0) {
			return Story.get(State.passage).tags.slice(0);
		}

		const passages = Array.prototype.concat.apply([], arguments);
		let tags = [];

		for (let i = 0, iend = passages.length; i < iend; ++i) {
			tags = tags.concat(Story.get(passages[i]).tags);
		}

		return tags;
	}

	/*
		Returns a reference to the current temporary _variables store.
	*/
	function temporary() {
		return State.temporary;
	}

	/*
		Returns the number of milliseconds which have passed since the current passage was rendered.
	*/
	function time() {
		return Engine.lastPlay === null ? 0 : now() - Engine.lastPlay;
	}

	/*
		Returns the number of passages that the player has visited.

		NOTE: Passages which were visited but have been undone—e.g. via the backward
		button or the `<<back>>` macro—are no longer part of the in-play story
		history and thus are not tallied.  Passages which were visited but have
		expired from the story history, on the other hand, are tallied.
	*/
	function turns() {
		return State.turns;
	}

	/*
		Returns a reference to the current story $variables store.
	*/
	function variables() {
		return State.variables;
	}

	/*
		Returns the number of times that the passage with the given title exists within the story
		history.  If multiple passage titles are given, returns the lowest count.
	*/
	function visited(/* variadic */) {
		if (State.isEmpty()) {
			return 0;
		}

		const needles = Array.prototype.concat.apply([], arguments.length === 0 ? [State.passage] : arguments);
		const played  = State.passages;
		let count = State.turns;

		for (let i = 0, iend = needles.length; i < iend && count > 0; ++i) {
			count = Math.min(count, played.count(needles[i]));
		}

		return count;
	}

	/*
		Returns the number of passages within the story history which are tagged with all of the given tags.
	*/
	function visitedTags(/* variadic */) {
		if (arguments.length === 0) {
			throw new Error('visitedTags called with insufficient parameters');
		}

		if (State.isEmpty()) {
			return 0;
		}

		const needles = Array.prototype.concat.apply([], arguments);
		const nLength = needles.length;
		const played  = State.passages;
		const seen    = new Map();
		let count = 0;

		for (let i = 0, iend = played.length; i < iend; ++i) {
			const title = played[i];

			if (seen.has(title)) {
				if (seen.get(title)) {
					++count;
				}
			}
			else {
				const tags = Story.get(title).tags;

				if (tags.length > 0) {
					let found = 0;

					for (let j = 0; j < nLength; ++j) {
						if (tags.includes(needles[j])) {
							++found;
						}
					}

					if (found === nLength) {
						++count;
						seen.set(title, true);
					}
					else {
						seen.set(title, false);
					}
				}
			}
		}

		return count;
	}

	/* eslint-enable no-unused-vars */


	/*******************************************************************************
		Import Functions.
	*******************************************************************************/

	var { // eslint-disable-line no-var
		/* eslint-disable no-unused-vars */
		importScripts,
		importStyles
		/* eslint-enable no-unused-vars */
	} = (() => {
		// Slugify the given URL.
		function slugifyUrl(url) {
			return parseURL(url).path
				.replace(/^[^\w]+|[^\w]+$/g, '')
				.replace(/[^\w]+/g, '-')
				.toLocaleLowerCase();
		}

		// Add a <script> element which will load the script from the given URL.
		function addScript(url) {
			return new Promise((resolve, reject) => {
				// WARNING: The ordering of the code within this function is important,
				// as some browsers don't play well with different arrangements, so
				// be careful when mucking around with it.
				//
				// The best supported ordering seems be: events → DOM append → attributes.
				jQuery(document.createElement('script'))
					.one('load abort error', ev => {
						jQuery(ev.target).off();

						if (ev.type === 'load') {
							resolve(ev.target);
						}
						else {
							reject(new Error(`importScripts failed to load the script "${url}".`));
						}
					})
					.appendTo(document.head)
					.attr({
						id   : `script-imported-${slugifyUrl(url)}`,
						type : 'text/javascript',
						src  : url
					});
			});
		}

		// Add a <link> element which will load the stylesheet from the given URL.
		function addStyle(url) {
			return new Promise((resolve, reject) => {
				// WARNING: The ordering of the code within this function is important,
				// as some browsers don't play well with different arrangements, so
				// be careful when mucking around with it.
				//
				// The best supported ordering seems be: events → DOM append → attributes.
				jQuery(document.createElement('link'))
					.one('load abort error', ev => {
						jQuery(ev.target).off();

						if (ev.type === 'load') {
							resolve(ev.target);
						}
						else {
							reject(new Error(`importStyles failed to load the stylesheet "${url}".`));
						}
					})
					.appendTo(document.head)
					.attr({
						id   : `style-imported-${slugifyUrl(url)}`,
						rel  : 'stylesheet',
						href : url
					});
			});
		}

		// Turn a list of callbacks into a sequential chain of `Promise` objects.
		function sequence(callbacks) {
			return callbacks.reduce((seq, fn) => seq = seq.then(fn), Promise.resolve()); // eslint-disable-line no-param-reassign
		}

		/*
			Import scripts from a URL.
		*/
		function importScripts(...urls) {
			return Promise.all(urls.map(oneOrSeries => {
				// Array of URLs to be imported in sequence.
				if (oneOrSeries instanceof Array) {
					return sequence(oneOrSeries.map(url => () => addScript(url)));
				}

				// Single URL to be imported.
				return addScript(oneOrSeries);
			}));
		}

		/*
			Import stylesheets from a URL.
		*/
		function importStyles(...urls) {
			return Promise.all(urls.map(oneOrSeries => {
				// Array of URLs to be imported in sequence.
				if (oneOrSeries instanceof Array) {
					return sequence(oneOrSeries.map(url => () => addStyle(url)));
				}

				// Single URL to be imported.
				return addStyle(oneOrSeries);
			}));
		}

		// Exports.
		return {
			importScripts,
			importStyles
		};
	})();


	/*******************************************************************************
		Parsing Functions.
	*******************************************************************************/

	/*
		Returns the given string after converting all TwineScript syntactical sugars to
		their native JavaScript counterparts.
	*/
	const parse = (() => {
		const tokenTable = mappingFrom({
			/* eslint-disable quote-props */
			// Story $variable sigil-prefix.
			'$'     : 'State.variables.',
			// Temporary _variable sigil-prefix.
			'_'     : 'State.temporary.',
			// Assignment operators.
			'to'    : '=',
			// Equality operators.
			'eq'    : '==',
			'neq'   : '!=',
			'is'    : '===',
			'isnot' : '!==',
			// Relational operators.
			'gt'    : '>',
			'gte'   : '>=',
			'lt'    : '<',
			'lte'   : '<=',
			// Logical operators.
			'and'   : '&&',
			'or'    : '||',
			// Unary operators.
			'not'   : '!',
			'def'   : '"undefined" !== typeof',
			'ndef'  : '"undefined" === typeof'
			/* eslint-enable quote-props */
		});
		const parseRE = new RegExp([
			'(""|\'\')',                                          // 1=Empty quotes
			'("(?:\\\\.|[^"\\\\])+")',                            // 2=Double quoted, non-empty
			"('(?:\\\\.|[^'\\\\])+')",                            // 3=Single quoted, non-empty
			'([=+\\-*\\/%<>&\\|\\^~!?:,;\\(\\)\\[\\]{}]+)',       // 4=Operator delimiters
			'([^"\'=+\\-*\\/%<>&\\|\\^~!?:,;\\(\\)\\[\\]{}\\s]+)' // 5=Barewords
		].join('|'), 'g');
		const notSpaceRE      = /\S/;
		const variableTestRE  = new RegExp(`^${Patterns.variable}`);
		const withColonTestRE = /^\s*:/;
		const withNotTestRE   = /^\s+not\b/;

		function parse(rawCodeString) {
			if (parseRE.lastIndex !== 0) {
				throw new RangeError('Scripting.parse last index is non-zero at start');
			}

			let code  = rawCodeString;
			let match;

			while ((match = parseRE.exec(code)) !== null) {
				// no-op: Empty quotes | Double quoted | Single quoted | Operator delimiters

				// Barewords.
				if (match[5]) {
					let token = match[5];

					// If the token is simply a dollar-sign or underscore, then it's either
					// just the raw character or, probably, a function alias, so skip it.
					if (token === '$' || token === '_') {
						continue;
					}

					// If the token is a story $variable or temporary _variable, reset it
					// to just its sigil—for later mapping.
					else if (variableTestRE.test(token)) {
						token = token[0];
					}

					// If the token is `is`, check to see if it's followed by `not`, if so,
					// convert them into the `isnot` operator.
					//
					// NOTE: This is a safety feature, since `$a is not $b` probably sounds
					// reasonable to most users.
					else if (token === 'is') {
						const start = parseRE.lastIndex;
						const ahead = code.slice(start);

						if (withNotTestRE.test(ahead)) {
							code = code.splice(start, ahead.search(notSpaceRE));
							token = 'isnot';
						}
					}

					// If the token is followed by a colon, then it's likely to be an object
					// property, so skip it.
					else {
						const ahead = code.slice(parseRE.lastIndex);

						if (withColonTestRE.test(ahead)) {
							continue;
						}
					}

					// If the finalized token has a mapping, replace it within the code string
					// with its counterpart.
					if (tokenTable[token]) {
						code = code.splice(
							match.index,      // starting index
							token.length,     // replace how many
							tokenTable[token] // replacement string
						);
						parseRE.lastIndex += tokenTable[token].length - token.length;
					}
				}
			}

			return code;
		}

		return parse;
	})();


	/*******************************************************************************
		Eval Functions.
	*******************************************************************************/

	/* eslint-disable no-eval, no-extra-parens, no-unused-vars */
	/*
		Evaluates the given JavaScript code and returns the result, throwing if there were errors.
	*/
	function evalJavaScript(code, output, data) {
		return (function (code, output, evalJavaScript$Data$) {
			return eval(code);
		}).call(output ? { output } : null, String(code), output, data);
	}

	/*
		Evaluates the given TwineScript code and returns the result, throwing if there were errors.
	*/
	function evalTwineScript(code, output, data) {
		// NOTE: Do not move the dollar sign to the front of `evalTwineScript$Data$`,
		// as `parse()` will break references to it within the code string.
		return (function (code, output, evalTwineScript$Data$) {
			return eval(code);
		}).call(output ? { output } : null, parse(String(code)), output, data);
	}
	/* eslint-enable no-eval, no-extra-parens, no-unused-vars */


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		parse           : { value : parse },
		evalJavaScript  : { value : evalJavaScript },
		evalTwineScript : { value : evalTwineScript }
	}));
})();


/*
	Module Exports.
*/
export { Scripting as default, setup };
