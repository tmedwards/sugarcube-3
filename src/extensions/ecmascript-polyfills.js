/***********************************************************************************************************************

	extensions/ecmascript-polyfills.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Patterns from './lib/patterns';


/*
	ECMAScript Polyfills.

	TODO: (?) Replace the following polyfills with imports from the core-js library.
		SEE: https://www.npmjs.com/package/core-js
*/
(() => {
	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	/*
		Trims whitespace from either the start or end of the given string.
	*/
	const _trimString = (() => {
		// Whitespace regular expressions.
		const startWSRE = new RegExp(`^${Patterns.space}${Patterns.space}*`);
		const endWSRE   = new RegExp(`${Patterns.space}${Patterns.space}*$`);

		function trimString(str, where) {
			const val = String(str);

			if (!val) {
				return val;
			}

			switch (where) {
				case 'start':
					return startWSRE.test(val) ? val.replace(startWSRE, '') : val;

				case 'end':
					return endWSRE.test(val) ? val.replace(endWSRE, '') : val;

				default:
					throw new Error(`_trimString called with incorrect where parameter value: "${where}"`);
			}
		}

		return trimString;
	})();


	/*******************************************************************************
		`Array` Polyfills.
	*******************************************************************************/

	/*
		[ES2019] Returns a new array consisting of the source array with all sub-array elements
		concatenated into it recursively up to the given depth.
	*/
	if (!Array.prototype.flat) {
		Object.defineProperty(Array.prototype, 'flat', {
			configurable : true,
			writable     : true,
			value        : (() => {
				function flat(/* depth */) {
					if (this == null) { // lazy equality for null
						throw new TypeError('Array.prototype.flat called on null or undefined');
					}

					const depth = arguments.length === 0 ? 1 : Number(arguments[0]) || 0;

					if (depth < 1) {
						return Array.prototype.slice.call(this);
					}

					return Array.prototype.reduce.call(
						this,
						(acc, cur) => {
							if (cur instanceof Array) {
								// acc.push.apply(acc, flat.call(cur, depth - 1));
								acc.push(...flat.call(cur, depth - 1));
							}
							else {
								acc.push(cur);
							}

							return acc;
						},
						[]
					);
				}

				return flat;
			})()
		});
	}

	/*
		[ES2019] Returns a new array consisting of the result of calling the given mapping function
		on every element in the source array and then concatenating all sub-array elements into it
		recursively up to a depth of `1`.  Identical to calling `<Array>.map(fn).flat()`.
	*/
	if (!Array.prototype.flatMap) {
		Object.defineProperty(Array.prototype, 'flatMap', {
			configurable : true,
			writable     : true,

			value(/* callback [, thisArg] */) {
				if (this == null) { // lazy equality for null
					throw new TypeError('Array.prototype.flatMap called on null or undefined');
				}

				return Array.prototype.map.apply(this, arguments).flat();
			}
		});
	}


	/*******************************************************************************
		`Object` Polyfills.
	*******************************************************************************/

	/*
		[ES2019] Returns a new generic object consisting of the given list's key/value pairs.
	*/
	if (!Object.fromEntries) {
		Object.defineProperty(Object, 'fromEntries', {
			configurable : true,
			writable     : true,

			value(iter) {
				return Array.from(iter).reduce(
					(acc, pair) => {
						if (Object(pair) !== pair) {
							throw new TypeError('Object.fromEntries iterable parameter must yield objects');
						}

						if (pair[0] in acc) {
							Object.defineProperty(acc, pair[0], {
								configurable : true,
								enumerable   : true,
								writable     : true,
								value        : pair[1]
							});
						}
						else {
							acc[pair[0]] = pair[1]; // eslint-disable-line no-param-reassign
						}

						return acc;
					},
					{}
				);
			}
		});
	}


	/*******************************************************************************
		`String` Polyfills.
	*******************************************************************************/

	/*
		[ES2019] Returns a string with all whitespace removed from the start of the string.
	*/
	if (!String.prototype.trimStart) {
		Object.defineProperty(String.prototype, 'trimStart', {
			configurable : true,
			writable     : true,

			value() {
				if (this == null) { // lazy equality for null
					throw new TypeError('String.prototype.trimStart called on null or undefined');
				}

				return _trimString(this, 'start');
			}
		});
	}

	if (!String.prototype.trimLeft) {
		Object.defineProperty(String.prototype, 'trimLeft', {
			configurable : true,
			writable     : true,

			value() {
				if (this == null) { // lazy equality for null
					throw new TypeError('String.prototype.trimLeft called on null or undefined');
				}

				return _trimString(this, 'start');
			}
		});
	}

	/*
		[ES2019] Returns a string with all whitespace removed from the end of the string.
	*/
	if (!String.prototype.trimEnd) {
		Object.defineProperty(String.prototype, 'trimEnd', {
			configurable : true,
			writable     : true,

			value() {
				if (this == null) { // lazy equality for null
					throw new TypeError('String.prototype.trimEnd called on null or undefined');
				}

				return _trimString(this, 'end');
			}
		});
	}

	if (!String.prototype.trimRight) {
		Object.defineProperty(String.prototype, 'trimRight', {
			configurable : true,
			writable     : true,

			value() {
				if (this == null) { // lazy equality for null
					throw new TypeError('String.prototype.trimRight called on null or undefined');
				}

				return _trimString(this, 'end');
			}
		});
	}
})();
