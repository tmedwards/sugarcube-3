/***********************************************************************************************************************

	macros/macrolib/run-set.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Macro from './macros/macro';
import Scripting from './markup/scripting';


/*
	<<run>> & <<set>>
*/
Macro.add(['run', 'set'], {
	skipArgs : true,

	handler() {
		if (this.args.full.length === 0) {
			return this.error('no expression specified');
		}

		try {
			Scripting.evalJavaScript(this.args.full);
		}
		catch (ex) {
			return this.error(`bad evaluation: ${typeof ex === 'object' ? ex.message : ex}`);
		}

		// Custom debug view setup.
		if (Config.debug) {
			this.debugView.modes({ hidden : true });
		}
	}
});
