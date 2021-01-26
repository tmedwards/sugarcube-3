/***********************************************************************************************************************

	macros/macrolib/print-=--.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Macro from './macros/macro';
import Scripting from './markup/scripting';
import Wikifier from './markup/wikifier';
import encodeEntities from './utils/encodeentities';
import stringFrom from './utils/stringfrom';


/*
	<<print>>, <<=>>, & <<->>
*/
Macro.add(['print', '=', '-'], {
	skipArgs : true,

	handler() {
		if (this.args.full.length === 0) {
			return this.error('no expression specified');
		}

		try {
			const result = stringFrom(Scripting.evalJavaScript(this.args.full));
			new Wikifier(this.output, this.name === '-' ? encodeEntities(result) : result);
		}
		catch (ex) {
			return this.error(`bad evaluation: ${typeof ex === 'object' ? ex.message : ex}`);
		}
	}
});
