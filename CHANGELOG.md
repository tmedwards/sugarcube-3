# SugarCube v3 Pre-alpha Changelog Highlights

## 2020-11-10

* Internal cleanup.
* Updated development dependencies.
* Ported recent changes from v2.

## 2020-08-02

* Added the `-webkit-touch-callout: none` property to various link/button element styles.
* Added the `role="alert"` content attribute to the Alert dialog.

## 2020-08-01

* `Config` object API changes: `Config.startup.loadDelay` → `Config.startup.delay`.

## 2020-07-31

* Ported recent changes from v2.

## 2020-07-30

* `Config` object API changes: `Config.macros.maxLoopIterations` → `Config.macros.forMaxIterations`.
* Ported recent changes from v2.

## 2020-06-07

* Re-disabled identifier mangling in the minifier.
* Ported recent changes from v2.

## 2020-05-15

* Fixed the Alert dialog's title not being localizable.

## 2020-05-10

* Added strings for the Saves dialog headers.
* Updated patterns to full I18n coverage.

## 2020-04-30

* Ended document body auto-classing.
* Ended passage tag to class conversion.
* Utils functions API changes: `enumFrom()` → `mappingFrom()`.

## 2020-04-24

* Debug bar UI work.

## 2020-04-23

* Utils functions API changes: `isIterable()` added (provisionally, currently unused).

## 2020-04-22

* Moved title updates out of `Engine`.
* Updated the ESLint config and adjusted code styling as required—chiefly changes related to `switch` statements.
* Utils functions API changes:
	* `createEnum()` → `enumFrom()`.
	* `fromCssTime()` → `cssTimeToMS()`.
	* `newExceptionFrom()` → `exceptionFrom()`.
	* `safeActiveElement()` → `getActiveElement()`.
	* `stringify()` → `stringFrom()`.
	* `toCssTime()` → `msToCssTime()`.
	* `toDOMFromCSSProperty()` → `cssPropToDOMProp()`.

## 2020-04-21

* `Config` object API changes: `Config.loadDelay` → `Config.startup.loadDelay`.

## 2020-04-20

* More Saves dialog UI work.
* Utils functions API changes: `toStringOrDefault()` → `stringify()`.

## 2020-04-19

* Updated the Saves dialog and `Save` API to enable export/import of the save slots (incl. autosave).  Might want to tweak the UI a bit more though.

## 2020-04-18

* Fixed an issue where `State.getVar()` & `State.setVar()` could fail under certain circumstances.

## 2020-04-17

* FIXED ~~[UI] Find the source of the "Number expected" error being thrown in Edge (ca. 18) when any dialog is closed and fix it.~~
* FIXED ~~[UI] Find the source of the odd dialog control pop-in occurring in Firefox and fix it.~~

## 2020-04-16

* Moved the codebase to ES modules.
* Removed all legacy and deprecated code left over from v2 and v1.
* The TwineScript parser should no longer break object literal property names that match TwineScript operators.
* [Experimental] Variable names should no longer be limited to US-ASCII.  Have yet to update other needy patterns.
* The `<<goto>>` macro now terminates the Wikifier call chain.
* The loading screen is now blocking during startup—i.e., neither the engine nor interfaces will start until all non-own locks are released.
* [Experimental] Added a caching IndexedDB storage adapter.
* `Config` object API changes:
	* `Config.history.controls` → `Config.ui.historyControls`.
	* `Config.history.maxStates` acceptable value changed to *integer in the range 1–100*.  History lengths >100, incl. infinite, are no longer allowed.
	* `Config.passages.displayTitles` removed.
	* `Config.passages.start` → `Config.navigation.start`.
	* `Config.passages.transitionOut` → `Config.navigation.transitionOut`.
* Macro parser changes:
	* In addition to their `this` being set, handlers are now passed the `MacroContext` instance and processed arguments of the main tag as parameters.
* `Passage` object API changes:
	* `<Passage>.processText()` → `<Passage>.text`.
	* `<Passage>.text` → `<Passage>.source`.
* `State` object API changes: `State.active` removed.
* Task objects API changes: all task objects removed.
* `Util` object API changes:
	* `Util.charAndPosAt()` → `characterAndPosAt()`.
	* `Util.escape()` → `encodeEntities()`.
	* `Util.fromCssProperty()` → `toDOMFromCSSProperty()`.
	* `Util.fromCssTime()` → `fromCssTime()`.
	* `Util.getType()` → `getTypeOf()`.
	* `Util.isBoolean()` removed.
	* `Util.isIterable()` removed.
	* `Util.isNumeric()` removed (moved to internal only).
	* `Util.newExceptionFrom()` → `newExceptionFrom()`.
	* `Util.now()` → `now()`.
	* `Util.parseUrl()` → `parseURL()`.
	* `Util.sameValueZero()` → `sameValueZero()`.
	* `Util.slugify()` → `createSlug()`.
	* `Util.toCssTime()` → `toCssTime()`.
	* `Util.toEnum()` → `createEnum()`.
	* `Util.toStringTag()` → `getToStringTag()`.
	* `Util.unescape()` → `decodeEntities()`.
* Utils functions API changes:
	* `assert()` added (provisionally, currently unused).
	* `createDeferred()` added (provisionally, currently unused).
	* `createFilename()` added.
	* `getErrorMessage()` added (provisionally, currently unused).
	* `hasOwn()` added.
	* `stripNewlines()` added.
	* `throwError()` → `appendError()`.
* `Wikifier` object API changes:
	* `Wikifier.createExternalLink()` → `createExternalLink()`.
	* `Wikifier.createInternalLink()` → `createLink()`.
	* `Wikifier.isExternalLink()` → `isExternalLink()`.
* ***Lots*** of internal changes.
