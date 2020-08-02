/***********************************************************************************************************************

	macros/macrolib.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import './macros/macrolib/actions';
import './macros/macrolib/addclass-toggleclass';
import './macros/macrolib/append-prepend-replace';
import './macros/macrolib/audio-api-macros';
import './macros/macrolib/back-return';
import './macros/macrolib/button-link';
import './macros/macrolib/capture';
import './macros/macrolib/checkbox';
import './macros/macrolib/choice';
import './macros/macrolib/copy';
import './macros/macrolib/cycle-listbox-option-optionsfrom';
import './macros/macrolib/for-break-continue';
import './macros/macrolib/goto';
import './macros/macrolib/if-elseif-else';
import './macros/macrolib/include';
import './macros/macrolib/linkappend-linkprepend-linkreplace';
import './macros/macrolib/nobr';
import './macros/macrolib/numberbox-textbox';
import './macros/macrolib/print-=--';
import './macros/macrolib/radiobutton';
import './macros/macrolib/remove';
import './macros/macrolib/removeclass';
import './macros/macrolib/repeat-stop';
import './macros/macrolib/run-set';
import './macros/macrolib/script';
import './macros/macrolib/silently';
import './macros/macrolib/switch-case-default';
import './macros/macrolib/textarea';
import './macros/macrolib/timed-next';
import './macros/macrolib/type';
import './macros/macrolib/unset';
import './macros/macrolib/widget';

import Macro from './macros/macro';


/*******************************************************************************
	Obsolete Macros.
*******************************************************************************/

/*
	Handle void macros: <<display>>, <<forget>>, <<remember>>, <<setplaylist>>, <<stopallaudio>>.
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
	Handle nonvoid macros: <<click>>.
*/
Macro.add('click', {
	tags     : [],
	skipArgs : true,

	handler() {
		return this.error('this macro has been replaced by <<link>>');
	}
});
