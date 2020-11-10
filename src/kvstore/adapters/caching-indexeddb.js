/***********************************************************************************************************************

	kvstore/adapters/caching-indexeddb.js

	Copyright © 2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import KVStore from './kvstore/kvstore';
// TODO: All errors are instances of `DOMException`, so we should probably
// convert them to instances of `Error` via `exceptionFrom()`.
//
// import exceptionFrom from './utils/exceptionfrom';


KVStore.adapters.add((() => {
	// IndexedDB transaction constants.
	const READ_ONLY  = 'readonly';
	const READ_WRITE = 'readwrite';

	// Adapter initialization state.
	let initialized = false;


	/*******************************************************************************
		IndexedDBAdapter Class.
	*******************************************************************************/

	class IndexedDBAdapter {
		constructor(storageId) {
			const dbPromise = new Promise((resolve, reject) => {
				const request = indexedDB.open(storageId);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
				request.onupgradeneeded = () => request.result.createObjectStore('persistent');
			})
				.catch(ex => console.error('IndexedDBAdapter database open error:', ex));

			Object.defineProperties(this, {
				_cache : {
					value : new Map()
				},

				_db : {
					value : dbPromise
				},

				_storeName : {
					value : 'persistent'
				},

				name : {
					value : 'indexedDB'
				},

				id : {
					value : storageId
				},

				persistent : {
					value : true
				}
			});

			// Fill the synchronous cache from the asynchronous store.
			Object.defineProperty(this, '_readiness', {
				value : new Promise((resolve, reject) => {
					this._db.then(db => {
						const tx      = db.transaction(this._storeName, READ_ONLY);
						const store   = tx.objectStore(this._storeName);
						const request = store.openCursor();
						request.onerror = () => {
							console.error('IndexedDBAdapter store cache error:', request.error);
							reject(request.error);
						};
						request.onsuccess = () => {
							if (request.result) {
								this._cache.set(request.result.key, request.result.value);
								request.result.continue();
							}
							else {
								resolve(true);
							}
						};
					});
				})
			});
		}

		ready() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.ready() : Promise<boolean>]`); }

			return this._readiness;
		}

		size() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.size() : number]`); }

			return this._cache.size;
		}

		keys() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.keys() : []string]`); }

			return Array.from(this._cache.keys());
		}

		has(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.has(key: "${key}") : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			return this._cache.has(key);
		}

		get(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.get(key: "${key}") : any]`); }

			if (typeof key !== 'string' || !key) {
				return null;
			}

			const serialized = this._cache.get(key);
			return serialized == null // lazy equality for null
				? null
				: IndexedDBAdapter.deserialize(serialized);
		}

		set(key, value) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.set(key: "${key}", value: \u2026) : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			const serialized = IndexedDBAdapter.serialize(value);

			// TODO: `QuotaExceededError` exceptions can be thrown and should be handled.
			IndexedDBAdapter.updateStore(this._db, this._storeName, 'put', key, serialized);

			this._cache.set(key, serialized);

			return true;
		}

		delete(key) {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.delete(key: "${key}") : boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			IndexedDBAdapter.updateStore(this._db, this._storeName, 'delete', key);
			this._cache.delete(key);

			return true;
		}

		clear() {
			if (BUILD_DEBUG) { console.log(`[<KVStore:${this.name}>.clear() : boolean]`); }

			IndexedDBAdapter.updateStore(this._db, this._storeName, 'clear');
			this._cache.clear();

			return true;
		}

		static updateStore(dbPromise, storeName, action, key, value) {
			dbPromise.then(db => new Promise((resolve, reject) => {
				const tx    = db.transaction(storeName, READ_WRITE);
				const store = tx.objectStore(storeName);
				let request;

				switch (action) {
					case 'put':
						request = store.put(value, key);
						break;

					case 'delete':
						request = store.delete(key);
						break;

					case 'clear':
						request = store.clear();
						break;
				}

				request.onerror = () => {
					console.error('IndexedDBAdapter update store error:', request.error);
					reject(request.error);
				};
				request.onsuccess = () => resolve(true);
			}));
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
		// IndexedDB feature test.
		//
		// FIXME: Not really an exacting test here.
		initialized = persistent && typeof window.indexedDB !== 'undefined';

		return initialized;
	}

	function adapterCreate(storageId, persistent) {
		if (!initialized) {
			throw new Error('adapter not initialized');
		}

		return new IndexedDBAdapter(storageId, persistent);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		init   : { value : adapterInit },
		create : { value : adapterCreate }
	}));
})());
