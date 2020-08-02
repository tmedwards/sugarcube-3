/***********************************************************************************************************************

	kvstore/adapters/webstorage.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import KVStore from './kvstore/kvstore';
import exceptionFrom from './utils/exceptionfrom';
import hasOwn from './utils/hasown';


KVStore.adapters.add((() => {
	// Adapter initialization state.
	let initialized = false;


	/*******************************************************************************
		WebStorageAdapter Class.
	*******************************************************************************/

	class WebStorageAdapter {
		constructor(storageId, persistent) {
			const prefix = `${storageId}.`;
			let engine = null;
			let name   = null;

			if (persistent) {
				engine = window.localStorage;
				name   = 'localStorage';
			}
			else {
				engine = window.sessionStorage;
				name   = 'sessionStorage';
			}

			Object.defineProperties(this, {
				_engine : {
					value : engine
				},

				_prefix : {
					value : prefix
				},

				prefixRe : {
					value : new RegExp(`^${RegExp.escape(prefix)}`)
				},

				name : {
					value : name
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

			// WARNING: DO NOT do something like `return this._engine.length` here, as that
			// will return the length of the entire store, rather than only our prefixed keys.
			return this.keys().length;
		}

		keys() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.keys() : []string]`); }

			const keys = [];

			for (let i = 0, length = this._engine.length; i < length; ++i) {
				const key = this._engine.key(i);

				// if (this.prefixRe.test(key)) {
				// 	keys.push(key.replace(this.prefixRe, ''));
				// }
				if (key.startsWith(this._prefix)) {
					keys.push(key.slice(this._prefix.length));
				}
			}

			return keys;
		}

		has(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.has(key: "${key}") : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			return hasOwn(this._engine, this._prefix + key);
		}

		get(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.get(key: "${key}") : any]`); }

			if (typeof key !== 'string' || !key) {
				return null;
			}

			const value = this._engine.getItem(this._prefix + key);
			return value == null // lazy equality for null
				? null
				: WebStorageAdapter.deserialize(value);
		}

		set(key, value) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.set(key: "${key}", value: \u2026) : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			try {
				this._engine.setItem(this._prefix + key, WebStorageAdapter.serialize(value));
			}
			catch (ex) {
				// If the exception is a quota exceeded error, massage it into something a bit
				// nicer for the player.
				//
				// NOTE: Ideally, we could simply check `ex.code` or `ex.name`, but neither of
				// those properties have, traditionally, been well standardized or supported in
				// all browsers.  Thus, we have to resort to pattern matching a combination of
				// `ex.name` and `ex.message`—the latter being required by Opera (Presto).
				//
				// I hate the parties responsible for this snafu so much.
				if (/quota.?(?:exceeded|reached)/i.test(ex.name + ex.message)) {
					throw exceptionFrom(ex, Error, `${this.name} quota exceeded`);
				}

				throw ex;
			}

			return true;
		}

		delete(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.delete(key: "${key}") : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			this._engine.removeItem(this._prefix + key);
			return true;
		}

		clear() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.clear() : boolean]`); }

			const keys = this.keys();

			for (let i = 0, length = keys.length; i < length; ++i) {
				if (BUILD_DEBUG) { console.log('\tdeleting key:', keys[i]); }

				this.delete(keys[i]);
			}

			return true;
		}

		static serialize(obj) {
			return LZString.compressToUTF16(JSON.stringify(obj));
		}

		static deserialize(str) {
			return JSON.parse(LZString.decompressFromUTF16(str));
		}
	}


	/*******************************************************************************
		Adapter Utility Functions.
	*******************************************************************************/

	function adapterInit(_, persistent) {
		// Web Storage feature test.
		function hasWebStorage(storeId) {
			try {
				const store = window[storeId];
				const tid   = `_sc_${Date.now()}`;
				store.setItem(tid, tid);
				const result = store.getItem(tid) === tid;
				store.removeItem(tid);
				return result;
			}
			catch (ex) { /* no-op */ }

			return false;
		}

		initialized = hasWebStorage(`${persistent ? 'local' : 'session'}Storage`);

		return initialized;
	}

	function adapterCreate(storageId, persistent) {
		if (!initialized) {
			throw new Error('adapter not initialized');
		}

		return new WebStorageAdapter(storageId, persistent);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		init   : { value : adapterInit },
		create : { value : adapterCreate }
	}));
})());
