/***********************************************************************************************************************

	macros/macrolib/nobr.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Macro from './macros/macro';
import Wikifier from './markup/wikifier';
import stripNewlines from './utils/stripnewlines';


/*
	<<nobr>>
*/
Macro.add('nobr', {
	skipArgs : true,
	tags     : [],

	handler() {
		new Wikifier(this.output, stripNewlines(this.payload[0].contents));
	}
});
