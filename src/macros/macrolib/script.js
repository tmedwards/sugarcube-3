/***********************************************************************************************************************

	macros/macrolib/script.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import Macro from '../macro';
import Scripting from '~/markup/scripting';


/*
	<<script>>
*/
Macro.add('script', {
	skipArgs : true,
	tags     : [],

	handler() {
		const output = document.createDocumentFragment();

		try {
			Scripting.evalJavaScript(this.payload[0].contents, output);
		}
		catch (ex) {
			return this.error(`bad evaluation: ${typeof ex === 'object' ? ex.message : ex}`);
		}

		// Custom debug view setup.
		if (Config.debug) {
			this.createDebugView();
		}

		if (output.hasChildNodes()) {
			this.output.appendChild(output);
		}
	}
});
