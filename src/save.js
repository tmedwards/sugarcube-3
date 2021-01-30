/***********************************************************************************************************************

	save.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Config from './config';
import Db from './db';
import L10n from './l10n/l10n';
import { MAX_SAVE_ID } from './constants';
import State from './state';
import createFilename from './utils/createfilename';
import hasOwn from './utils/hasown';
import mappingFrom from './utils/mappingfrom';


/*
	Save API static object.
*/
const Save = (() => {
	// Save type pseudo-enumeration.
	const Type = mappingFrom({
		Auto      : 'auto',
		Disk      : 'disk',
		Serialize : 'serialize',
		Slot      : 'slot'
	});

	// Save keys prefixes and suffixes.
	const KEY_AUTO_PREFIX     = 'save.auto.';
	const KEY_SLOT_PREFIX     = 'save.slot.';
	const KEY_DATA_SUFFIX     = '.data';
	const KEY_MANIFEST_SUFFIX = '.manifest';


	/*******************************************************************************
		General Saves Functions.
	*******************************************************************************/

	/*
		Initialize the saves subsystem.
	*/
	function init() {
		if (BUILD_DEBUG) { console.log('[Save/init()]'); }

		// NOTE: If database access becomes a bottleneck, consider caching the
		// auto and slot save manifests here.

		return true;
	}


	/*******************************************************************************
		Browser Auto Saves Functions.
	*******************************************************************************/

	function autoDataKeyFromId(id) {
		return `${KEY_AUTO_PREFIX}${id}${KEY_DATA_SUFFIX}`;
	}

	function autoManifestKeyFromId(id) {
		return `${KEY_AUTO_PREFIX}${id}${KEY_MANIFEST_SUFFIX}`;
	}

	function autoGetDataKeys() {
		return Db.storage.keys().filter(key => key.startsWith(KEY_AUTO_PREFIX) && key.endsWith(KEY_DATA_SUFFIX));
	}

	function autoGetManifestKeys() {
		return Db.storage.keys().filter(key => key.startsWith(KEY_AUTO_PREFIX) && key.endsWith(KEY_MANIFEST_SUFFIX));
	}

	function autoIdFromDataKey(key) {
		const begin = KEY_AUTO_PREFIX.length;
		const end   = KEY_DATA_SUFFIX.length * -1;
		return Number(key.slice(begin, end));
	}

	function autoIdFromManifestKey(key) {
		const begin = KEY_AUTO_PREFIX.length;
		const end   = KEY_MANIFEST_SUFFIX.length * -1;
		return Number(key.slice(begin, end));
	}

	// Find the most recent ID, ordered by date (descending).
	function autoGetLastId() {
		return autoGetManifestKeys()
			.map(key => ({
				id   : autoIdFromManifestKey(key),
				date : Db.storage.get(key).date
			}))
			.sort((a, b) => b.date - a.date)
			.first()
			?.id;
	}

	// // QUESTION: Is this function necessary?
	// function autoGetIds() {
	// 	return autoGetDataKeys().map(key => autoIdFromDataKey(key));
	// }

	function autoClear() {
		[...autoGetDataKeys(), ...autoGetManifestKeys()].forEach(key => Db.storage.delete(key));
		return true;
	}

	function autoContinue() {
		const id = autoGetLastId();

		if (id == null) { // lazy equality for null
			return Promise.reject(new Error(L10n.get('saveErrorNonexistent')));
		}

		return autoLoad(id);
	}

	function autoDelete(id) {
		if (!Number.isInteger(id)) {
			throw new TypeError('auto save id must be an integer');
		}
		else if (id < 0 || id > MAX_SAVE_ID) {
			throw new RangeError(`auto save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
		}

		Db.storage.delete(autoDataKeyFromId(id));
		Db.storage.delete(autoManifestKeyFromId(id));
		return true;
	}

	function autoHas(id) {
		if (!Number.isInteger(id)) {
			throw new TypeError('auto save id must be an integer');
		}
		else if (id < 0 || id > MAX_SAVE_ID) {
			throw new RangeError(`auto save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
		}

		return Db.storage.has(autoDataKeyFromId(id));
	}

	function autoIsEnabled() {
		return Config.saves.maxAutoSaves > 0;
	}

	function autoLoad(id) {
		return new Promise(resolve => {
			if (!Number.isInteger(id)) {
				throw new TypeError('auto save id must be an integer');
			}
			else if (id < 0 || id > MAX_SAVE_ID) {
				throw new RangeError(`auto save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
			}

			const data = Db.storage.get(autoDataKeyFromId(id));

			if (!data) {
				throw new Error(L10n.get('saveErrorNonexistent'));
			}

			unmarshal(data); // NOTE: May also throw exceptions.
			resolve(true);
		});
	}

	function autoGetManifests() {
		// NOTE: Order by date (descending).
		return autoGetManifestKeys()
			.map(key => ({
				id       : autoIdFromManifestKey(key),
				manifest : Db.storage.get(key)
			}))
			.sort((a, b) => b.manifest.date - a.manifest.date);
	}

	function autoSave(desc, metadata) {
		if (
			!autoIsEnabled() ||
			typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed(Type.Auto)
		) {
			return false;
		}

		const manifest = {
			date : Date.now(),
			desc : desc ?? Config.saves.descriptions?.(Type.Auto) ?? `Turn ${State.turns}`
		};

		if (metadata != null) { // lazy equality for null
			manifest.metadata = metadata;
		}

		const id          = ((autoGetLastId() ?? -1) + 1) % Config.saves.maxAutoSaves;
		const dataKey     = autoDataKeyFromId(id);
		const manifestKey = autoManifestKeyFromId(id);
		const data        = marshal(Type.Auto);

		if (!Db.storage.set(dataKey, data)) {
			return false;
		}

		if (!Db.storage.set(manifestKey, manifest)) {
			Db.storage.delete(dataKey);
			return false;
		}

		return true;
	}

	function autoSize() {
		return autoGetDataKeys().length;
	}


	/*******************************************************************************
		Browser Slot Saves Functions.
	*******************************************************************************/

	function slotDataKeyFromId(id) {
		return `${KEY_SLOT_PREFIX}${id}${KEY_DATA_SUFFIX}`;
	}

	function slotManifestKeyFromId(id) {
		return `${KEY_SLOT_PREFIX}${id}${KEY_MANIFEST_SUFFIX}`;
	}

	function slotGetDataKeys() {
		return Db.storage.keys().filter(key => key.startsWith(KEY_SLOT_PREFIX) && key.endsWith(KEY_DATA_SUFFIX));
	}

	function slotGetManifestKeys() {
		return Db.storage.keys().filter(key => key.startsWith(KEY_SLOT_PREFIX) && key.endsWith(KEY_MANIFEST_SUFFIX));
	}

	function slotIdFromDataKey(key) {
		const begin = KEY_SLOT_PREFIX.length;
		const end   = KEY_DATA_SUFFIX.length * -1;
		return Number(key.slice(begin, end));
	}

	function slotIdFromManifestKey(key) {
		const begin = KEY_SLOT_PREFIX.length;
		const end   = KEY_MANIFEST_SUFFIX.length * -1;
		return Number(key.slice(begin, end));
	}

	// // QUESTION: Is this function necessary?
	// function slotGetIds() {
	// 	return slotGetDataKeys().map(key => slotIdFromDataKey(key));
	// }

	function slotClear() {
		[...slotGetDataKeys(), ...slotGetManifestKeys()].forEach(key => Db.storage.delete(key));
		return true;
	}

	function slotDelete(id) {
		if (!Number.isInteger(id)) {
			throw new TypeError('slot save id must be an integer');
		}
		else if (id < 0 || id > MAX_SAVE_ID) {
			throw new RangeError(`slot save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
		}

		Db.storage.delete(slotDataKeyFromId(id));
		Db.storage.delete(slotManifestKeyFromId(id));
		return true;
	}

	function slotHas(id) {
		if (!Number.isInteger(id)) {
			throw new TypeError('slot save id must be an integer');
		}
		else if (id < 0 || id > MAX_SAVE_ID) {
			throw new RangeError(`slot save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
		}

		return Db.storage.has(slotDataKeyFromId(id));
	}

	function slotIsEnabled() {
		return Config.saves.maxSlotSaves > 0;
	}

	function slotLoad(id) {
		return new Promise(resolve => {
			if (!Number.isInteger(id)) {
				throw new TypeError('slot save id must be an integer');
			}
			else if (id < 0 || id > MAX_SAVE_ID) {
				throw new RangeError(`slot save id out of bounds (range: 0–${MAX_SAVE_ID}; received: ${id})`);
			}

			const data = Db.storage.get(slotDataKeyFromId(id));

			if (!data) {
				throw new Error(L10n.get('saveErrorNonexistent'));
			}

			unmarshal(data); // NOTE: May also throw exceptions.
			resolve(true);
		});
	}

	function slotGetManifests() {
		// NOTE: Order by ID (ascending).
		return slotGetManifestKeys()
			.map(key => ({
				id       : slotIdFromManifestKey(key),
				manifest : Db.storage.get(key)
			}))
			.sort((a, b) => a.id - b.id);

		// const manifests = [];
		// slotGetManifestKeys()
		// 	.forEach(key => manifests[slotIdFromManifestKey(key)] = Db.storage.get(key));
		// return manifests;
	}

	function slotSave(id, desc, metadata) {
		if (!Number.isInteger(id)) {
			throw new TypeError('slot save id must be an integer');
		}
		else if (id < 0 || id >= Config.saves.maxSlotSaves) {
			throw new RangeError(`slot save id out of bounds (range: 0–${Config.saves.maxSlotSaves - 1}; received: ${id})`);
		}

		if (
			!slotIsEnabled() ||
			typeof Config.saves.isAllowed === 'function' &&
			!Config.saves.isAllowed(Type.Slot)
		) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		const manifest = {
			date : Date.now(),
			desc : desc ?? Config.saves.descriptions?.(Type.Slot) ?? `Turn ${State.turns}`
		};

		if (metadata != null) { // lazy equality for null
			manifest.metadata = metadata;
		}

		const dataKey     = slotDataKeyFromId(id);
		const manifestKey = slotManifestKeyFromId(id);
		const data        = marshal(Type.Slot);

		if (!Db.storage.set(dataKey, data)) {
			return false;
		}

		if (!Db.storage.set(manifestKey, manifest)) {
			Db.storage.delete(dataKey);
			return false;
		}

		return true;
	}

	function  slotSize() {
		return  slotGetDataKeys().length;
	}


	/*******************************************************************************
		Browser General Saves Functions.
	*******************************************************************************/

	function browserIsEnabled() {
		return autoIsEnabled() || slotIsEnabled();
	}

	function browserClear() {
		autoClear();
		slotClear();
		return true;
	}

	function browserExport(filename) {
		const auto = autoGetDataKeys().map(dataKey => {
			const id          = autoIdFromDataKey(dataKey);
			const manifestKey = autoManifestKeyFromId(id);
			const data        = Db.storage.get(dataKey);
			const manifest    = Db.storage.get(manifestKey);

			if (!data || !manifest) {
				throw new Error('GURU MEDITATION ERROR: during saves export auto save data or manifest nonexistent.');
			}

			return { id, data, manifest };
		});
		const slot = slotGetDataKeys().map(dataKey => {
			const id          = slotIdFromDataKey(dataKey);
			const manifestKey = slotManifestKeyFromId(id);
			const data        = Db.storage.get(dataKey);
			const manifest    = Db.storage.get(manifestKey);

			if (!data || !manifest) {
				throw new Error('GURU MEDITATION ERROR: during saves export slot slave data or manifest nonexistent.');
			}

			return { id, data, manifest };
		});
		const bundle = LZString.compressToBase64(JSON.stringify({
			id : Config.saves.id,
			auto,
			slot
		}));
		saveToDiskAs(filename, bundle);
	}

	function browserImport(event) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			// Add the handler that will capture the file information once the load is finished.
			jQuery(reader).on('load', ev => {
				try {
					const badSave = O => !hasOwn(O, 'id') || !hasOwn(O, 'data') || !hasOwn(O, 'manifest');
					let bundle;

					try {
						bundle = JSON.parse(LZString.decompressFromBase64(ev.currentTarget.result));
					}
					catch (ex) {
						throw new Error(L10n.get('saveErrorDecodeFail'));
					}

					if (
						bundle == null || typeof bundle !== 'object' || // lazy equality for null
						!hasOwn(bundle, 'id') ||
						!hasOwn(bundle, 'auto') || !(bundle.auto instanceof Array) || bundle.auto.some(badSave) ||
						!hasOwn(bundle, 'slot') || !(bundle.slot instanceof Array) || bundle.slot.some(badSave)
					) {
						throw new Error(L10n.get('saveErrorInvalidData'));
					}

					if (bundle.id !== Config.saves.id) {
						throw new Error(L10n.get('saveErrorIdMismatch'));
					}

					autoClear();
					slotClear();

					// QUESTION: Maybe failures below should throw exceptions?

					bundle.auto.forEach(save => {
						const { id, data, manifest } = save;
						const dataKey                = autoDataKeyFromId(id);
						const manifestKey            = autoManifestKeyFromId(id);

						if (!Db.storage.set(dataKey, data)) {
							return false;
						}

						if (!Db.storage.set(manifestKey, manifest)) {
							Db.storage.delete(dataKey);
						}
					});

					bundle.slot.forEach(save => {
						const { id, data, manifest } = save;
						const dataKey                = slotDataKeyFromId(id);
						const manifestKey            = slotManifestKeyFromId(id);

						if (!Db.storage.set(dataKey, data)) {
							return false;
						}

						if (!Db.storage.set(manifestKey, manifest)) {
							Db.storage.delete(dataKey);
						}
					});

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
		Disk Saves Functions.
	*******************************************************************************/

	function diskSave(filename) {
		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed(Type.Disk)) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		const bundle = LZString.compressToBase64(JSON.stringify({
			id   : Config.saves.id,
			data : marshal(Type.Disk)
		}));
		saveToDiskAs(filename, bundle);
	}

	function diskLoad(event) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			// Add the handler that will capture the file information once the load is finished.
			jQuery(reader).on('load', ev => {
				try {
					let bundle;

					try {
						bundle = JSON.parse(LZString.decompressFromBase64(ev.currentTarget.result));
					}
					catch (ex) {
						throw new Error(L10n.get('saveErrorDecodeFail'));
					}

					if (
						bundle == null || typeof bundle !== 'object' || // lazy equality for null
						!hasOwn(bundle, 'id') || !hasOwn(bundle, 'data')
					) {
						throw new Error(L10n.get('saveErrorInvalidData'));
					}

					if (bundle.id !== Config.saves.id) {
						throw new Error(L10n.get('saveErrorIdMismatch'));
					}

					unmarshal(bundle.data); // NOTE: May also throw exceptions.
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
		Serialization Saves Functions.
	*******************************************************************************/

	function serialize() {
		if (typeof Config.saves.isAllowed === 'function' && !Config.saves.isAllowed(Type.Serialize)) {
			throw new Error(L10n.get('savesDisallowed'));
		}

		return LZString.compressToBase64(JSON.stringify({
			id   : Config.saves.id,
			data : marshal(Type.Serialize)
		}));
	}

	function deserialize(base64Str) {
		return new Promise(resolve => {
			let bundle;

			try {
				bundle = JSON.parse(LZString.decompressFromBase64(base64Str));
			}
			catch (ex) {
				throw new Error(L10n.get('saveErrorDecodeFail'));
			}

			if (
				bundle == null || typeof bundle !== 'object' || // lazy equality for null
				!hasOwn(bundle, 'id') || !hasOwn(bundle, 'data')
			) {
				throw new Error(L10n.get('saveErrorInvalidData'));
			}

			if (bundle.id !== Config.saves.id) {
				throw new Error(L10n.get('saveErrorIdMismatch'));
			}

			unmarshal(bundle.data); // NOTE: May also throw exceptions.
			resolve(true);
		});
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function marshal(saveType) {
		if (BUILD_DEBUG) { console.log(`[Save/marshal(saveType: "${saveType}")]`); }

		const save = { state : State.marshal() };

		if (Config.saves.version != null) { // lazy equality for null
			save.version = Config.saves.version;
		}

		if (typeof Config.saves.onSave === 'function') {
			Config.saves.onSave(save, { type : saveType });
		}

		return save;
	}

	function unmarshal(save) {
		if (BUILD_DEBUG) { console.log('[Save/unmarshal()]'); }

		if (save == null || typeof save !== 'object' || !hasOwn(save, 'state')) { // lazy equality for null
			throw new Error(L10n.get('saveErrorInvalid'));
		}

		if (typeof Config.saves.onLoad === 'function') {
			Config.saves.onLoad(save);
		}

		// Restore the state.
		State.unmarshal(save.state); // NOTE: May also throw exceptions.
	}

	function saveToDiskAs(filename, blobData) {
		if (typeof filename !== 'string') {
			throw new Error('filename parameter must be a string');
		}

		const baseName = createFilename(filename);

		if (baseName === '') {
			throw new Error('filename parameter must not consist solely of illegal characters');
		}

		const datestamp = createDatestamp(new Date());
		const blobName  = `${baseName}-${datestamp}.save`;
		saveAs(new Blob([blobData], { type : 'text/plain;charset=UTF-8' }), blobName);
	}

	function createDatestamp(date) {
		if (!(date instanceof Date)) {
			throw new TypeError('createDatestamp date parameter must be a Date object');
		}

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
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// General Save Functions.
		init : { value : init },

		// Browser Saves Functions.
		browser : {
			value : Object.preventExtensions(Object.create(null, {
				// Browser Auto Saves Functions.
				auto : {
					value : Object.preventExtensions(Object.create(null, {
						clear     : { value : autoClear },
						continue  : { value : autoContinue },
						delete    : { value : autoDelete },
						has       : { value : autoHas },
						isEnabled : { value : autoIsEnabled },
						load      : { value : autoLoad },
						manifests : { value : autoGetManifests },
						save      : { value : autoSave },
						size      : { value : autoSize }
					}))
				},

				// Browser Slot Saves Functions.
				slot : {
					value : Object.preventExtensions(Object.create(null, {
						clear     : { value : slotClear },
						delete    : { value : slotDelete },
						has       : { value : slotHas },
						isEnabled : { value : slotIsEnabled },
						load      : { value : slotLoad },
						manifests : { value : slotGetManifests },
						save      : { value : slotSave },
						size      : { value : slotSize }
					}))
				},

				// Browser General Saves Functions.
				isEnabled : { value : browserIsEnabled },
				clear     : { value : browserClear },
				export    : { value : browserExport },
				import    : { value : browserImport }
			}))
		},

		// Disk Saves Functions.
		disk : {
			value : Object.preventExtensions(Object.create(null, {
				load : { value : diskLoad },
				save : { value : diskSave }
			}))
		},

		// Serialization Saves Functions.
		serialize   : { value : serialize },
		deserialize : { value : deserialize }
	}));
})();


/*
	Module Exports.
*/
export default Save;
