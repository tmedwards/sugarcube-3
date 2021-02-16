/***********************************************************************************************************************

	macros/macrolib/radiobutton.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Macro from '../macro';
import State from '~/state';
import Wikifier from '~/markup/wikifier';
import createSlug from '~/utils/createslug';


/*
	<<radiobutton>>
*/
Macro.add('radiobutton', {
	isAsync : true,

	handler() {
		if (this.args.length < 2) {
			const errors = [];
			if (this.args.length < 1) { errors.push('variable name'); }
			if (this.args.length < 2) { errors.push('checked value'); }
			return this.error(`no ${errors.join(' or ')} specified`);
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

		const varId      = createSlug(varName);
		const checkValue = this.args[1];
		const el         = document.createElement('input');

		// Set up and initialize the group counter.
		if (!Wikifier.temporary.hasOwnProperty(this.name)) {
			Wikifier.temporary[this.name] = {};
		}

		if (!Wikifier.temporary[this.name].hasOwnProperty(varId)) {
			Wikifier.temporary[this.name][varId] = 0;
		}

		// Set up and append the input element to the output buffer.
		jQuery(el)
			.attr({
				id       : `${this.name}-${varId}-${Wikifier.temporary[this.name][varId]++}`,
				name     : `${this.name}-${varId}`,
				type     : 'radio',
				tabindex : 0 // for accessiblity
			})
			.addClass(`macro-${this.name}`)
			.on('change.macros', this.createShadowWrapper(function () {
				if (this.checked) {
					State.setVar(varName, checkValue);
				}
			}))
			.appendTo(this.output);

		// Set the variable to the checked value and the input element to checked, if requested.
		switch (this.args[2]) {
			case 'autocheck':
				if (State.getVar(varName) === checkValue) {
					el.checked = true;
				}
				break;
			case 'checked':
				el.checked = true;
				State.setVar(varName, checkValue);
				break;
		}
	}
});
