/***********************************************************************************************************************

	kvstore/adapters/cookie.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import KVStore from './kvstore/kvstore';
import exceptionFrom from './utils/exceptionfrom';


KVStore.adapters.add((() => {
	// Expiry constants.
	const MAX_EXPIRY = 'Tue, 19 Jan 2038 03:14:07 GMT'; // i.e., `new Date((Math.pow(2, 31) - 1) * 1000).toUTCString()`
	const MIN_EXPIRY = 'Thu, 01 Jan 1970 00:00:00 GMT'; // i.e., `new Date(0).toUTCString()`

	// Adapter initialization state.
	let initialized = false;


	/*******************************************************************************
		CookieAdapter Class.
	*******************************************************************************/

	class CookieAdapter {
		constructor(storageId, persistent) {
			const prefix = `${storageId}${persistent ? '!' : '*'}.`;

			Object.defineProperties(this, {
				_prefix : {
					value : prefix
				},

				prefixRe : {
					value : new RegExp(`^${RegExp.escape(prefix)}`)
				},

				name : {
					value : 'cookie'
				},

				id : {
					value : storageId
				},

				persistent : {
					value : Boolean(persistent)
				}
			});
		}

		ready() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.ready() : Promise<boolean>]`); }

			return Promise.resolve(true);
		}

		size() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.size() : number]`); }

			return this.keys().length;
		}

		keys() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.keys() : []string]`); }

			if (document.cookie === '') {
				return [];
			}

			const cookies = document.cookie.split(/;\s*/);
			const keys    = [];

			for (let i = 0, length = cookies.length; i < length; ++i) {
				const kvPair = cookies[i].split('=');
				const key    = decodeURIComponent(kvPair[0]);

				// if (this.prefixRe.test(key)) {
				if (key.startsWith(this._prefix)) {
					const value = decodeURIComponent(kvPair[1]);

					// NOTE: All stored values are serialized and an empty string serializes to a
					// non-empty string.  Therefore, receiving an empty string here signifies a
					// deleted value, not a serialized empty string, so we should omit such pairs.
					if (value !== '') {
						// keys.push(key.replace(this.prefixRe, ''));
						keys.push(key.slice(this._prefix.length));
					}
				}
			}

			return keys;
		}

		has(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.has(key: "${key}") : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			return CookieAdapter.hasCookie(this._prefix + key);
		}

		get(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.get(key: "${key}") : any]`); }

			if (typeof key !== 'string' || !key) {
				return null;
			}

			const value = CookieAdapter.getCookie(this._prefix + key);
			return value === null
				? null
				: CookieAdapter.deserialize(value);
		}

		set(key, value) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.set(key: "${key}", value: \u2026) : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			try {
				CookieAdapter.setCookie(
					this._prefix + key,
					CookieAdapter.serialize(value),

					// An undefined expiry denotes a session cookie.
					this.persistent ? MAX_EXPIRY : undefined
				);

				// Attempt to verify that the cookie was actually set.
				if (!CookieAdapter.hasCookie(this._prefix + key)) {
					throw new Error('unknown validation error during set');
				}
			}
			catch (ex) {
				// Massage the cookie exception into something a bit nicer for the player.
				throw exceptionFrom(ex, Error, `cookie error: ${ex.message}`);
			}

			return true;
		}

		delete(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.delete(key: "${key}") : boolean]`); }

			if (
				typeof key !== 'string'
				|| !key

				// NOTE: Attempting to delete a cookie implies setting it, so we test for its
				// existence beforehand, to avoid creating it in the event that it does not
				// already exist.
				|| !CookieAdapter.hasCookie(this._prefix + key)
			) {
				return false;
			}

			try {
				CookieAdapter.setCookie(this._prefix + key, undefined, MIN_EXPIRY);

				// Attempt to verify that the cookie was actually deleted.
				if (CookieAdapter.hasCookie(this._prefix + key)) {
					throw new Error('unknown validation error during delete');
				}
			}
			catch (ex) {
				// Massage the cookie exception into something a bit nicer for the player.
				throw exceptionFrom(ex, Error, `cookie error: ${ex.message}`);
			}

			return true;
		}

		clear() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.clear() : boolean]`); }

			const keys = this.keys();

			for (let i = 0, length = keys.length; i < length; ++i) {
				const key = keys[i];

				if (BUILD_DEBUG) { console.log('\tdeleting key:', key); }

				try {
					CookieAdapter.setCookie(this._prefix + key, undefined, MIN_EXPIRY);

					// Attempt to verify that the cookie was actually deleted.
					if (CookieAdapter.hasCookie(this._prefix + key)) {
						throw new Error('unknown validation error during delete');
					}
				}
				catch (ex) {
					// Massage the cookie exception into something a bit nicer for the player.
					throw exceptionFrom(ex, Error, `cookie error: ${ex.message}`);
				}
			}

			return true;
		}

		static hasCookie(prefixedKey) {
			return CookieAdapter.getCookie(prefixedKey) !== null;
		}

		static getCookie(prefixedKey) {
			if (!prefixedKey || document.cookie === '') {
				return null;
			}

			const cookies = document.cookie.split(/;\s*/);

			for (let i = 0, length = cookies.length; i < length; ++i) {
				const kvPair = cookies[i].split('=');
				const key    = decodeURIComponent(kvPair[0]);

				if (prefixedKey === key) {
					const value = decodeURIComponent(kvPair[1]);

					// NOTE: All stored values are serialized and an empty string serializes to a
					// non-empty string.  Therefore, receiving an empty string here signifies a
					// deleted value, not a serialized empty string, so we should yield `null` for
					// such pairs.
					return value || null;
				}
			}

			return null;
		}

		static setCookie(prefixedKey, value, expiry) {
			if (!prefixedKey) {
				return;
			}

			let payload = `${encodeURIComponent(prefixedKey)}=`;

			if (value != null) { // lazy equality for null
				payload += encodeURIComponent(value);
			}

			if (expiry != null) { // lazy equality for null
				payload += `; expires=${expiry}`;
			}

			payload += '; path=/';
			document.cookie = payload;
		}

		static serialize(obj) {
			return LZString.compressToBase64(JSON.stringify(obj));
		}

		static deserialize(str) {
			return JSON.parse(LZString.decompressFromBase64(str));
		}
	}


	/*******************************************************************************
		Adapter Utility Functions.
	*******************************************************************************/

	function adapterInit() {
		// Cookie feature test.
		try {
			const tid = `_sc_${Date.now()}`;

			// We only test a session cookie as that should suffice.
			CookieAdapter.setCookie(tid, CookieAdapter.serialize(tid), undefined);
			initialized = CookieAdapter.deserialize(CookieAdapter.getCookie(tid)) === tid;
			CookieAdapter.setCookie(tid, undefined, MIN_EXPIRY);
		}
		catch (ex) {
			initialized = false;
		}

		return initialized;
	}

	function adapterCreate(storageId, persistent) {
		if (!initialized) {
			throw new Error('adapter not initialized');
		}

		return new CookieAdapter(storageId, persistent);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		init   : { value : adapterInit },
		create : { value : adapterCreate }
	}));
})());
