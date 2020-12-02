/***********************************************************************************************************************

	macros/macrolib/append-prepend-replace.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import { MIN_DOM_ACTION_DELAY } from './constants';
import Macro from './macros/macro';


/*
	<<append>>, <<prepend>>, & <<replace>>
*/
Macro.add(['append', 'prepend', 'replace'], {
	tags  : [],
	t8nRE : /^(?:transition|t8n)$/,

	handler() {
		if (this.args.length === 0) {
			return this.error('no selector specified');
		}

		const $targets = jQuery(this.args[0]);

		if ($targets.length === 0) {
			return this.error(`no elements matched the selector "${this.args[0]}"`);
		}

		if (this.payload[0].contents !== '') {
			const transition = this.args.length > 1 && this.self.t8nRE.test(this.args[1]);
			let $insert;

			if (transition) {
				$insert = jQuery(document.createElement('span'));
				$insert.addClass(`macro-${this.name}-insert macro-${this.name}-in`);
				setTimeout(() => $insert.removeClass(`macro-${this.name}-in`), MIN_DOM_ACTION_DELAY);
			}
			else {
				$insert = jQuery(document.createDocumentFragment());
			}

			$insert.wiki(this.payload[0].contents);

			switch (this.name) {
				case 'replace':
					$targets.empty();
					/* falls through */

				case 'append':
					$targets.append($insert);
					break;

				case 'prepend':
					$targets.prepend($insert);
					break;
			}
		}
		else if (this.name === 'replace') {
			$targets.empty();
		}

		// Custom debug view setup.
		if (Config.debug) {
			this.debugView.modes({ hidden : true });
		}
	}
});
