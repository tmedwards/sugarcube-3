# SugarCube v3 Pre-alpha Changelog Highlights

* **TODO:** Make auto saves not save on the same turn that any save is loaded or, probably, a session is restored.

## 2021-02-17

* Fixed the inline CSS helper.
* Updated some styles and the HTML template.

## 2021-02-16

* Get VSCode—intellisense mostly—and Rollup on the same page.

## 2021-02-06

* Fixed a minor bobble in `Serial`.

## 2021-02-05

* Fixed `clone()` so that it works as intended.  For realzies this time!
* Updated `clone()` to handle `ArrayBuffer`, `DataView`, and typed array objects.
* Disallow the core document elements in `stringFrom()`.
* Updated the ESLint config.

## 2021-02-04

* Damn lies.  ~~Fixed `clone()` so that it actually works as intended.~~
* Ported recent `<svg>` tags fix from v2.

## 2021-02-03

* `WebStorageAdapter` cleanup.  Finally able to tidy the `QuotaExceededError` code.
* `String` API changes:
	* `String.format()` refactored a bit.  Is it still useful?
	* `String.outdent` and `String.oneline` template string tag functions added.
* Utils functions API changes:
	* `assert()` refactored.
	* `exceptionFrom()` refactored.

## 2021-02-02

* Various cleanup.

## 2021-02-01

* Reference integrity and circular references are now supported when cloning and serializing.
* Utils functions API changes: `clone()` refactored.
* `PRNGWrapper` API removed; code migrated into `State`.
* `Serial` API added.
* Updated vendored libraries and added `flatted`.

## 2021-01-31

* Removed the `<<back>>` and `<<return>>` macros.
* All of the various visit*ed* (past-tense) APIs no longer count the current turn.
* User functions API changes: `visited()` → `visits()`.
* `DebugBar` API changes: `DebugBar.start()` → `DebugBar.finalize()`.
* `Dialog` API changes: `Dialog.finalize()` added.
* `L10n` API changes: `L10n` → `I18n`.
* ~~`I18n` API changes: `I18n.get()` → `I18n()`.~~
* `UIBar` API changes: `UIBar.start()` → `UIBar.finalize()`.
* `State` API changes:
	* `State.hasPlayed()` → `State.hasVisited()`.
	* `State.previous` added (oops).
	* `State.visited` → `State.visits`.
* Various cleanup.

## 2021-01-30

* Removed the `Db` API cookie adapter.
* Removed the Autoload dialog.
* Removed the story history and supporting code.  To compensate, multiple auto saves are now available.
* Removed Twine 1 compatibility and builds.
* Reworked the `Save` API and Saves dialog.
* Rework of the `Passage` and `Story` APIs.
* Rework of the `State` API.
* User functions API changes: `lastVisited()` removed.
* `Config` API changes:
	* `Config.history.maxStates` removed.
	* `Config.passages.descriptions` → `Config.saves.descriptions`; acceptable value changed to *function*.
	* `Config.saves.maxAutoSaves` added.
	* `Config.saves.slots` → `Config.saves.maxSlotSaves`.
	* `Config.ui.historyControls` removed.
* Various cleanup.
* Very basic *idea* for a main menu system laid.

## 2021-01-26

* Removed the Jump To menu.
* Ported recent changes from v2.

## 2020-12-04

* Updated browser support target to ES2020.

## 2020-12-01

* Updated browser support target to ES2018.  I *may* decide to bump it to ES2020 in the future.

## 2020-11-30

* Updated browser support target.
* Updated development dependencies and vendored libraries.
* Ported recent changes from v2.

## 2020-11-10

* Internal cleanup.
* Updated development dependencies.
* Ported recent changes from v2.

## 2020-08-02

* Added the `-webkit-touch-callout: none` property to various link/button element styles.
* Added the `role="alert"` content attribute to the Alert dialog.

## 2020-08-01

* `Config` API changes: `Config.startup.loadDelay` → `Config.startup.delay`.

## 2020-07-31

* Ported recent changes from v2.

## 2020-07-30

* `Config` API changes: `Config.macros.maxLoopIterations` → `Config.macros.forMaxIterations`.
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

* `Config` API changes: `Config.loadDelay` → `Config.startup.loadDelay`.

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
* `Config` API changes:
	* `Config.history.controls` → `Config.ui.historyControls`.
	* `Config.history.maxStates` acceptable value changed to *integer in the range 1–100*.  History lengths >100, incl. infinite, are no longer allowed.
	* `Config.passages.displayTitles` removed.
	* `Config.passages.start` → `Config.navigation.start`.
	* `Config.passages.transitionOut` → `Config.navigation.transitionOut`.
* Macro parser changes:
	* In addition to their `this` being set, handlers are now passed the `MacroContext` instance and processed arguments of the main tag as parameters.
* `Passage` instance API changes:
	* `<Passage>.processText()` → `<Passage>.text`.
	* `<Passage>.text` → `<Passage>.source`.
* `State` API changes: `State.active` removed.
* Task objects API changes: all task objects removed.
* `Util` API changes:
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
* `Wikifier` API changes:
	* `Wikifier.createExternalLink()` → `createExternalLink()`.
	* `Wikifier.createInternalLink()` → `createLink()`.
	* `Wikifier.isExternalLink()` → `isExternalLink()`.
* ***Lots*** of internal changes.
