/***********************************************************************************************************************

	l10n/strings.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	ATTENTION TRANSLATORS

	Please use the `locale/l10n-template.js` file, from the root of the repository,
	as the template for your translation rather than this file.

	SEE: https://github.com/tmedwards/sugarcube-2/tree/develop/locale
*/

/*
	TODO: Update `locale/_template.js`!
*/

/* eslint-disable max-len */
const strings = {
	/*
		General.
	*/
	identity : 'game',
	aborting : 'Aborting',
	cancel   : 'Cancel',
	close    : 'Close',
	ok       : 'OK',

	/*
		Errors.
	*/
	errorTitle              : 'Error',
	errorToggle             : 'Toggle the error view',
	errorNonexistentPassage : 'the passage "{passage}" does not exist', // NOTE: `passage` is supplied locally

	/*
		Warnings.
	*/
	_warningIntroLacking  : 'Your browser either lacks or has disabled',
	_warningOutroDegraded : ', so this {identity} is running in a degraded mode. You may be able to continue, however, some parts may not work properly.',
	warningDegraded       : '{_warningIntroLacking} some of the capabilities required by this {identity}{_warningOutroDegraded}',
	warningNoGoodStorage  : '{_warningIntroLacking} various data storage APIs{_warningOutroDegraded}',
	warningNoSaves        : '{_warningIntroLacking} the capabilities required to support saves, so saves have been disabled for this session.',

	/*
		Debug bar.
	*/
	debugBarToggle      : 'Toggle the debug bar',
	debugBarNoWatches   : '\u2014 no watches set \u2014',
	debugBarAddWatch    : 'Add watch',
	debugBarDeleteWatch : 'Delete watch',
	debugBarWatchAll    : 'Watch all',
	debugBarWatchNone   : 'Delete all',
	debugBarLabelAdd    : 'Add',
	debugBarLabelWatch  : 'Watch',
	debugBarLabelTurn   : 'Turn', // (noun) chance to act (in a game), moment, period
	debugBarLabelViews  : 'Views',
	debugBarViewsToggle : 'Toggle the debug views',
	debugBarWatchToggle : 'Toggle the watch panel',

	/*
		UI bar.
	*/
	uiBarToggle : 'Toggle the UI bar',

	/*
		Saves.
	*/
	savesTitle           : 'Saves',
	savesHeaderBrowser   : 'Browser Saves',
	savesHeaderDisk      : 'Disk Saves',
	savesDisallowed      : 'Saving is currently disallowed.',
	savesLabelAuto       : 'Auto Save',
	savesLabelClear      : 'Clear',
	savesLabelDelete     : 'Delete',
	savesLabelDiskExport : 'Export\u2026',
	savesLabelDiskImport : 'Import\u2026',
	savesLabelDiskLoad   : 'Load from Disk\u2026',
	savesLabelDiskSave   : 'Save to Disk\u2026',
	savesLabelLoad       : 'Load',
	savesLabelSave       : 'Save',
	savesLabelSlot       : 'Slot Save',
	savesUnavailable     : 'No save slots found\u2026',
	savesUnknownDate     : 'unknown',
	saveErrorDecodeFail  : 'unable to decode save, likely due to corruption',
	saveErrorIdMismatch  : 'save is from the wrong {identity}',
	saveErrorInvalidData : 'save is missing required data, likely due to corruption',
	saveErrorNonexistent : 'save does not exist',

	/*
		Settings.
	*/
	settingsTitle : 'Settings',
	settingsOff   : 'Off',
	settingsOn    : 'On',
	settingsReset : 'Reset to Defaults',

	/*
		Restart.
	*/
	restartTitle  : 'Restart',
	restartPrompt : 'Are you sure that you want to restart? Unsaved progress will be lost.',

	/*
		Alert.
	*/
	alertTitle : 'Alert'

	/*
		Macros.
	*/
};
/* eslint-enable max-len */


/*
	Module Exports.
*/
export default strings;
