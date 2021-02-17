/***********************************************************************************************************************

	macros/macrolib/widget.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import Macro from '~/macros/macro';
import State from '~/state';
import Wikifier from '~/markup/wikifier';


/*
	<<widget>>
*/
Macro.add('widget', {
	tags : [],

	handler() {
		if (this.args.length === 0) {
			return this.error('no widget name specified');
		}

		const widgetName = this.args[0];

		if (Macro.has(widgetName)) {
			if (!Macro.get(widgetName).isWidget) {
				return this.error(`cannot clobber existing macro "${widgetName}"`);
			}

			// Delete the existing widget.
			Macro.delete(widgetName);
		}

		try {
			Macro.add(widgetName, {
				isWidget : true,
				handler  : (function (contents) {
					return function () {
						let argsCache;

						try {
							// Cache the existing value of the `$args` variable, if necessary.
							if (State.variables.hasOwnProperty('args')) {
								argsCache = State.variables.args;
							}

							// Set up the widget `$args` variable and add a shadow.
							State.variables.args = Array.from(this.args);
							State.variables.args.raw = this.args.raw;
							State.variables.args.full = this.args.full;
							this.addShadow('$args');

							// Set up the error trapping variables.
							const resFrag = document.createDocumentFragment();
							const errList = [];

							// Wikify the widget contents.
							new Wikifier(resFrag, contents);

							// Carry over the output, unless there were errors.
							Array.from(resFrag.querySelectorAll('.error')).forEach(errEl => {
								errList.push(errEl.textContent);
							});

							if (errList.length === 0) {
								this.output.appendChild(resFrag);
							}
							else {
								return this.error(`error${errList.length > 1 ? 's' : ''} within widget contents (${errList.join('; ')})`);
							}
						}
						catch (ex) {
							return this.error(`cannot execute widget: ${ex.message}`);
						}
						finally {
							// Revert the `$args` variable shadowing.
							if (typeof argsCache !== 'undefined') {
								State.variables.args = argsCache;
							}
							else {
								delete State.variables.args;
							}
						}
					};
				})(this.payload[0].contents)
			});

			// Custom debug view setup.
			if (Config.debug) {
				this.debugView.modes({ hidden : true });
			}
		}
		catch (ex) {
			return this.error(`cannot create widget macro "${widgetName}": ${ex.message}`);
		}
	}
});
