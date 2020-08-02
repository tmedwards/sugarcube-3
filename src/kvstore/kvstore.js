/***********************************************************************************************************************

	kvstore/kvstore.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	KVStore API static object.
*/
const KVStore = (() => {
	// In-order list of database adapters.
	const adapters = [];

	// The initialized adapters.
	const initialized = new Map();


	/*******************************************************************************
		Core Functions.
	*******************************************************************************/

	function createStore(storageId, persistent) {
		const storeType = persistent ? 'persistent' : 'session';
		let adapter = initialized.get(storeType);

		if (!adapter) {
			// Pick the first adapter that successfully initializes.
			adapter = adapters.find(adapter => adapter.init(storageId, persistent));

			if (!adapter) {
				throw new Error(`no valid ${storeType} storage adapters found`);
			}

			initialized.set(storeType, adapter);
		}

		return adapter.create(storageId, persistent);
	}


	/*******************************************************************************
		Adapter Functions.
	*******************************************************************************/

	function getAdapters() {
		return Array.from(adapters);
	}

	function addAdapter(adapter) {
		if (initialized.size > 0) {
			throw new Error('adapter initialization already completed, unable to add new adapters');
		}

		adapters.unshift(adapter);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		// Core Functions.
		create : { value : createStore },

		// Adapter Functions.
		adapters : {
			value : Object.preventExtensions(Object.defineProperties(Object.create(null), {
				get : { value : getAdapters },
				add : { value : addAdapter }
			}))
		}
	}));
})();


/*
	Module Exports.
*/
export default KVStore;
