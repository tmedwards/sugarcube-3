/***********************************************************************************************************************

	macros/macrolib/goto.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Engine from './engine';
import Macro from './macros/macro';
import Story from './story';
import Wikifier from './markup/wikifier';


/*
	<<goto>>
*/
Macro.add('goto', {
	handler() {
		if (this.args.length === 0) {
			return this.error('no passage specified');
		}

		let passage;

		if (typeof this.args[0] === 'object') {
			// Argument was in wiki link syntax.
			passage = this.args[0].link;
		}
		else {
			// Argument was simply the passage name.
			passage = this.args[0];
		}

		if (!Story.has(passage)) {
			return this.error(`passage "${passage}" does not exist`);
		}

		// Set the Wikifier's temporary state `exit` property to a function
		// that asynchronously calls `Engine.play()`.
		//
		// NOTE: This does terminate the current Wikifier call chain.
		Wikifier.temporary.exit = () => setTimeout(() => Engine.play(passage), 0);
	}
});
