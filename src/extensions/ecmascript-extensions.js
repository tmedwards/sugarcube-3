/***********************************************************************************************************************

	extensions/ecmascript-extensions.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import stringFrom from './utils/stringfrom';


/*
	ECMAScript Extensions.
*/
(() => {
	// Attempt to cache the native `Math.random`, in case it's replaced later.
	const _nativeMathRandom = Math.random;


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	/*
		Returns a pseudo-random whole number (integer) within the given bounds.
	*/
	function _random(/* [min ,] max */) {
		let min;
		let max;

		switch (arguments.length) {
			case 0:
				throw new Error('_random called with insufficient parameters');

			case 1:
				min = 0;
				max = arguments[0];
				break;

			default:
				min = arguments[0];
				max = arguments[1];
				break;
		}

		if (min > max) {
			[min, max] = [max, min];
		}

		return Math.floor(_nativeMathRandom() * (max - min + 1)) + min;
	}

	/*
		Returns an object (`{ char, start, end }`) containing the Unicode character at
		position `pos`, its starting position, and its ending position—surrogate pairs
		are properly handled.  If `pos` is out-of-bounds, returns an object containing
		the empty string and start/end positions of `-1`.

		This function is necessary because JavaScript strings are sequences of UTF-16
		code units, so surrogate pairs are exposed and thus must be handled.  While the
		ES6/2015 standard does improve the situation somewhat, it does not alleviate
		the need for this function.

		NOTE: Will throw exceptions on invalid surrogate pairs.

		IDEA: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
	*/
	function _getCodePointStartAndEnd(str, pos) {
		const code = str.charCodeAt(pos);

		// Given position was out-of-bounds.
		if (Number.isNaN(code)) {
			return { char : '', start : -1, end : -1 };
		}

		// Code unit is not a UTF-16 surrogate.
		if (code < 0xD800 || code > 0xDFFF) {
			return {
				char  : str.charAt(pos),
				start : pos,
				end   : pos
			};
		}

		// Code unit is a high surrogate (D800–DBFF).
		if (code >= 0xD800 && code <= 0xDBFF) {
			const nextPos = pos + 1;

			// End of string.
			if (nextPos >= str.length) {
				throw new Error('high surrogate without trailing low surrogate');
			}

			const nextCode = str.charCodeAt(nextPos);

			// Next code unit is not a low surrogate (DC00–DFFF).
			if (nextCode < 0xDC00 || nextCode > 0xDFFF) {
				throw new Error('high surrogate without trailing low surrogate');
			}

			return {
				char  : str.charAt(pos) + str.charAt(nextPos),
				start : pos,
				end   : nextPos
			};
		}

		// Code unit is a low surrogate (DC00–DFFF) in the first position.
		if (pos === 0) {
			throw new Error('low surrogate without leading high surrogate');
		}

		const prevPos  = pos - 1;
		const prevCode = str.charCodeAt(prevPos);

		// Previous code unit is not a high surrogate (D800–DBFF).
		if (prevCode < 0xD800 || prevCode > 0xDBFF) {
			throw new Error('low surrogate without leading high surrogate');
		}

		return {
			char  : str.charAt(prevPos) + str.charAt(pos),
			start : prevPos,
			end   : pos
		};
	}


	/*******************************************************************************
		`Array` Extensions.
	*******************************************************************************/

	/*
		Concatenates one or more unique elements to the end of the base array
		and returns the result as a new array.  Elements which are arrays will
		be merged—i.e. their elements will be concatenated, rather than the
		array itself.
	*/
	Object.defineProperty(Array.prototype, 'concatUnique', {
		configurable : true,
		writable     : true,

		value(/* variadic */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.concatUnique called on null or undefined');
			}

			const result = Array.from(this);

			if (arguments.length === 0) {
				return result;
			}

			const items   = Array.prototype.reduce.call(arguments, (prev, cur) => prev.concat(cur), []);
			const addSize = items.length;

			if (addSize === 0) {
				return result;
			}

			const indexOf = Array.prototype.indexOf;
			const push    = Array.prototype.push;

			for (let i = 0; i < addSize; ++i) {
				const value = items[i];

				if (indexOf.call(result, value) === -1) {
					push.call(result, value);
				}
			}

			return result;
		}
	});

	/*
		Returns the number of times the given element was found within the array.
	*/
	Object.defineProperty(Array.prototype, 'count', {
		configurable : true,
		writable     : true,

		value(/* needle [, fromIndex ] */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.count called on null or undefined');
			}

			const indexOf = Array.prototype.indexOf;
			const needle  = arguments[0];
			let pos   = Number(arguments[1]) || 0;
			let count = 0;

			while ((pos = indexOf.call(this, needle, pos)) !== -1) {
				++count;
				++pos;
			}

			return count;
		}
	});

	/*
		Removes and returns all of the given elements from the array.
	*/
	Object.defineProperty(Array.prototype, 'delete', {
		configurable : true,
		writable     : true,

		value(/* needles */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.delete called on null or undefined');
			}

			if (arguments.length === 0) {
				return [];
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return [];
			}

			const needles       = Array.prototype.concat.apply([], arguments);
			const needlesLength = needles.length;
			const indices       = [];

			for (let i = 0; i < length; ++i) {
				const value = this[i];

				for (let j = 0; j < needlesLength; ++j) {
					const needle = needles[j];

					if (value === needle || value !== value && needle !== needle) {
						indices.push(i);
						break;
					}
				}
			}

			const result = [];

			// Copy the elements (in original order).
			for (let i = 0, iend = indices.length; i < iend; ++i) {
				result[i] = this[indices[i]];
			}

			const splice = Array.prototype.splice;

			// Delete the elements (in reverse order).
			for (let i = indices.length - 1; i >= 0; --i) {
				splice.call(this, indices[i], 1);
			}

			return result;
		}
	});

	/*
		Removes and returns all of the elements at the given indices from the array.
	*/
	Object.defineProperty(Array.prototype, 'deleteAt', {
		configurable : true,
		writable     : true,

		value(/* indices */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.deleteAt called on null or undefined');
			}

			if (arguments.length === 0) {
				return [];
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return [];
			}

			const splice     = Array.prototype.splice;
			const cpyIndices = [
				...new Set(
					Array.prototype.concat.apply([], arguments)
						// Map negative indices to their positive counterparts,
						// so the Set can properly filter out duplicates.
						.map(x => x < 0 ? Math.max(0, length + x) : x)
				).values()
			];
			const delIndices = Array.from(cpyIndices).sort((a, b) => b - a);
			const result     = [];

			// Copy the elements (in originally specified order).
			for (let i = 0, iend = cpyIndices.length; i < iend; ++i) {
				result[i] = this[cpyIndices[i]];
			}

			// Delete the elements (in descending numeric order).
			for (let i = 0, iend = delIndices.length; i < iend; ++i) {
				splice.call(this, delIndices[i], 1);
			}

			return result;
		}
	});

	/*
		Removes and returns all of the elements that pass the test implemented
		by the given predicate function from the array.
	*/
	Object.defineProperty(Array.prototype, 'deleteWith', {
		configurable : true,
		writable     : true,

		value(predicate, thisArg) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.deleteWith called on null or undefined');
			}
			if (typeof predicate !== 'function') {
				throw new Error('Array.prototype.deleteWith predicate parameter must be a function');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return [];
			}

			const splice  = Array.prototype.splice;
			const indices = [];
			const result  = [];

			// Copy the elements (in original order).
			for (let i = 0; i < length; ++i) {
				if (predicate.call(thisArg, this[i], i, this)) {
					result.push(this[i]);
					indices.push(i);
				}
			}

			// Delete the elements (in reverse order).
			for (let i = indices.length - 1; i >= 0; --i) {
				splice.call(this, indices[i], 1);
			}

			return result;
		}
	});

	/*
		Returns the first element from the array.
	*/
	Object.defineProperty(Array.prototype, 'first', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.first called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return;
			}

			return this[0];
		}
	});

	/*
		Returns whether all of the given elements were found within the array.
	*/
	Object.defineProperty(Array.prototype, 'includesAll', {
		configurable : true,
		writable     : true,

		value(/* needles */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.includesAll called on null or undefined');
			}

			if (arguments.length === 1) {
				if (arguments[0] instanceof Array) {
					return Array.prototype.includesAll.apply(this, arguments[0]);
				}

				return Array.prototype.includes.apply(this, arguments);
			}

			for (let i = 0, iend = arguments.length; i < iend; ++i) {
				if (
					!Array.prototype.some.call(this, function (val) {
						return val === this.val || val !== val && this.val !== this.val;
					}, { val : arguments[i] })
				) {
					return false;
				}
			}

			return true;
		}
	});

	/*
		Returns whether any of the given elements were found within the array.
	*/
	Object.defineProperty(Array.prototype, 'includesAny', {
		configurable : true,
		writable     : true,

		value(/* needles */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.includesAny called on null or undefined');
			}

			if (arguments.length === 1) {
				if (arguments[0] instanceof Array) {
					return Array.prototype.includesAny.apply(this, arguments[0]);
				}

				return Array.prototype.includes.apply(this, arguments);
			}

			for (let i = 0, iend = arguments.length; i < iend; ++i) {
				if (
					Array.prototype.some.call(this, function (val) {
						return val === this.val || val !== val && this.val !== this.val;
					}, { val : arguments[i] })
				) {
					return true;
				}
			}

			return false;
		}
	});

	/*
		Returns the last element from the array.
	*/
	Object.defineProperty(Array.prototype, 'last', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.last called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return;
			}

			return this[length - 1];
		}
	});

	/*
		Randomly removes an element from the base array and returns it.
	*/
	Object.defineProperty(Array.prototype, 'pluck', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.pluck called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return;
			}

			const index = _random(0, length - 1);

			return Array.prototype.splice.call(this, index, 1)[0];
		}
	});

	/*
		Randomly removes the given number of unique elements from the base array
		and returns the removed elements as a new array.
	*/
	Object.defineProperty(Array.prototype, 'pluckMany', {
		configurable : true,
		writable     : true,

		value(wantSize) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.pluckMany called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return [];
			}

			let want = Math.trunc(wantSize);

			if (!Number.isInteger(want)) {
				throw new Error('Array.prototype.pluckMany want parameter must be an integer');
			}

			if (want < 1) {
				return [];
			}

			if (want > length) {
				want = length;
			}

			const splice = Array.prototype.splice;
			const result = [];
			let max = length - 1;

			do {
				result.push(splice.call(this, _random(0, max--), 1)[0]);
			} while (result.length < want);

			return result;
		}
	});

	/*
		Appends one or more unique elements to the end of the base array and
		returns its new length.
	*/
	Object.defineProperty(Array.prototype, 'pushUnique', {
		configurable : true,
		writable     : true,

		value(/* variadic */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.pushUnique called on null or undefined');
			}

			const addSize = arguments.length;

			if (addSize === 0) {
				return this.length >>> 0;
			}

			const indexOf = Array.prototype.indexOf;
			const push    = Array.prototype.push;

			for (let i = 0; i < addSize; ++i) {
				const value = arguments[i];

				if (indexOf.call(this, value) === -1) {
					push.call(this, value);
				}
			}

			return this.length >>> 0;
		}
	});

	/*
		Randomly selects an element from the base array and returns it.
	*/
	Object.defineProperty(Array.prototype, 'random', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.random called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return;
			}

			const index = _random(0, length - 1);

			return this[index];
		}
	});

	/*
		Randomly selects the given number of unique elements from the base array
		and returns the selected elements as a new array.
	*/
	Object.defineProperty(Array.prototype, 'randomMany', {
		configurable : true,
		writable     : true,

		value(wantSize) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.randomMany called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return [];
			}

			let want = Math.trunc(wantSize);

			if (!Number.isInteger(want)) {
				throw new Error('Array.prototype.randomMany want parameter must be an integer');
			}

			if (want < 1) {
				return [];
			}

			if (want > length) {
				want = length;
			}

			const picked = new Set();
			const result = [];
			const max    = length - 1;

			do {
				let i;
				do {
					i = _random(0, max);
				} while (picked.has(i));
				picked.add(i);
				result.push(this[i]);
			} while (result.length < want);

			return result;
		}
	});

	/*
		Randomly shuffles the array and returns it.
	*/
	Object.defineProperty(Array.prototype, 'shuffle', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.shuffle called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return this;
			}

			for (let i = length - 1; i > 0; --i) {
				const j = Math.floor(_nativeMathRandom() * (i + 1));

				if (i === j) {
					continue;
				}

				// [this[i], this[j]] = [this[j], this[i]];
				const swap = this[i];
				this[i] = this[j];
				this[j] = swap;
			}

			return this;
		}
	});

	/*
		Prepends one or more unique elements to the beginning of the base array
		and returns its new length.
	*/
	Object.defineProperty(Array.prototype, 'unshiftUnique', {
		configurable : true,
		writable     : true,

		value(/* variadic */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Array.prototype.unshiftUnique called on null or undefined');
			}

			const addSize = arguments.length;

			if (addSize === 0) {
				return this.length >>> 0;
			}

			const indexOf = Array.prototype.indexOf;
			const unshift = Array.prototype.unshift;

			for (let i = 0; i < addSize; ++i) {
				const value = arguments[i];

				if (indexOf.call(this, value) === -1) {
					unshift.call(this, value);
				}
			}

			return this.length >>> 0;
		}
	});


	/*******************************************************************************
		`Function` Extensions.
	*******************************************************************************/

	/*
		Returns a bound function that supplies the given arguments to the base
		function, followed by the arguments are supplied to the bound function,
		whenever it is called.
	*/
	Object.defineProperty(Function.prototype, 'partial', {
		configurable : true,
		writable     : true,

		value(/* variadic */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Function.prototype.partial called on null or undefined');
			}

			const slice = Array.prototype.slice;
			const fn    = this;
			const bound = slice.call(arguments, 0);

			return function () {
				const applied = [];
				let argc = 0;

				for (let i = 0; i < bound.length; ++i) {
					applied.push(bound[i] === undefined ? arguments[argc++] : bound[i]);
				}

				return fn.apply(this, applied.concat(slice.call(arguments, argc)));
			};
		}
	});


	/*******************************************************************************
		`Math` Extensions.
	*******************************************************************************/

	/*
		Returns the given numerical clamped to the specified bounds.
	*/
	Object.defineProperty(Math, 'clamp', {
		configurable : true,
		writable     : true,

		value(num, min, max) {
			const value = Number(num);
			return Number.isNaN(value) ? NaN : value.clamp(min, max);
		}
	});

	/*
		Returns a decimal number eased from 0 to 1.

		NOTE: The magnitude of the returned value decreases if num < 0.5 or increases if num > 0.5.
	*/
	Object.defineProperty(Math, 'easeInOut', {
		configurable : true,
		writable     : true,

		value(num) {
			return 1 - (Math.cos(Number(num) * Math.PI) + 1) / 2;
		}
	});


	/*******************************************************************************
		`Number` Extensions.
	*******************************************************************************/

	/*
		Returns the number clamped to the specified bounds.
	*/
	Object.defineProperty(Number.prototype, 'clamp', {
		configurable : true,
		writable     : true,

		value(/* min, max */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('Number.prototype.clamp called on null or undefined');
			}

			if (arguments.length !== 2) {
				throw new Error('Number.prototype.clamp called with an incorrect number of parameters');
			}

			let min = Number(arguments[0]);
			let max = Number(arguments[1]);

			if (min > max) {
				[min, max] = [max, min];
			}

			return Math.min(Math.max(this, min), max);
		}
	});


	/*******************************************************************************
		`RegExp` Extensions.
	*******************************************************************************/

	/*
		Returns a copy of the given string with all RegExp metacharacters escaped.
	*/
	if (!RegExp.escape) {
		(() => {
			const _regExpMetaCharsRE    = /[\\^$*+?.()|[\]{}]/g;
			const _hasRegExpMetaCharsRE = new RegExp(_regExpMetaCharsRE.source); // to drop the global flag

			Object.defineProperty(RegExp, 'escape', {
				configurable : true,
				writable     : true,

				value(str) {
					const val = String(str);
					return val && _hasRegExpMetaCharsRE.test(val)
						? val.replace(_regExpMetaCharsRE, '\\$&')
						: val;
				}
			});
		})();
	}


	/*******************************************************************************
		`String` Extensions.
	*******************************************************************************/

	/*
		Returns a formatted string, after replacing each format item in the given
		format string with the text equivalent of the corresponding argument's value.

		QUESTION: With template strings available, is this even still useful?
	*/
	(() => {
		const _formatItemRE    = /\{\{|\}\}|\{(\d+)(?:,([+-]?\d+))?(?::([0-9A-Za-z]+))?\}/g;
		const _hasFormatItemRE = new RegExp(_formatItemRE.source); // to drop the global flag
		const _formatValue     = (format, value) => {
			if (!format) {
				return stringFrom(value);
			}

			// TODO: Make this actually do something with `format`.

			return stringFrom(value);
		};
		const _padString = (str, align, pad) => {
			if (!align) {
				return str;
			}

			const plen = Math.abs(align) - str.length;

			if (plen < 1) {
				return str;
			}

			const padding = String(pad).repeat(plen);
			return align < 0 ? str + padding : padding + str;
		};

		Object.defineProperty(String, 'format', {
			configurable : true,
			writable     : true,

			value(formatString, ...params) {
				if (!_hasFormatItemRE.test(formatString)) {
					return formatString ?? '';
				}

				const replacements = [...params[0] instanceof Array ? params[0] : params];

				if (replacements.length === 0) {
					return formatString ?? '';
				}

				return formatString.replace(_formatItemRE, (match, index, align, format) => {
					switch (match) {
						case '{{': return '{';
						case '}}': return '}';
					}

					let value = replacements[index];

					while (typeof value === 'function') {
						value = value();
					}

					return _padString(
						_formatValue(format, value),
						!align ? 0 : Number.parseInt(align, 10), ' '
					);
				});
			}
		});
	})();

	/*
		Various template string tag functions.
	*/
	(() => {
		function assembleTemplate(parts, ...values) {
			return parts.reduce((string, part, i) => `${string}${stringFrom(values[i - 1])}${part}`);
		}

		const endingWsRE     = /\s+$/;
		const indentsRE      = /^([ \t])*/gm;
		const runsOfWsRE     = /\s+/g;
		const startingCrLfRE = /^[\r\n]+/;
		const startingWsRE   = /^\s+/;

		/*
			Remove linebreaks and extra spacing in a template string.
		*/
		Object.defineProperty(String, 'oneline', {
			configurable : true,
			writable     : true,

			value(parts, ...values) {
				return assembleTemplate(parts, ...values)
					.replace(startingWsRE, '')
					.replace(endingWsRE, '')
					.replace(runsOfWsRE, ' ');
			}
		});

		/*
			Outdent all lines by the smallest indention level, and remove starting CR/LFs
			and all trailing whitespace.

			NOTE: This tag function, rightly, assumes that all encountered indention is
			sane—i.e., either all tabs or all spaces, not a mix.
		*/
		Object.defineProperty(String, 'outdent', {
			configurable : true,
			writable     : true,

			value(parts, ...values) {
				const string = assembleTemplate(parts, ...values)
					.replace(startingCrLfRE, '')
					.replace(endingWsRE, '');

				const indents = string.match(indentsRE);

				if (indents === null || indents.length === 0) {
					return string;
				}

				const shortest = indents.reduce((a, b) => a.length < b.length ? a : b);

				if (shortest.length === 0) {
					return string;
				}

				return string.replace(new RegExp(`^${shortest}`, 'gm'), '');
			}
		});
	})();

	/*
		Returns the number of times the given substring was found within the string.
	*/
	Object.defineProperty(String.prototype, 'count', {
		configurable : true,
		writable     : true,

		value(/* needle [, fromIndex ] */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.count called on null or undefined');
			}

			const needle = String(arguments[0] || '');

			if (needle === '') {
				return 0;
			}

			const indexOf = String.prototype.indexOf;
			const step    = needle.length;
			let pos     = Number(arguments[1]) || 0;
			let count   = 0;

			while ((pos = indexOf.call(this, needle, pos)) !== -1) {
				++count;
				pos += step;
			}

			return count;
		}
	});

	/*
		Returns the first Unicode code point from the string.
	*/
	Object.defineProperty(String.prototype, 'first', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.first called on null or undefined');
			}

			// Required as `this` could be a `String` object or come from a `call()` or `apply()`.
			const str = String(this);

			// Get the first code point—may be one or two code units—and its end position.
			const { char } = _getCodePointStartAndEnd(str, 0);

			return char;
		}
	});

	/*
		Returns the last Unicode code point from the string.
	*/
	Object.defineProperty(String.prototype, 'last', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.last called on null or undefined');
			}

			// Required as `this` could be a `String` object or come from a `call()` or `apply()`.
			const str = String(this);

			// Get the last code point—may be one or two code units—and its end position.
			const { char } = _getCodePointStartAndEnd(str, str.length - 1);

			return char;
		}
	});

	/*
		Returns a copy of the base string with `delCount` characters replaced with
		`replacement`, starting at `startAt`.

		TODO: This has never been public, so consider making it a utility function instead.
	*/
	Object.defineProperty(String.prototype, 'splice', {
		configurable : true,
		writable     : true,

		value(startAt, delCount, replacement) {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.splice called on null or undefined');
			}

			const length = this.length >>> 0;

			if (length === 0) {
				return '';
			}

			let start = Number(startAt);

			if (!Number.isSafeInteger(start)) {
				start = 0;
			}
			else if (start < 0) {
				start += length;

				if (start < 0) {
					start = 0;
				}
			}

			if (start > length) {
				start = length;
			}

			let count = Number(delCount);

			if (!Number.isSafeInteger(count) || count < 0) {
				count = 0;
			}

			let result = this.slice(0, start);

			if (typeof replacement !== 'undefined') {
				result += replacement;
			}

			if (start + count < length) {
				result += this.slice(start + count);
			}

			return result;
		}
	});

	/*
		Returns an array of strings, split from the string, or an empty array if the
		string is empty.

		TODO: This has never been public, so consider making it a utility function instead.
	*/
	Object.defineProperty(String.prototype, 'splitOrEmpty', {
		configurable : true,
		writable     : true,

		value(/* [ separator [, limit ]] */) {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.splitOrEmpty called on null or undefined');
			}

			// Required as `this` could be a `String` object or come from a `call()` or `apply()`.
			if (String(this) === '') {
				return [];
			}

			return String.prototype.split.apply(this, arguments);
		}
	});

	/*
		Returns a copy of the base string with the first Unicode code point uppercased,
		according to any locale-specific rules.
	*/
	Object.defineProperty(String.prototype, 'toLocaleUpperFirst', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.toLocaleUpperFirst called on null or undefined');
			}

			// Required as `this` could be a `String` object or come from a `call()` or `apply()`.
			const str = String(this);

			// Get the first code point—may be one or two code units—and its end position.
			const { char, end } = _getCodePointStartAndEnd(str, 0);

			return end === -1 ? '' : char.toLocaleUpperCase() + str.slice(end + 1);
		}
	});

	/*
		Returns a copy of the base string with the first Unicode code point uppercased.
	*/
	Object.defineProperty(String.prototype, 'toUpperFirst', {
		configurable : true,
		writable     : true,

		value() {
			if (this == null) { // lazy equality for null
				throw new TypeError('String.prototype.toUpperFirst called on null or undefined');
			}

			// Required as `this` could be a `String` object or come from a `call()` or `apply()`.
			const str = String(this);

			// Get the first code point—may be one or two code units—and its end position.
			const { char, end } = _getCodePointStartAndEnd(str, 0);

			return end === -1 ? '' : char.toUpperCase() + str.slice(end + 1);
		}
	});
})();
