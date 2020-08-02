/***********************************************************************************************************************

	db.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import KVStore from './kvstore/kvstore';

// NOTE: Adapter imports must come after the main `KVStore` import and be listed
// in order of desirability (least → most).
/* eslint-disable sort-imports */
import './kvstore/adapters/cookie';
import './kvstore/adapters/webstorage';
import './kvstore/adapters/caching-indexeddb';
/* eslint-enable sort-imports */


/*
	Db API static object.
*/
const Db = (() => {
	// The persistent storage instance.
	let persistentStore = null;

	// The session storage instance.
	let sessionStore = null;


	/*******************************************************************************
		Core Functions.
	*******************************************************************************/

	function initStores(storageId) {
		if (!persistentStore) {
			persistentStore = KVStore.create(storageId, true);
		}

		if (!sessionStore) {
			sessionStore = KVStore.create(storageId, false);
		}

		return Promise.all([persistentStore.ready(), sessionStore.ready()]);
	}

	function getPersistent() {
		return persistentStore;
	}

	function getSession() {
		return sessionStore;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		init    : { value : initStores },
		session : { get : getSession },
		storage : { get : getPersistent }
	}));
})();


/*
	Module Exports.
*/
export default Db;
