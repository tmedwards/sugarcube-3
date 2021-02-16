/***********************************************************************************************************************

	macros/macrolib/cycle-listbox-option-optionsfrom.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Macro from '../macro';
import Scripting from '~/markup/scripting';
import State from '~/state';
import createSlug from '~/utils/createslug';
import getToStringTag from '~/utils/gettostringtag';
import sameValueZero from '~/utils/samevaluezero';


/*
	<<cycle>>, <<listbox>>, <<option>>, & <<optionsfrom>>
*/
Macro.add(['cycle', 'listbox'], {
	isAsync  : true,
	skipArgs : ['optionsfrom'],
	tags     : ['option', 'optionsfrom'],

	handler() {
		if (this.args.length === 0) {
			return this.error('no variable name specified');
		}

		// Ensure that the variable name argument is a string.
		if (typeof this.args[0] !== 'string') {
			return this.error('variable name argument is not a string');
		}

		const varName = this.args[0].trim();

		// Try to ensure that we receive the variable's name (incl. sigil), not its value.
		if (varName[0] !== '$' && varName[0] !== '_') {
			return this.error(`variable name "${this.args[0]}" is missing its sigil ($ or _)`);
		}

		const varId = createSlug(varName);
		const len   = this.payload.length;

		if (len === 1) {
			return this.error('no options specified');
		}

		const autoselect = this.args.length > 1 && this.args[1] === 'autoselect';
		const options    = [];
		const tagCount   = { option : 0, optionsfrom : 0 };
		let selectedIdx = -1;

		// Get the options and selected index, if any.
		for (let i = 1; i < len; ++i) {
			const payload = this.payload[i];

			// <<option label value [selected]>>
			if (payload.name === 'option') {
				++tagCount.option;

				if (payload.args.length === 0) {
					return this.error(`no arguments specified for <<${payload.name}>> (#${tagCount.option})`);
				}

				options.push({
					label : String(payload.args[0]),
					value : payload.args.length === 1 ? payload.args[0] : payload.args[1]
				});

				if (payload.args.length > 2 && payload.args[2] === 'selected') {
					if (autoselect) {
						return this.error('cannot specify both the autoselect and selected keywords');
					}
					else if (selectedIdx !== -1) {
						return this.error(`multiple selected keywords specified for <<${payload.name}>> (#${selectedIdx + 1} & #${tagCount.option})`);
					}

					selectedIdx = options.length - 1;
				}
			}

			// <<optionsfrom expression>>
			else {
				++tagCount.optionsfrom;

				if (payload.args.full.length === 0) {
					return this.error(`no expression specified for <<${payload.name}>> (#${tagCount.optionsfrom})`);
				}

				let result;

				try {
					// NOTE: If the first character is the left curly brace, then we
					// assume that it's part of an object literal and wrap it within
					// parenthesis to ensure that it is not mistaken for a block
					// during evaluation—which would cause an error.
					const exp = payload.args.full;
					result = Scripting.evalJavaScript(exp[0] === '{' ? `(${exp})` : exp);
				}
				catch (ex) {
					return this.error(`bad evaluation: ${typeof ex === 'object' ? ex.message : ex}`);
				}

				if (typeof result !== 'object' || result === null) {
					return this.error(`expression must yield a supported collection or generic object (type: ${result === null ? 'null' : typeof result})`);
				}

				if (result instanceof Array || result instanceof Set) {
					result.forEach(val => options.push({ label : String(val), value : val }));
				}
				else if (result instanceof Map) {
					result.forEach((val, key) => options.push({ label : String(key), value : val }));
				}
				else {
					const oType = getToStringTag(result);

					if (oType !== 'Object') {
						return this.error(`expression must yield a supported collection or generic object (object type: ${oType})`);
					}

					Object.keys(result).forEach(key => options.push({ label : key, value : result[key] }));
				}
			}
		}

		// No options were selected by the user, so we must select one.
		if (selectedIdx === -1) {
			// Attempt to automatically select an option by matching the variable's current value.
			if (autoselect) {
				// NOTE: This will usually fail for objects due to a variety of reasons.
				const curValue      = State.getVar(varName);
				const curValueIdx   = options.findIndex(opt => sameValueZero(opt.value, curValue));
				selectedIdx = curValueIdx === -1 ? 0 : curValueIdx;
			}

			// Simply select the first option.
			else {
				selectedIdx = 0;
			}
		}

		// Set up and append the appropriate element to the output buffer.
		if (this.name === 'cycle') {
			let cycleIdx = selectedIdx;
			jQuery(document.createElement('a'))
				.wikiWithOptions({ profile : 'core' }, options[selectedIdx].label)
				.attr('id', `${this.name}-${varId}`)
				.addClass(`macro-${this.name}`)
				.ariaClick({ namespace : '.macros' }, this.createShadowWrapper(function () {
					cycleIdx = (cycleIdx + 1) % options.length;
					$(this).empty().wikiWithOptions({ profile : 'core' }, options[cycleIdx].label);
					State.setVar(varName, options[cycleIdx].value);
				}))
				.appendTo(this.output);
		}
		else { // this.name === 'listbox'
			const $select = jQuery(document.createElement('select'));

			options.forEach((opt, i) => {
				jQuery(document.createElement('option'))
					.val(i)
					.text(opt.label)
					.appendTo($select);
			});

			$select
				.attr({
					id       : `${this.name}-${varId}`,
					name     : `${this.name}-${varId}`,
					tabindex : 0 // for accessiblity
				})
				.addClass(`macro-${this.name}`)
				.val(selectedIdx)
				.on('change.macros', this.createShadowWrapper(function () {
					State.setVar(varName, options[Number(this.value)].value);
				}))
				.appendTo(this.output);
		}

		// Set the variable to the appropriate value, as requested.
		State.setVar(varName, options[selectedIdx].value);
	}
});
