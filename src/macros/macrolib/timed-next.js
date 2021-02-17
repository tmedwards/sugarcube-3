/***********************************************************************************************************************

	macros/macrolib/timed-next.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from '~/config';
import DebugView from '~/lib/debugview';
import { MIN_DOM_ACTION_DELAY } from '~/constants';
import Macro from '~/macros/macro';
import State from '~/state';
import Wikifier from '~/markup/wikifier';
import cssTimeToMS from '~/utils/csstimetoms';


/*
	<<timed>> & <<next>>
*/
Macro.add('timed', {
	isAsync : true,
	tags    : ['next'],
	timers  : new Set(),
	t8nRE   : /^(?:transition|t8n)$/,

	handler() {
		if (this.args.length === 0) {
			return this.error('no time value specified in <<timed>>');
		}

		const items = [];

		try {
			items.push({
				name    : this.name,
				source  : this.source,
				delay   : Math.max(0, cssTimeToMS(this.args[0])),
				content : this.payload[0].contents
			});
		}
		catch (ex) {
			return this.error(`${ex.message} in <<timed>>`);
		}

		if (this.payload.length > 1) {
			let i;

			try {
				let len;

				for (i = 1, len = this.payload.length; i < len; ++i) {
					items.push({
						name   : this.payload[i].name,
						source : this.payload[i].source,
						delay  : this.payload[i].args.length === 0
							? items[items.length - 1].delay
							: Math.max(0, cssTimeToMS(this.payload[i].args[0])),
						content : this.payload[i].contents
					});
				}
			}
			catch (ex) {
				return this.error(`${ex.message} in <<next>> (#${i})`);
			}
		}

		// Custom debug view setup.
		if (Config.debug) {
			this.debugView.modes({ block : true });
		}

		const transition = this.args.length > 1 && this.self.t8nRE.test(this.args[1]);
		const $wrapper   = jQuery(document.createElement('span'))
			.addClass(`macro-${this.name}`)
			.appendTo(this.output);

		// Register the timer.
		this.self.registerTimeout.call(this, this.createShadowWrapper(item => {
			const frag = document.createDocumentFragment();
			new Wikifier(frag, item.content);

			// Output.
			let $output = $wrapper;

			// Custom debug view setup for `<<next>>`.
			if (Config.debug && item.name === 'next') {
				$output = jQuery(new DebugView( // eslint-disable-line no-param-reassign
					$output[0],
					'macro',
					item.name,
					item.source
				).output);
			}

			if (transition) {
				$output = jQuery(document.createElement('span'))
					.addClass('macro-timed-insert macro-timed-in')
					.appendTo($output);
			}

			$output.append(frag);

			if (transition) {
				setTimeout(() => $output.removeClass('macro-timed-in'), MIN_DOM_ACTION_DELAY);
			}
		}), items);
	},

	registerTimeout(callback, items) {
		if (typeof callback !== 'function') {
			throw new TypeError('callback parameter must be a function');
		}

		// Cache info about the current turn.
		const passage = State.passage;
		const turn    = State.turns;

		// Timer info.
		const timers = this.self.timers;
		let timerId  = null;
		let nextItem = items.shift();

		const worker = function () {
			// Bookkeeping.
			timers.delete(timerId);

			// Terminate if the player has navigated away.
			if (State.passage !== passage || State.turns !== turn) {
				return;
			}

			// Set the current item and set up the next worker, if any.
			const curItem = nextItem;

			if ((nextItem = items.shift()) != null) { // lazy equality for null
				timerId = setTimeout(worker, nextItem.delay);
				timers.add(timerId);
			}

			// Execute the callback.
			callback.call(this, curItem);
		};

		// Setup the timeout.
		timerId = setTimeout(worker, nextItem.delay);
		timers.add(timerId);

		// Set up a single-use `:passageinit` handler to remove pending timers.
		const eventNs = `:passageinit.macro-${this.name}`;
		jQuery(document).off(eventNs).one(eventNs, () => {
			timers.forEach(timerId => clearTimeout(timerId));
			timers.clear();
		});
	}
});
