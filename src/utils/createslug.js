/***********************************************************************************************************************

	utils/createslug.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a sanitized version of the passed string that should be safe for use as
	a DOM ID or class name.
*/
const createSlug = (() => {
	// The range of illegal characters consists of: C0 controls, space, exclamation,
	// double quote, number, dollar, percent, ampersand, single quote, left paren,
	// right paren, asterisk, plus, comma, hyphen, period, forward slash, colon,
	// semi-colon, less-than, equals, greater-than, question, at, left bracket,
	// backslash, right bracket, caret, backquote/grave, left brace, pipe/vertical
	// line, right brace, tilde, delete, C1 controls.
	const illegalCharsRe = /[\x00-\x20!-/:-@[-^`{-\x9f]+/g; // eslint-disable-line no-control-regex

	// Special cases for story and temporary variables.
	const storySigilRe = /^\$/;
	const tempSigilRe  = /^_/;

	function createSlug(str) {
		return String(str).trim()
			.replace(storySigilRe, '')
			.replace(tempSigilRe, '-')
			.replace(illegalCharsRe, '-');
	}

	return createSlug;
})();


/*
	Module Exports.
*/
export default createSlug;
