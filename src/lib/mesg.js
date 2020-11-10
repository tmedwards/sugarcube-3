/***********************************************************************************************************************

	lib/mesg.js

	Copyright © 2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

const Mesg = (() => {
	// Subscriber collection.
	const subscribers = new Map();


	/*******************************************************************************
		API Functions.
	*******************************************************************************/

	function receive(mesg, listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('listener parameter must be a function');
		}

		const listeners = subscribers.get(mesg);

		if (listeners) {
			listeners.add(listener);
		}
		else {
			subscribers.set(mesg, new Set([listener]));
		}
	}

	function cancel(mesg, listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('listener parameter must be a function');
		}

		const listeners = subscribers.get(mesg);

		if (listeners) {
			if (listeners.has(listener)) {
				listeners.remove(listener);

				if (listeners.size === 0) {
					subscribers.remove(mesg);
				}
			}
		}
	}

	function send(mesg, data) {
		const listeners = subscribers.get(mesg);

		if (listeners) {
			listeners.forEach(listener => listener(mesg, data));
		}
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		receive : { value : receive },
		cancel  : { value : cancel },
		send    : { value : send }
	}));
})();


/*
	Module Exports.
*/
export default Mesg;
