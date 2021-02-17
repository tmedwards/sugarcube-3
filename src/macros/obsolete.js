/***********************************************************************************************************************

	macros/obsolete.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Macro from '~/macros/macro';


/*
	Set up obsolete void macro error stubs.

	<<display>>, <<forget>>, <<remember>>, <<setplaylist>>, <<stopallaudio>>
*/
Macro.add(['display', 'forget', 'remember', 'setplaylist', 'stopallaudio'], {
	skipArgs : true,

	handler() {
		let what;

		switch (this.name) {
			case 'display':      what = '<<include>>'; break;
			case 'forget':       what = 'the forget() function'; break;
			case 'remember':     what = 'the memorize() and recall() functions'; break;
			case 'setplaylist':  what = '<<createplaylist>>'; break;
			case 'stopallaudio': what = '<<audio ":all" stop>> or <<masteraudio stop>>'; break;
			default:             throw new Error('unknown macro');
		}

		return this.error(`this macro has been replaced by ${what}`);
	}
});

/*
	Set up obsolete nonvoid macro error stubs.

	<<click>>
*/
Macro.add('click', {
	tags     : [],
	skipArgs : true,

	handler() {
		return this.error('this macro has been replaced by <<link>>');
	}
});
