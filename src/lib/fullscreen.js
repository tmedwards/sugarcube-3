/***********************************************************************************************************************

	lib/fullscreen.js

	Copyright © 2018–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Browser from './lib/browser';


/*
	Fullscreen API static object.
*/
const Fullscreen = (() => {
	/*
		SEE:
			https://fullscreen.spec.whatwg.org
			https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
	*/

	// Vendor properties object.
	const vendor = (() => {
		try {
			return Object.freeze([
				// Specification.
				{
					isEnabled   : 'fullscreenEnabled',
					element     : 'fullscreenElement',
					requestFn   : 'requestFullscreen',
					exitFn      : 'exitFullscreen',
					changeEvent : 'fullscreenchange', // prop: onfullscreenchange
					errorEvent  : 'fullscreenerror'   // prop: onfullscreenerror
				},

				// `webkit` prefixed: old Blink, WebKit, & Edge.
				{
					isEnabled   : 'webkitFullscreenEnabled',
					element     : 'webkitFullscreenElement',
					requestFn   : 'webkitRequestFullscreen',
					exitFn      : 'webkitExitFullscreen',
					changeEvent : 'webkitfullscreenchange',
					errorEvent  : 'webkitfullscreenerror'
				},

				// `moz` prefixed: old Gecko, maybe Seamonkey.
				{
					isEnabled   : 'mozFullScreenEnabled',
					element     : 'mozFullScreenElement',
					requestFn   : 'mozRequestFullScreen',
					exitFn      : 'mozCancelFullScreen',
					changeEvent : 'mozfullscreenchange',
					errorEvent  : 'mozfullscreenerror'
				},

				// `ms` prefixed: IE 11.
				{
					isEnabled   : 'msFullscreenEnabled',
					element     : 'msFullscreenElement',
					requestFn   : 'msRequestFullscreen',
					exitFn      : 'msExitFullscreen',
					changeEvent : 'MSFullscreenChange',
					errorEvent  : 'MSFullscreenError'
				}
			].find(vnd => vnd.isEnabled in document));
		}
		catch (ex) { /* no-op */ }

		return undefined;
	})();


	/*******************************************************************************
		Feature Detection Functions.
	*******************************************************************************/

	// Return whether the request and exit fullscreen methods return a `Promise`.
	//
	// NOTE: The initial result is cached for future calls.
	const returnsPromise = (function () {
		// Cache of whether the request and exit methods return a `Promise`.
		let hasPromise = null;

		function returnsPromise() {
			if (hasPromise !== null) {
				return hasPromise;
			}

			hasPromise = false;

			if (vendor) {
				try {
					const value = document.exitFullscreen();

					// Silence "Uncaught (in promise)" console errors from Blink.
					//
					// NOTE: Swallowing errors is generally bad, but in this case we know there's
					// going to be an error regardless, since we shouldn't be in fullscreen yet,
					// and we don't actually care about the error, since we just want the return
					// value, so we consign it to the bit bucket.
					//
					// NOTE: We don't ensure that the return value is not `undefined` here because
					// having the attempted call to `<Promise>.catch()` on an `undefined` value throw
					// is acceptable, since it will be caught and `false` eventually returned.
					value.catch(() => { /* no-op */ });

					hasPromise = value instanceof Promise;
				}
				catch (ex) { /* no-op */ }
			}

			return hasPromise;
		}

		return returnsPromise;
	})();


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function selectElement(requestedEl) {
		let selectedEl = requestedEl || document.documentElement;

		// Document element scrolling workaround for older browsers.
		if (
			selectedEl === document.documentElement
			&& (
				vendor.requestFn === 'msRequestFullscreen'   // IE 11
				|| Browser.isOpera && Browser.operaVersion < 15 // Opera 12 (Presto)
			)
		) {
			selectedEl = document.body;
		}

		return selectedEl;
	}


	/*******************************************************************************
		API Functions.
	*******************************************************************************/

	function getVendor() {
		return vendor;
	}

	function getElement() {
		return (vendor || null) && document[vendor.element];
	}

	function isEnabled() {
		return Boolean(vendor && document[vendor.isEnabled]);
	}

	function isFullscreen() {
		return Boolean(vendor && document[vendor.element]);
	}

	function requestFullscreen(options, requestedEl) {
		if (!vendor) {
			return Promise.reject(new Error('fullscreen not supported'));
		}

		const element = selectElement(requestedEl);

		if (typeof element[vendor.requestFn] !== 'function') {
			return Promise.reject(new Error('fullscreen not supported'));
		}
		if (isFullscreen()) {
			return Promise.resolve();
		}

		if (returnsPromise()) {
			return element[vendor.requestFn](options);
		}
		else { // eslint-disable-line no-else-return
			const namespace = '.Fullscreen_requestFullscreen';

			return new Promise((resolve, reject) => {
				jQuery(element)
					.off(namespace)
					.one(`${vendor.errorEvent}${namespace} ${vendor.changeEvent}${namespace}`, ev => {
						jQuery(this).off(namespace);

						if (ev.type === vendor.errorEvent) {
							reject(new Error('unknown fullscreen request error'));
						}
						else {
							resolve();
						}
					});
				element[vendor.requestFn](options);
			});
		}
	}

	function exitFullscreen() {
		if (!vendor || typeof document[vendor.exitFn] !== 'function') {
			return Promise.reject(new TypeError('fullscreen not supported'));
		}
		if (!isFullscreen()) {
			return Promise.reject(new TypeError('fullscreen mode not active'));
		}

		if (returnsPromise()) {
			return document[vendor.exitFn]();
		}
		else { // eslint-disable-line no-else-return
			const namespace = '.Fullscreen_exitFullscreen';

			return new Promise((resolve, reject) => {
				jQuery(document)
					.off(namespace)
					.one(`${vendor.errorEvent}${namespace} ${vendor.changeEvent}${namespace}`, ev => {
						jQuery(this).off(namespace);

						if (ev.type === vendor.errorEvent) {
							reject(new Error('unknown fullscreen exit error'));
						}
						else {
							resolve();
						}
					});
				document[vendor.exitFn]();
			});
		}
	}

	function toggleFullscreen(options, requestedEl) {
		return isFullscreen() ? exitFullscreen() : requestFullscreen(options, requestedEl);
	}

	function onChange(handlerFn, requestedEl) {
		if (!vendor) {
			return;
		}

		const element = selectElement(requestedEl);

		$(element).on(vendor.changeEvent, handlerFn);
	}

	function offChange(handlerFn, requestedEl) {
		if (!vendor) {
			return;
		}

		const element = selectElement(requestedEl);

		if (handlerFn) {
			$(element).off(vendor.changeEvent, handlerFn);
		}
		else {
			$(element).off(vendor.changeEvent);
		}
	}

	function onError(handlerFn, requestedEl) {
		if (!vendor) {
			return;
		}

		const element = selectElement(requestedEl);

		$(element).on(vendor.errorEvent, handlerFn);
	}

	function offError(handlerFn, requestedEl) {
		if (!vendor) {
			return;
		}

		const element = selectElement(requestedEl);

		if (handlerFn) {
			$(element).off(vendor.errorEvent, handlerFn);
		}
		else {
			$(element).off(vendor.errorEvent);
		}
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		vendor       : { get : getVendor },
		element      : { get : getElement },
		isEnabled    : { value : isEnabled },
		isFullscreen : { value : isFullscreen },
		request      : { value : requestFullscreen },
		exit         : { value : exitFullscreen },
		toggle       : { value : toggleFullscreen },
		onChange     : { value : onChange },
		offChange    : { value : offChange },
		onError      : { value : onError },
		offError     : { value : offError }
	}));
})();


/*
	Module Exports.
*/
export default Fullscreen;
