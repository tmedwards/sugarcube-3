/***********************************************************************************************************************

	ui.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Setting, { settings } from './setting';
import Config from './config';
import Dialog from './dialog';
import Engine from './engine';
import Has from './lib/has';
import L10n from './l10n/l10n';
import Save from './save';
import State from './state';
import Story from './story';
import Wikifier from './markup/wikifier';
import createSlug from './utils/createslug';
import { errorPrologRE } from './lib/alert';
import setDisplayTitle from './utils/setdisplaytitle';


/*
	UI API static object.
*/
const UI = (() => {
	/*******************************************************************************
		UI Functions, Core.
	*******************************************************************************/

	function assembleLinkList(passage, listEl) {
		console.log(`[UI/assembleLinkList(passage: "${passage}", listEl: …)]`, listEl);

		let list = listEl;

		if (list == null) { // lazy equality for null
			list = document.createElement('ul');
		}

		// Wikify the content of the given source passage into a fragment.
		const frag = document.createDocumentFragment();
		new Wikifier(frag, Story.get(passage).text.trim(), { noCleanup : true });

		// Gather the text of any error elements within the fragment…
		const errors = Array.from(frag.querySelectorAll('.error'))
			.map(errEl => errEl.textContent.replace(errorPrologRE, ''));

		// …and throw an exception, if there were any errors.
		if (errors.length > 0) {
			throw new Error(errors.join('; '));
		}

		// Create list items for <a> elements.
		jQuery(frag).find('a')
			.each((_, el) => {
				const li = document.createElement('li');
				list.appendChild(li);
				li.appendChild(el);
			});

		return list;
	}

	function init() {
		if (Story.has('StoryDisplayTitle')) {
			jQuery(document)
				.off('.ui')
				.on(':passagedisplay.ui', () => {
					if (!Config.ui.updateStoryElements) {
						setDisplayTitle(Story.get('StoryDisplayTitle').text);
					}
				});
		}
	}


	/*******************************************************************************
		UI Functions, Built-in Dialogs.
	*******************************************************************************/

	function openAlert(message, ...args) {
		Dialog
			.setup(L10n.get('alertTitle'), 'alert')
			.append(
				  `<p role="alert">${message}</p><ul class="buttons">`
				+ `<li><button id="alert-ok" class="ui-close">${L10n.get(['alertOk', 'ok'])}</button></li>`
				+ '</ul>'
			)
			.open(...args);
	}

	function openJumpto(...args) {
		buildJumpto();
		Dialog.open(...args);
	}

	function openRestart(...args) {
		buildRestart();
		Dialog.open(...args);
	}

	function openSaves(...args) {
		buildSaves();
		Dialog.open(...args);
	}

	function openSettings(...args) {
		buildSettings();
		Dialog.open(...args);
	}

	function buildAutoload() {
		if (BUILD_DEBUG) { console.log('[UI/buildAutoload()]'); }

		Dialog
			.setup(L10n.get('autoloadTitle'), 'autoload')
			.append(
				/* eslint-disable max-len */
				  `<p>${L10n.get('autoloadPrompt')}</p><ul class="buttons">`
				+ `<li><button id="autoload-ok" class="ui-close">${L10n.get(['autoloadOk', 'ok'])}</button></li>`
				+ `<li><button id="autoload-cancel" class="ui-close">${L10n.get(['autoloadCancel', 'cancel'])}</button></li>`
				+ '</ul>'
				/* eslint-enable max-len */
			);

		// Add an additional delegated click handler for the `.ui-close` elements to handle autoloading.
		jQuery(document).one('click.autoload', '.ui-close', ev => {
			const isAutoloadOk = ev.target.id === 'autoload-ok';
			jQuery(document).one(':dialogclosed', () => {
				if (BUILD_DEBUG) { console.log(`\tattempting autoload: "${Save.autosave.get().title}"`); }

				if (!isAutoloadOk) {
					Engine.play(Config.navigation.start);
				}
				else {
					Save.autosave.load()
						.then(
							loaded => loaded ? !Engine.show() : true,
							ex => {
								openAlert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`);
								return true;
							}
						)
						.then(playStart => {
							if (playStart) {
								if (BUILD_DEBUG) { console.log(`\tstarting passage: "${Config.navigation.start}"`); }

								Engine.play(Config.navigation.start);
							}
						});
				}
			});
		});

		return true;
	}

	function buildJumpto() {
		if (BUILD_DEBUG) { console.log('[UI/buildJumpto()]'); }

		const list = document.createElement('ul');

		Dialog
			.setup(L10n.get('jumptoTitle'), 'jumpto list')
			.append(list);

		const offset = 1 + State.expired.length;

		for (let i = State.size - 1; i >= 0; --i) {
			if (i === State.activeIndex) {
				continue;
			}

			const passage = Story.get(State.history[i].title);

			if (passage && passage.tags.includes('bookmark')) {
				jQuery(document.createElement('li'))
					.append(
						jQuery(document.createElement('a'))
							.ariaClick({ one : true }, (function (idx) {
								return () => jQuery(document).one(':dialogclosed', () => Engine.goTo(idx));
							})(i))
							.addClass('ui-close')
							.text(`${L10n.get('jumptoTurn')} ${offset + i}: ${passage.description()}`)
					)
					.appendTo(list);
			}
		}

		if (!list.hasChildNodes()) {
			jQuery(list).append(`<li><a><em>${L10n.get('jumptoUnavailable')}</em></a></li>`);
		}
	}

	function buildRestart() {
		if (BUILD_DEBUG) { console.log('[UI/buildRestart()]'); }

		Dialog
			.setup(L10n.get('restartTitle'), 'restart')
			.append(
				/* eslint-disable max-len */
				  `<p>${L10n.get('restartPrompt')}</p><ul class="buttons">`
				+ `<li><button id="restart-ok">${L10n.get(['restartOk', 'ok'])}</button></li>`
				+ `<li><button id="restart-cancel" class="ui-close">${L10n.get(['restartCancel', 'cancel'])}</button></li>`
				+ '</ul>'
				/* eslint-enable max-len */
			);
		jQuery(Dialog.body())
			.find('#restart-ok')
			// Instead of adding '.ui-close' to '#restart-ok' (to receive the use of the default
			// delegated dialog close handler), we set up a special case close handler here.  We
			// do this to ensure that the invocation of `Engine.restart()` happens after the dialog
			// has fully closed.  If we did not, then a race condition could occur, causing display
			// shenanigans.
			.ariaClick({ one : true }, () => {
				jQuery(document).one(':dialogclosed', () => Engine.restart());
				Dialog.close();
			});

		return true;
	}

	function buildSaves() {
		const savesAllowed = typeof Config.saves.isAllowed !== 'function' || Config.saves.isAllowed();

		function showAlert(message) {
			if (Dialog.isOpen()) {
				$(document).one(':dialogclosed', () => openAlert(message));
			}
			else {
				openAlert(message);
			}
		}

		function createActionItem(bId, bClass, bText, bAction) {
			const $btn = jQuery(document.createElement('button'))
				.attr('id', `saves-${bId}`)
				.html(bText);

			if (bClass) {
				$btn.addClass(bClass);
			}

			if (bAction) {
				$btn.ariaClick(bAction);
			}
			else {
				$btn.ariaDisabled(true);
			}

			return jQuery(document.createElement('li'))
				.append($btn);
		}

		function createSlotsList() {
			function createButtonItem(bId, bClass, bLabel, bSlot, bAction) {
				const $btn = jQuery(document.createElement('button'))
					.attr('id', `saves-${bId}-${bSlot}`)
					.addClass(bId);

				if (bClass) {
					$btn.addClass(bClass);
				}

				if (bAction) {
					if (bSlot === 'autosave') {
						$btn.ariaClick({
							label : `${bLabel} ${L10n.get('savesLabelAuto')}`
						}, () => {
							try {
								bAction();
							}
							catch (ex) {
								showAlert(ex.message);
							}
						});
					}
					else {
						$btn.ariaClick({
							label : `${bLabel} ${L10n.get('savesLabelSlot')} ${bSlot + 1}`
						}, () => {
							try {
								bAction(bSlot);
							}
							catch (ex) {
								showAlert(ex.message);
							}
						});
					}
				}
				else {
					$btn.ariaDisabled(true);
				}

				return jQuery(document.createElement('li'))
					.append($btn);
			}

			const saves = Save.get();
			const $list = jQuery(document.createElement('ol'))
				.attr('id', 'saves-list');

			if (Save.autosave.isEnabled()) {
				const save  = saves.autosave;
				const $desc = jQuery(document.createElement('div'));
				const $btns = jQuery(document.createElement('ul'))
					.addClass('buttons');

				if (save) {
					// Add the description (title and datestamp).
					jQuery(document.createElement('div'))
						.text(save.title)
						.appendTo($desc);
					jQuery(document.createElement('div'))
						.addClass('details')
						.text(`${L10n.get('savesLabelAuto')}\u00a0\u00a0\u2022\u00a0\u00a0`)
						.append(
							save.date
								? `${new Date(save.date).toLocaleString()}`
								: `<em>${L10n.get('savesUnknownDate')}</em>`
						)
						.appendTo($desc);

					// Add the load button.
					$btns.append(
						createButtonItem('load', 'ui-close', L10n.get('savesLabelLoad'), 'autosave', () => {
							jQuery(document).one(':dialogclosed', () => {
								Save.autosave.load()
									.then(
										Engine.show,
										ex => showAlert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`)
									);
							});
						})
					);

					// Add the delete button.
					$btns.append(
						createButtonItem('delete', null, L10n.get('savesLabelDelete'), 'autosave', () => {
							Save.autosave.delete();
							buildSaves();
						})
					);
				}
				else {
					// Add the description.
					$desc.addClass('empty');

					// Add the disabled load button.
					$btns.append(
						createButtonItem('load', null, L10n.get('savesLabelLoad'), 'autosave')
					);

					// Add the disabled delete button.
					$btns.append(
						createButtonItem('delete', null, L10n.get('savesLabelDelete'), 'autosave')
					);
				}

				jQuery(document.createElement('li'))
					.append($desc)
					.append($btns)
					.appendTo($list);
			}

			saves.slots.forEach((save, i) => {
				const $desc = jQuery(document.createElement('div'));
				const $btns = jQuery(document.createElement('ul'))
					.addClass('buttons');

				if (save) {
					// Add the description (title and datestamp).
					jQuery(document.createElement('div'))
						.text(save.title)
						.appendTo($desc);
					jQuery(document.createElement('div'))
						.addClass('details')
						.text(`${L10n.get('savesLabelSlot')}\u00a0${i + 1}\u00a0\u00a0\u2022\u00a0\u00a0`)
						.append(
							save.date
								? `${new Date(save.date).toLocaleString()}`
								: `<em>${L10n.get('savesUnknownDate')}</em>`
						)
						.appendTo($desc);

					// Add the load button.
					$btns.append(
						createButtonItem('load', 'ui-close', L10n.get('savesLabelLoad'), i, slot => {
							jQuery(document).one(':dialogclosed', () => {
								Save.slots.load(slot)
									.then(
										Engine.show,
										ex => showAlert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`)
									);
							});
						})
					);

					// Add the delete button.
					$btns.append(
						createButtonItem('delete', null, L10n.get('savesLabelDelete'), i, slot => {
							Save.slots.delete(slot);
							buildSaves();
						})
					);
				}
				else {
					// Add the description.
					$desc.addClass('empty');

					// Add the save button.
					$btns.append(
						createButtonItem(
							'save',
							null,
							L10n.get('savesLabelSave'),
							i,
							savesAllowed
								// If saving is allowed, add the save action.
								? slot => {
									Save.slots.save(slot, Story.get(State.passage).description());
									buildSaves();
								}
								// Elsewise, disable the button.
								: null
						)
					);

					// Add the disabled delete button.
					$btns.append(
						createButtonItem('delete', null, L10n.get('savesLabelDelete'), i)
					);
				}

				jQuery(document.createElement('li'))
					.append($desc)
					.append($btns)
					.appendTo($list);
			});

			return jQuery(document.createElement('div'))
				.attr('id', 'saves-container')
				.append($list);
		}

		if (BUILD_DEBUG) { console.log('[UI/buildSaves()]'); }

		const slotsEnabled = Save.isEnabled();

		// Bail out if both saves and the file API are disabled/missing.
		if (!slotsEnabled && !Has.fileAPI) {
			showAlert(L10n.get('warningNoSaves'));
			return false;
		}

		Dialog.setup(L10n.get('savesTitle'), 'saves');
		const $dialogBody = jQuery(Dialog.body());

		// Add slots header, list, and button list.
		if (slotsEnabled) {
			jQuery(document.createElement('h2'))
				.text(L10n.get('savesHeaderSlot'))
				.appendTo($dialogBody);

			$dialogBody.append(createSlotsList());

			const $slotButtons = jQuery(document.createElement('ul'))
				.addClass('buttons slots')
				.appendTo($dialogBody);

			if (Has.fileAPI) {
				// Add the slots export/import buttons and the hidden `input[type=file]` element
				// that will be triggered by the `#saves-disk-import` button.
				$slotButtons.append(createActionItem(
					'disk-export',
					null,
					L10n.get('savesLabelDiskExport'),
					() => Save.disk.export(`slots-${Story.domId}`)
				));
				$slotButtons.append(createActionItem(
					'disk-import',
					null,
					L10n.get('savesLabelDiskImport'),
					() => $dialogBody.find('#saves-disk-import-handler').trigger('click')
				));
				jQuery(document.createElement('input'))
					.css({
						display    : 'block',
						visibility : 'hidden',
						position   : 'fixed',
						left       : '-9999px',
						top        : '-9999px',
						width      : '1px',
						height     : '1px'
					})
					.attr({
						type          : 'file',
						id            : 'saves-disk-import-handler',
						tabindex      : -1,
						'aria-hidden' : true
					})
					.on('change', ev => {
						Save.disk.import(ev)
							.then(
								buildSaves,
								ex => {
									Dialog.close();
									showAlert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`);
								}
							);
					})
					.appendTo($dialogBody);
			}

			// Add the slots clear button.
			$slotButtons.append(createActionItem(
				'clear',
				null,
				L10n.get('savesLabelClear'),
				Save.autosave.has() || !Save.slots.isEmpty()
					? () => {
						Save.clear();
						buildSaves();
					}
					: null
			));
		}

		// Add disk saves header and button list.
		if (Has.fileAPI) {
			jQuery(document.createElement('h2'))
				.text(L10n.get('savesHeaderDisk'))
				.appendTo($dialogBody);

			const $diskButtons = jQuery(document.createElement('ul'))
				.addClass('buttons disk')
				.appendTo($dialogBody);

			// Add the disk save/load buttons and the hidden `input[type=file]` element
			// that will be triggered by the `#saves-disk-load` button.
			$diskButtons.append(createActionItem(
				'disk-save',
				null,
				L10n.get('savesLabelDiskSave'),
				savesAllowed
					// If saving is allowed, add the save action.
					? () => Save.disk.save(Story.domId)
					// Elsewise, disable the button.
					: null
			));
			$diskButtons.append(createActionItem(
				'disk-load',
				null,
				L10n.get('savesLabelDiskLoad'),
				() => $dialogBody.find('#saves-disk-load-handler').trigger('click')
			));
			jQuery(document.createElement('input'))
				.css({
					display    : 'block',
					visibility : 'hidden',
					position   : 'fixed',
					left       : '-9999px',
					top        : '-9999px',
					width      : '1px',
					height     : '1px'
				})
				.attr({
					type          : 'file',
					id            : 'saves-disk-load-handler',
					tabindex      : -1,
					'aria-hidden' : true
				})
				.on('change', ev => {
					jQuery(document).one(':dialogclosed', () => {
						Save.disk.load(ev)
							.then(
								Engine.show,
								ex => {
									Dialog.close();
									showAlert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`);
								}
							);
					});
					Dialog.close();
				})
				.appendTo($dialogBody);
		}

		return true;
	}

	function buildSettings() {
		if (BUILD_DEBUG) { console.log('[UI/buildSettings()]'); }

		Dialog.setup(L10n.get('settingsTitle'), 'settings');

		const $dialogBody = jQuery(Dialog.body());

		Setting.forEach(control => {
			if (control.type === Setting.Types.Header) {
				const name     = control.name;
				const id       = createSlug(name);
				const $header  = jQuery(document.createElement('div'));
				const $heading = jQuery(document.createElement('h2'));

				$header
					.attr('id', `header-body-${id}`)
					.append($heading)
					.appendTo($dialogBody);
				$heading
					.attr('id', `header-heading-${id}`)
					.wiki(name);

				// Set up the description, if any.
				if (control.desc) {
					jQuery(document.createElement('p'))
						.attr('id', `header-desc-${id}`)
						.wiki(control.desc)
						.appendTo($header);
				}

				return;
			}

			const name        = control.name;
			const id          = createSlug(name);
			const $setting    = jQuery(document.createElement('div'));
			const $label      = jQuery(document.createElement('label'));
			const $controlBox = jQuery(document.createElement('div'));
			let $control;

			// Set up the label+control wrapper.
			jQuery(document.createElement('div'))
				.append($label)
				.append($controlBox)
				.appendTo($setting);

			// Set up the description, if any.
			if (control.desc) {
				jQuery(document.createElement('p'))
					.attr('id', `setting-desc-${id}`)
					.wiki(control.desc)
					.appendTo($setting);
			}

			// Set up the label.
			$label
				.attr({
					id  : `setting-label-${id}`,
					for : `setting-control-${id}` // must be in sync with $control's ID (see below)
				})
				.wiki(control.label);

			// Set up the control.
			if (settings[name] == null) { // lazy equality for null
				settings[name] = control.default;
			}

			switch (control.type) {
				case Setting.Types.Toggle:
					$control = jQuery(document.createElement('button'));

					if (settings[name]) {
						$control
							.addClass('enabled')
							.text(L10n.get('settingsOn'));
					}
					else {
						$control
							.text(L10n.get('settingsOff'));
					}

					$control.ariaClick(function () {
						if (settings[name]) {
							jQuery(this)
								.removeClass('enabled')
								.text(L10n.get('settingsOff'));
							settings[name] = false;
						}
						else {
							jQuery(this)
								.addClass('enabled')
								.text(L10n.get('settingsOn'));
							settings[name] = true;
						}

						Setting.save();

						if (control.hasOwnProperty('onChange')) {
							control.onChange.call({
								name,
								value   : settings[name],
								default : control.default
							});
						}
					});
					break;

				case Setting.Types.List:
					$control = jQuery(document.createElement('select'));

					for (let i = 0, iend = control.list.length; i < iend; ++i) {
						jQuery(document.createElement('option'))
							.val(i)
							.text(control.list[i])
							.appendTo($control);
					}

					$control
						.val(control.list.indexOf(settings[name]))
						.attr('tabindex', 0)
						.on('change', function () {
							settings[name] = control.list[Number(this.value)];
							Setting.save();

							if (control.hasOwnProperty('onChange')) {
								control.onChange.call({
									name,
									value   : settings[name],
									default : control.default,
									list    : control.list
								});
							}
						});
					break;

				case Setting.Types.Range:
					$control = jQuery(document.createElement('input'));

					// NOTE: Setting the value with `<jQuery>.val()` can cause odd behavior
					// in Edge if it's called before the type is set, so we use the `value`
					// content attribute here to dodge the entire issue.
					$control
						.attr({
							type     : 'range',
							min      : control.min,
							max      : control.max,
							step     : control.step,
							value    : settings[name],
							tabindex : 0
						})
						.on('change input', function () {
							settings[name] = Number(this.value);
							Setting.save();

							if (control.hasOwnProperty('onChange')) {
								control.onChange.call({
									name,
									value   : settings[name],
									default : control.default,
									min     : control.min,
									max     : control.max,
									step    : control.step
								});
							}
						})
						.on('keypress', ev => {
							if (ev.which === 13 /* Enter/Return */) {
								ev.preventDefault();
								$control.trigger('change');
							}
						});
					break;
			}

			$control
				.attr('id', `setting-control-${id}`)
				.appendTo($controlBox);

			$setting
				.attr('id', `setting-body-${id}`)
				.appendTo($dialogBody);
		});

		// Add the button bar.
		$dialogBody
			.append(
				  '<ul class="buttons">'
				+     `<li><button id="settings-ok" class="ui-close">${L10n.get(['settingsOk', 'ok'])}</button></li>`
				+     `<li><button id="settings-reset">${L10n.get('settingsReset')}</button></li>`
				+ '</ul>'
			)
			.find('#settings-reset')
			// Instead of adding '.ui-close' to '#settings-reset' (to receive the use of the default
			// delegated dialog close handler), we set up a special case close handler here.  We
			// do this to ensure that the invocation of `window.location.reload()` happens after the
			// dialog has fully closed.  If we did not, then a race condition could occur, causing
			// display shenanigans.
			.ariaClick({ one : true }, () => {
				jQuery(document).one(':dialogclosed', () => {
					Setting.reset();
					window.location.reload();
				});
				Dialog.close();
			});

		return true;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// UI Functions, Core.
		assembleLinkList : { value : assembleLinkList },
		init             : { value : init },

		// UI Functions, Built-in Dialogs.
		alert         : { value : openAlert },
		jumpto        : { value : openJumpto },
		restart       : { value : openRestart },
		saves         : { value : openSaves },
		settings      : { value : openSettings },
		buildAutoload : { value : buildAutoload },
		buildJumpto   : { value : buildJumpto },
		buildRestart  : { value : buildRestart },
		buildSaves    : { value : buildSaves },
		buildSettings : { value : buildSettings }
	}));
})();


/*
	Module Exports.
*/
export default UI;
