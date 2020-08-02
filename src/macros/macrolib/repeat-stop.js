/***********************************************************************************************************************

	macros/macrolib/repeat-stop.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import { MIN_DOM_ACTION_DELAY } from './constants';
import Macro from './macros/macro';
import State from './state';
import Wikifier from './markup/wikifier';
import cssTimeToMS from './utils/csstimetoms';


/*
	<<repeat>> & <<stop>>
*/
Macro.add('repeat', {
	isAsync : true,
	tags    : [],
	timers  : new Set(),
	t8nRe   : /^(?:transition|t8n)$/,

	handler() {
		if (this.args.length === 0) {
			return this.error('no time value specified');
		}

		let delay;

		try {
			delay = Math.max(0, cssTimeToMS(this.args[0]));
		}
		catch (ex) {
			return this.error(ex.message);
		}

		// Custom debug view setup.
		if (Config.debug) {
			this.debugView.modes({ block : true });
		}

		const transition = this.args.length > 1 && this.self.t8nRe.test(this.args[1]);
		const $wrapper   = jQuery(document.createElement('span'))
			.addClass(`macro-${this.name}`)
			.appendTo(this.output);

		// Register the timer.
		this.self.registerInterval.call(this, this.createShadowWrapper(() => {
			const frag = document.createDocumentFragment();
			new Wikifier(frag, this.payload[0].contents);

			let $output = $wrapper;

			if (transition) {
				$output = jQuery(document.createElement('span'))
					.addClass('macro-repeat-insert macro-repeat-in')
					.appendTo($output);
			}

			$output.append(frag);

			if (transition) {
				setTimeout(() => $output.removeClass('macro-repeat-in'), MIN_DOM_ACTION_DELAY);
			}
		}), delay);
	},

	registerInterval(callback, delay) {
		if (typeof callback !== 'function') {
			throw new TypeError('callback parameter must be a function');
		}

		const turnId = State.turns;
		const timers = this.self.timers;
		let timerId = null;

		// Set up the interval.
		timerId = setInterval(() => {
			// Terminate the timer if the turn IDs do not match.
			if (turnId !== State.turns) {
				clearInterval(timerId);
				timers.delete(timerId);
				return;
			}

			let timerIdCache;
			// There's no catch clause because this try/finally is here simply to ensure that
			// proper cleanup is done in the event that an exception is thrown during the
			// `Wikifier` call.
			try {
				Wikifier.temporary.break = null;

				// Set up the `repeatTimerId` value, caching the existing value, if necessary.
				if (Wikifier.temporary.hasOwnProperty('repeatTimerId')) {
					timerIdCache = Wikifier.temporary.repeatTimerId;
				}

				Wikifier.temporary.repeatTimerId = timerId;

				// Execute the callback.
				callback.call(this);
			}
			finally {
				// Teardown the `repeatTimerId` property, restoring the cached value, if necessary.
				if (typeof timerIdCache !== 'undefined') {
					Wikifier.temporary.repeatTimerId = timerIdCache;
				}
				else {
					delete Wikifier.temporary.repeatTimerId;
				}

				Wikifier.temporary.break = null;
			}
		}, delay);
		timers.add(timerId);

		// Set up a single-use `:passageinit` handler to remove pending timers.
		const eventNs = `:passageinit.macro-${this.name}`;
		jQuery(document).off(eventNs).one(eventNs, () => {
			timers.forEach(timerId => clearInterval(timerId));
			timers.clear();
		});
	}
});

Macro.add('stop', {
	skipArgs : true,

	handler() {
		if (!Wikifier.temporary.hasOwnProperty('repeatTimerId')) {
			return this.error('must only be used in conjunction with its parent macro <<repeat>>');
		}

		const timers  = Macro.get('repeat').timers;
		const timerId = Wikifier.temporary.repeatTimerId;
		clearInterval(timerId);
		timers.delete(timerId);
		Wikifier.temporary.break = 2;

		// Custom debug view setup.
		if (Config.debug) {
			this.debugView.modes({ hidden : true });
		}
	}
});
