/***********************************************************************************************************************

	save.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Db from './db';
import L10n from './l10n/l10n';
import State from './state';
import createFilename from './utils/createfilename';
import hasOwn from './utils/hasown';
import mappingFrom from './utils/mappingfrom';


/*
	Save API static object.
*/
const Save = (() => {
	// Save operation type pseudo-enumeration.
	const Type = mappingFrom({
		Autosave  : 'autosave',
		Disk      : 'disk',
		Serialize : 'serialize',
		Slot      : 'slot'
	});

	// The saves data storage key.
	const STORAGE_KEY = 'saves';

	// The upper bound of the saves slots.
	let slotsUBound = -1;


	/*******************************************************************************
		Saves Functions.
	*******************************************************************************/

	/*
		Initialize the saves subsystem.
	*/
	function savesInit() {
		if (BUILD_DEBUG) { console.log('[Save/savesInit()]'); }

		// Disable save slots and the autosave when Web Storage is unavailable.
		if (Db.storage.name === 'cookie') {
			savesObjClear();
			Config.saves.autoload = undefined;
			Config.saves.autosave = undefined;
			Config.saves.slots = 0;
			return false;
		}

		const saves = savesObjGet();

		// Handle the author changing the number of save slots.
		if (Config.saves.slots !== saves.slots.length) {
			// Attempt to decrease the number of slots; this will only compact
			// the slots array, by removing empty slots, no saves will be deleted.
			if (Config.saves.slots < saves.slots.length) {
				saves.slots.reverse();

				saves.slots = saves.slots.filter(function (val) {
					if (val === null && this.count > 0) {
						--this.count;
						return false;
					}

					return true;
				}, { count : saves.slots.length - Config.saves.slots });

				saves.slots.reverse();
			}
			// Elsewise, attempt to increase the number of slots.
			else if (Config.saves.slots > saves.slots.length) {
				appendSlots(saves.slots, Config.saves.slots - saves.slots.length);
			}

			// Update the store.
			savesObjSave(saves);
		}

		slotsUBound = saves.slots.length - 1;

		return true;
	}

	function savesObjClear() {
		Db.storage.delete(STORAGE_KEY);
		return true;
	}

	function savesObjCreate() {
		return {
			autosave : null,
			slots    : appendSlots([], Config.saves.slots)
		};
	}

	function savesObjGet() {
		const saves = Db.storage.get(STORAGE_KEY);
		return saves === null ? savesObjCreate() : saves;
	}

	function savesIsEnabled() {
		return autosaveIsEnabled() || slotsIsEnabled();
	}


	/*******************************************************************************
		Autosave Functions.
	*******************************************************************************/

	function autosaveIsEnabled() {
		return Db.storage.name !== 'cookie' && typeof Config.saves.autosave !== 'undefined';
	}

	function autosaveGet() {
		if (!autosaveIsEnabled()) {
			return null;
		}

		const saves = savesObjGet();
		return saves.autosave;
	}

	function autosaveHas() {
		if (!autosaveIsEnabled()) {
			return false;
		}

		return autosaveGet() !== null;
	}

	function autosaveLoad() {
		return new Promise(resolve => {
			if (!autosaveIsEnabled()) {
				return resolve(false);
			}

			unmarshal(autosaveGet());
			resolve(true);
		});
	}

	function autosaveSave(title, metadata) {
		if (!autosaveIsEnabled()) {
			return false;
		}

		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed()) {
			return false;
		}

		const saves  = savesObjGet();
		const config = {
			title,
			date : Date.now()
		};

		if (metadata != null) { // lazy equality for null
			config.metadata = metadata;
		}

		saves.autosave = marshal(config, { type : Type.Autosave });
		return savesObjSave(saves);
	}

	function autosaveDelete() {
		const saves = savesObjGet();
		saves.autosave = null;
		return savesObjSave(saves);
	}


	/*******************************************************************************
		Slots Functions.
	*******************************************************************************/

	function slotsIsEnabled() {
		return Db.storage.name !== 'cookie' && slotsUBound !== -1;
	}

	function slotsLength() {
		return slotsUBound + 1;
	}

	function slotsCount() {
		if (!slotsIsEnabled()) {
			return 0;
		}

		const slots = savesObjGet().slots;
		let count = 0;

		for (let i = 0, length = slots.length; i < length; ++i) {
			if (slots[i] !== null) {
				++count;
			}
		}

		return count;
	}

	function slotsIsEmpty() {
		return slotsCount() === 0;
	}

	function slotsGet(slot) {
		if (!slotsIsEnabled()) {
			return null;
		}

		if (slot < 0 || slot > slotsUBound) {
			return null;
		}

		const saves = savesObjGet();
		return saves.slots[slot];
	}

	function slotsHas(slot) {
		if (!slotsIsEnabled()) {
			return false;
		}

		if (slot < 0 || slot > slotsUBound) {
			return false;
		}

		return slotsGet(slot) !== null;
	}

	function slotsLoad(slot) {
		return new Promise(resolve => {
			if (!slotsIsEnabled()) {
				return resolve(false);
			}

			if (slot < 0 || slot > slotsUBound) {
				// throw new RangeError(`slot index out of bounds (range: 0–${slotsUBound}; received: ${slot})`)
				return resolve(false);
			}

			unmarshal(slotsGet(slot));
			resolve(true);
		});
	}

	function slotsSave(slot, title, metadata) {
		if (!slotsIsEnabled()) {
			return false;
		}

		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed()) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		if (slot < 0 || slot > slotsUBound) {
			return false;
		}

		const saves  = savesObjGet();
		const config = {
			title,
			date : Date.now()
		};

		if (metadata != null) { // lazy equality for null
			config.metadata = metadata;
		}

		saves.slots[slot] = marshal(config, { type : Type.Slot });
		return savesObjSave(saves);
	}

	function slotsDelete(slot) {
		if (slot < 0 || slot > slotsUBound) {
			return false;
		}

		const saves = savesObjGet();
		saves.slots[slot] = null;
		return savesObjSave(saves);
	}


	/*******************************************************************************
		Disk Import/Export Functions.
	*******************************************************************************/

	function diskExportSlots(filename) {
		const savesObj = LZString.compressToBase64(JSON.stringify(savesObjGet()));
		saveToDiskAs(filename, savesObj);
	}

	function diskImportSlots(event) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			// Add the handler that will capture the file information once the load is finished.
			jQuery(reader).on('load', ev => {
				try {
					const saveObj = JSON.parse(LZString.decompressFromBase64(ev.currentTarget.result));

					if (
						!saveObj
						|| !hasOwn(saveObj, 'autosave')
						|| !hasOwn(saveObj, 'slots')
						|| !(saveObj.slots instanceof Array)
					) {
						throw new Error(L10n.get('errorSlotsMissingData'));
					}

					if (
						saveObj.autosave && saveObj.autosave.id !== Config.saves.id
						|| saveObj.slots.some(slot => slot && slot.id !== Config.saves.id)
					) {
						throw new Error(L10n.get('errorSlotsIdMismatch'));
					}

					resolve(savesObjSave(saveObj));
				}
				catch (ex) {
					reject(ex);
				}
			});

			// Initiate the file load.
			reader.readAsText(event.target.files[0]);
		});
	}

	function diskSave(filename, metadata) {
		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed()) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		const config = metadata == null ? {} : { metadata }; // lazy equality for null
		const save   = LZString.compressToBase64(JSON.stringify(marshal(config, { type : Type.Disk })));
		saveToDiskAs(filename, save);
	}

	function diskLoad(event) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			// Add the handler that will capture the file information once the load is finished.
			jQuery(reader).on('load', ev => {
				try {
					let save;

					try {
						save = JSON.parse(LZString.decompressFromBase64(ev.currentTarget.result));
					}
					catch (ex) { /* no-op; `unmarshal()` will handle the error */ }

					unmarshal(save);
					resolve(true);
				}
				catch (ex) {
					reject(ex);
				}
			});

			// Initiate the file load.
			reader.readAsText(event.target.files[0]);
		});
	}


	/*******************************************************************************
		Serialization Functions.
	*******************************************************************************/

	function serialize(metadata) {
		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed()) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		const config = metadata == null ? {} : { metadata }; // lazy equality for null
		return LZString.compressToBase64(JSON.stringify(marshal(config, { type : Type.Serialize })));
	}

	function deserialize(base64Str) {
		return new Promise(resolve => {
			let saveObj;

			try {
				saveObj = JSON.parse(LZString.decompressFromBase64(base64Str));
			}
			catch (ex) { /* no-op; `unmarshal()` will handle the error */ }

			unmarshal(saveObj);
			resolve(saveObj.metadata);
		});
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function appendSlots(array, num) {
		for (let i = 0; i < num; ++i) {
			array.push(null);
		}

		return array;
	}

	function savesObjIsEmpty(saves) {
		return saves.autosave === null && saves.slots.every(slot => slot === null);
	}

	function savesObjSave(saves) {
		if (savesObjIsEmpty(saves)) {
			return Db.storage.delete(STORAGE_KEY);
		}

		return Db.storage.set(STORAGE_KEY, saves);
	}

	function marshal(config, details) {
		if (BUILD_DEBUG) { console.log(`[Save/marshal(…, { type : '${details.type}' })]`); }

		if (config != null && typeof config !== 'object') { // lazy equality for null
			throw new Error('config parameter must be an object');
		}

		const save = Object.assign({}, config, {
			id    : Config.saves.id,
			state : State.marshalForSave()
		});

		if (Config.saves.version) {
			save.version = Config.saves.version;
		}

		if (typeof Config.saves.onSave === 'function') {
			Config.saves.onSave(save, details);
		}

		// Delta encode the state history and delete the non-encoded property.
		save.state.delta = State.deltaEncode(save.state.history);
		delete save.state.history;

		return save;
	}

	function unmarshal(save) {
		if (BUILD_DEBUG) { console.log('[Save/unmarshal()]'); }

		if (!save || !save.hasOwnProperty('id') || !save.hasOwnProperty('state')) {
			throw new Error(L10n.get('errorSaveMissingData'));
		}

		// Delta decode the state history and delete the encoded property.
		/* eslint-disable no-param-reassign */
		save.state.history = State.deltaDecode(save.state.delta);
		delete save.state.delta;
		/* eslint-enable no-param-reassign */

		if (typeof Config.saves.onLoad === 'function') {
			Config.saves.onLoad(save);
		}

		if (save.id !== Config.saves.id) {
			throw new Error(L10n.get('errorSaveIdMismatch'));
		}

		// Restore the state.
		State.unmarshalForSave(save.state); // NOTE: May also throw exceptions.
	}

	function saveToDiskAs(filename, blobData) {
		if (typeof filename !== 'string') {
			throw new Error('filename parameter must be a string');
		}

		const baseName = createFilename(filename);

		if (baseName === '') {
			throw new Error('filename parameter must not consist solely of illegal characters');
		}

		const datestamp = function () {
			const date = new Date();
			let MM = date.getMonth() + 1;
			let DD = date.getDate();
			let hh = date.getHours();
			let mm = date.getMinutes();
			let ss = date.getSeconds();

			if (MM < 10) { MM = `0${MM}`; }
			if (DD < 10) { DD = `0${DD}`; }
			if (hh < 10) { hh = `0${hh}`; }
			if (mm < 10) { mm = `0${mm}`; }
			if (ss < 10) { ss = `0${ss}`; }

			return `${date.getFullYear()}${MM}${DD}-${hh}${mm}${ss}`;
		};
		const blobName = `${baseName}-${datestamp()}.save`;
		saveAs(new Blob([blobData], { type : 'text/plain;charset=UTF-8' }), blobName);
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Save Functions.
		init      : { value : savesInit },
		clear     : { value : savesObjClear },
		get       : { value : savesObjGet },
		isEnabled : { value : savesIsEnabled },

		// Autosave Functions.
		autosave : {
			value : Object.preventExtensions(Object.create(null, {
				isEnabled : { value : autosaveIsEnabled },
				has       : { value : autosaveHas },
				get       : { value : autosaveGet },
				load      : { value : autosaveLoad },
				save      : { value : autosaveSave },
				delete    : { value : autosaveDelete }
			}))
		},

		// Slots Functions.
		slots : {
			value : Object.preventExtensions(Object.create(null, {
				isEnabled : { value : slotsIsEnabled },
				length    : { get : slotsLength },
				isEmpty   : { value : slotsIsEmpty },
				count     : { value : slotsCount },
				has       : { value : slotsHas },
				get       : { value : slotsGet },
				load      : { value : slotsLoad },
				save      : { value : slotsSave },
				delete    : { value : slotsDelete }
			}))
		},

		// Disk Import/Export Functions.
		disk : {
			value : Object.preventExtensions(Object.create(null, {
				export : { value : diskExportSlots },
				import : { value : diskImportSlots },
				load   : { value : diskLoad },
				save   : { value : diskSave }
			}))
		},

		// Serialization Functions.
		serialize   : { value : serialize },
		deserialize : { value : deserialize }
	}));
})();


/*
	Module Exports.
*/
export default Save;
