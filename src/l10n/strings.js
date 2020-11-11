/***********************************************************************************************************************

	l10n/strings.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
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
	_errorFromWrongId       : 'from the wrong {identity}',
	_errorMissingData       : 'missing required data. Either the file has become corrupted or an incorrect file was loaded',
	errorTitle              : 'Error',
	errorToggle             : 'Toggle the error view',
	errorNonexistentPassage : 'the passage "{passage}" does not exist', // NOTE: `passage` is supplied locally
	errorSaveMissingData    : 'save is {_errorMissingData}',
	errorSaveIdMismatch     : 'save is {_errorFromWrongId}',
	errorSlotsMissingData   : 'save slots are {_errorMissingData}',
	errorSlotsIdMismatch    : 'save slots are {_errorFromWrongId}',

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
	uiBarToggle   : 'Toggle the UI bar',
	uiBarBackward : 'Go backward within the {identity} history',
	uiBarForward  : 'Go forward within the {identity} history',
	uiBarJumpto   : 'Jump to a specific point within the {identity} history',

	/*
		Jump To.
	*/
	jumptoTitle       : 'Jump To',
	jumptoTurn        : 'Turn', // (noun) chance to act (in a game), moment, period
	jumptoUnavailable : 'No jump points currently available\u2026',

	/*
		Saves.
	*/
	savesTitle           : 'Saves',
	savesHeaderSlot      : 'Slot Saves',
	savesHeaderDisk      : 'Disk Saves',
	savesDisallowed      : 'Saving has been disallowed on this passage.',
	savesLabelAuto       : 'Autosave',
	savesLabelClear      : 'Clear',
	savesLabelDelete     : 'Delete',
	savesLabelDiskExport : 'Export\u2026',
	savesLabelDiskImport : 'Import\u2026',
	savesLabelDiskLoad   : 'Load from Disk\u2026',
	savesLabelDiskSave   : 'Save to Disk\u2026',
	savesLabelLoad       : 'Load',
	savesLabelSave       : 'Save',
	savesLabelSlot       : 'Slot',
	savesUnavailable     : 'No save slots found\u2026',
	savesUnknownDate     : 'unknown',

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
	alertTitle : 'Alert',

	/*
		Autoload.
	*/
	autoloadTitle  : 'Autoload',
	autoloadCancel : 'Go to start',
	autoloadOk     : 'Load autosave',
	autoloadPrompt : 'An autosave exists. Load it now or go to the start?',

	/*
		Macros.
	*/
	macroBackText   : 'Back',  // (verb) rewind, revert
	macroReturnText : 'Return' // (verb) go/send back
};
/* eslint-enable max-len */


/*
	Module Exports.
*/
export default strings;
