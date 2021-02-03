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
import I18n from './i18n/i18n';
import Save from './save';
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
		if (BUILD_DEBUG) { console.log(`[UI/assembleLinkList(passage: "${passage}", listEl: …)]`, listEl); }

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

	function mainMenu() {
		// if (Story.has('StoryMenu')) {
		// 	// TODO: Display `StoryMenu` passage here.

		// 	return;
		// }

		Engine.play(Config.navigation.start);

		// TODO: Display default story menu here.

		// // If there was no active session available, attempt to auto load the auto save.
		// // Failing that, play the starting passage.
		// return new Promise(resolve => {
		// 	const autoLoadType = typeof Config.saves.autoLoad;
		//
		// 	if (
		// 		autoLoadType === 'boolean' && Config.saves.autoLoad ||
		// 		autoLoadType === 'function' && Config.saves.autoLoad()
		// 	) {
		// 		if (BUILD_DEBUG) { console.log('\tattempting auto load'); }
		//
		// 		Save.browser.auto.continue()
		// 			.then(
		// 				loaded => resolve(loaded ? !engineShow() : true),
		// 				ex => {
		// 					UI.alert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`);
		// 					resolve(true);
		// 				}
		// 			);
		// 	}
		// 	else {
		// 		resolve(true);
		// 	}
		// })
		// 	.then(playStart => {
		// 		if (playStart) {
		// 			if (BUILD_DEBUG) { console.log(`\tstarting passage: "${Config.navigation.start}"`); }
		//
		// 			enginePlay(Config.navigation.start);
		// 		}
		// 	});
	}


	/*******************************************************************************
		UI Functions, Built-in Dialogs.
	*******************************************************************************/

	function openAlert(message, ...args) {
		Dialog
			.setup(I18n.get('alertTitle'), 'alert')
			.append(
				  `<p role="alert">${message}</p><ul class="buttons">`
				+ `<li><button id="alert-ok" class="ui-close">${I18n.get(['alertOk', 'ok'])}</button></li>`
				+ '</ul>'
			)
			.open(...args);
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

	// function buildAutoload() {
	// 	if (BUILD_DEBUG) { console.log('[UI/buildAutoload()]'); }
	//
	// 	Dialog
	// 		.setup(I18n.get('autoLoadTitle'), 'auto load')
	// 		.append(
	// 			/* eslint-disable max-len */
	// 			  `<p>${I18n.get('autoLoadPrompt')}</p><ul class="buttons">`
	// 			+ `<li><button id="autoload-ok" class="ui-close">${I18n.get(['autoLoadOk', 'ok'])}</button></li>`
	// 			+ `<li><button id="autoload-cancel" class="ui-close">${I18n.get(['autoLoadCancel', 'cancel'])}</button></li>`
	// 			+ '</ul>'
	// 			/* eslint-enable max-len */
	// 		);
	//
	// 	// Add an additional delegated click handler for the `.ui-close` elements to handle auto loading.
	// 	jQuery(document).one('click.autoload', '.ui-close', ev => {
	// 		const isAutoLoadOk = ev.target.id === 'autoload-ok';
	// 		jQuery(document).one(':dialogclosed', () => {
	// 			if (BUILD_DEBUG) { console.log('\tattempting auto load'); }
	//
	// 			if (!isAutoLoadOk) {
	// 				Engine.play(Config.navigation.start);
	// 			}
	// 			else {
	// 				Save.browser.auto.continue()
	// 					.then(
	// 						loaded => loaded ? !Engine.show() : true,
	// 						ex => {
	// 							openAlert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`);
	// 							return true;
	// 						}
	// 					)
	// 					.then(playStart => {
	// 						if (playStart) {
	// 							if (BUILD_DEBUG) { console.log(`\tstarting passage: "${Config.navigation.start}"`); }
	//
	// 							Engine.play(Config.navigation.start);
	// 						}
	// 					});
	// 			}
	// 		});
	// 	});
	//
	// 	return true;
	// }

	function buildRestart() {
		if (BUILD_DEBUG) { console.log('[UI/buildRestart()]'); }

		Dialog
			.setup(I18n.get('restartTitle'), 'restart')
			.append(
				/* eslint-disable max-len */
				  `<p>${I18n.get('restartPrompt')}</p><ul class="buttons">`
				+ `<li><button id="restart-ok">${I18n.get(['restartOk', 'ok'])}</button></li>`
				+ `<li><button id="restart-cancel" class="ui-close">${I18n.get(['restartCancel', 'cancel'])}</button></li>`
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
			function createButtonItem(elId, elClass, elLabel, saveId, elAction) {
				const $btn = jQuery(document.createElement('button'))
					.attr('id', `saves-${elId}-${saveId}`);

				if (elClass) {
					$btn.addClass(elClass);
				}

				if (elAction) {
					$btn.ariaClick({
						label : `${elLabel} ${saveId + 1}`
					}, () => {
						try {
							elAction(saveId);
						}
						catch (ex) {
							showAlert(ex.message);
						}
					});
				}
				else {
					$btn.ariaDisabled(true);
				}

				return jQuery(document.createElement('li'))
					.append($btn);
			}

			// const saves = Save.get();
			const $list = jQuery(document.createElement('ol'))
				.attr('id', 'saves-list');

			const autoManifests = Save.browser.auto.manifests();

			for (let i = 0, length = autoManifests.length; i < length; ++i) {
				const { id, manifest } = autoManifests[i];

				const $desc = jQuery(document.createElement('div'));
				const $btns = jQuery(document.createElement('ul'))
					.addClass('buttons');

				if (manifest) {
					// Add the description (title and datestamp).
					jQuery(document.createElement('div'))
						.html(manifest.desc)
						.appendTo($desc);
					jQuery(document.createElement('div'))
						.addClass('details')
						// .text(`${I18n.get('savesLabelAuto')}\u00a0\u00a0\u2022\u00a0\u00a0`)
						.text(`${I18n.get('savesLabelAuto')}\u00a0${id + 1}\u00a0\u00a0\u2022\u00a0\u00a0`)
						.append(
							manifest.date
								? `${new Date(manifest.date).toLocaleString()}`
								: `<em>${I18n.get('savesUnknownDate')}</em>`
						)
						.appendTo($desc);

					// Add the load button.
					$btns.append(
						createButtonItem('auto-load', 'load ui-close', `${I18n.get('savesLabelLoad')} ${I18n.get('savesLabelAuto')}`, id, id => {
							jQuery(document).one(':dialogclosed', () => {
								Save.browser.auto.load(id)
									.then(
										Engine.show,
										ex => showAlert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`)
									);
							});
						})
					);

					// Add the delete button.
					$btns.append(
						createButtonItem('auto-delete', 'delete', `${I18n.get('savesLabelDelete')} ${I18n.get('savesLabelAuto')}`, id, id => {
							Save.browser.auto.delete(id);
							buildSaves();
						})
					);
				}
				else {
					// Add the description.
					$desc.addClass('empty');

					// Add the disabled load button.
					$btns.append(
						createButtonItem('auto-load', 'load', `${I18n.get('savesLabelLoad')} ${I18n.get('savesLabelAuto')}`, id)
					);

					// Add the disabled delete button.
					$btns.append(
						createButtonItem('auto-delete', 'delete', `${I18n.get('savesLabelDelete')} ${I18n.get('savesLabelAuto')}`, id)
					);
				}

				jQuery(document.createElement('li'))
					.append($desc)
					.append($btns)
					.appendTo($list);
			}

			const slotManifests = Save.browser.slot.manifests()
				.reduce((acc, { id, manifest }) => {
					acc[id] = manifest; // eslint-disable-line no-param-reassign
					return acc;
				}, []);

			for (
				let i = 0, length = Math.max(slotManifests.length, Config.saves.maxSlotSaves);
				i < length;
				++i
			) {
				const manifest = slotManifests[i];

				if (!manifest && i >= Config.saves.maxSlotSaves) { continue; }

				const $desc = jQuery(document.createElement('div'));
				const $btns = jQuery(document.createElement('ul'))
					.addClass('buttons');

				if (manifest) {
					// Add the description (title and datestamp).
					jQuery(document.createElement('div'))
						.html(manifest.desc)
						.appendTo($desc);
					jQuery(document.createElement('div'))
						.addClass('details')
						.text(`${I18n.get('savesLabelSlot')}\u00a0${i + 1}\u00a0\u00a0\u2022\u00a0\u00a0`)
						.append(
							manifest.date
								? `${new Date(manifest.date).toLocaleString()}`
								: `<em>${I18n.get('savesUnknownDate')}</em>`
						)
						.appendTo($desc);

					// Add the load button.
					$btns.append(
						createButtonItem('slot-load', 'load ui-close', `${I18n.get('savesLabelLoad')} ${I18n.get('savesLabelSlot')}`, i, id => {
							jQuery(document).one(':dialogclosed', () => {
								Save.browser.slot.load(id)
									.then(
										Engine.show,
										ex => showAlert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`)
									);
							});
						})
					);

					// Add the delete button.
					$btns.append(
						createButtonItem('slot-delete', 'delete', `${I18n.get('savesLabelDelete')} ${I18n.get('savesLabelSlot')}`, i, id => {
							Save.browser.slot.delete(id);
							buildSaves();
						})
					);
				}
				else if (i < Config.saves.maxSlotSaves) {
					// Add the description.
					$desc.addClass('empty');

					// TODO: This is for the player assigned save description.
					const saveDesc = 'TODO: Player assigned save desc here.';

					// Add the save button.
					$btns.append(
						createButtonItem(
							'slot-save',
							'save',
							`${I18n.get('savesLabelSave')} ${I18n.get('savesLabelSlot')}`,
							i,
							savesAllowed
								// If saving is allowed, add the save action.
								? id => {
									Save.browser.slot.save(id, saveDesc);
									buildSaves();
								}
								// Elsewise, disable the button.
								: null
						)
					);

					// Add the disabled delete button.
					$btns.append(
						createButtonItem('slot-delete', 'delete', `${I18n.get('savesLabelDelete')} ${I18n.get('savesLabelSlot')}`, i)
					);
				}

				jQuery(document.createElement('li'))
					.append($desc)
					.append($btns)
					.appendTo($list);
			}

			return jQuery(document.createElement('div'))
				.attr('id', 'saves-container')
				.append($list);
		}

		if (BUILD_DEBUG) { console.log('[UI/buildSaves()]'); }

		const browserEnabled = Save.browser.isEnabled();

		// Bail out if both saves and the file API are disabled/missing.
		if (!browserEnabled && !Has.fileAPI) {
			showAlert(I18n.get('warningNoSaves'));
			return false;
		}

		Dialog.setup(I18n.get('savesTitle'), 'saves');
		const $dialogBody = jQuery(Dialog.body());

		// Add slots header, list, and button list.
		if (browserEnabled) {
			jQuery(document.createElement('h2'))
				.text(I18n.get('savesHeaderBrowser'))
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
					I18n.get('savesLabelDiskExport'),
					() => Save.browser.export(`saves-export-${Story.name}`)
				));
				$slotButtons.append(createActionItem(
					'disk-import',
					null,
					I18n.get('savesLabelDiskImport'),
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
						Save.browser.import(ev)
							.then(
								buildSaves,
								ex => {
									Dialog.close();
									showAlert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`);
								}
							);
					})
					.appendTo($dialogBody);
			}

			// Add the slots clear button.
			$slotButtons.append(createActionItem(
				'clear',
				null,
				I18n.get('savesLabelClear'),
				Save.browser.auto.size() > 0 || Save.browser.slot.size() > 0
					? () => {
						Save.browser.clear();
						buildSaves();
					}
					: null
			));
		}

		// Add disk saves header and button list.
		if (Has.fileAPI) {
			jQuery(document.createElement('h2'))
				.text(I18n.get('savesHeaderDisk'))
				.appendTo($dialogBody);

			const $diskButtons = jQuery(document.createElement('ul'))
				.addClass('buttons disk')
				.appendTo($dialogBody);

			// Add the disk save/load buttons and the hidden `input[type=file]` element
			// that will be triggered by the `#saves-disk-load` button.
			$diskButtons.append(createActionItem(
				'disk-save',
				null,
				I18n.get('savesLabelDiskSave'),
				savesAllowed
					// If saving is allowed, add the save action.
					? () => Save.disk.save(Story.name)
					// Elsewise, disable the button.
					: null
			));
			$diskButtons.append(createActionItem(
				'disk-load',
				null,
				I18n.get('savesLabelDiskLoad'),
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
									showAlert(`${ex.message.toUpperFirst()}.</p><p>${I18n.get('aborting')}.`);
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

		Dialog.setup(I18n.get('settingsTitle'), 'settings');

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
							.text(I18n.get('settingsOn'));
					}
					else {
						$control
							.text(I18n.get('settingsOff'));
					}

					$control.ariaClick(function () {
						if (settings[name]) {
							jQuery(this)
								.removeClass('enabled')
								.text(I18n.get('settingsOff'));
							settings[name] = false;
						}
						else {
							jQuery(this)
								.addClass('enabled')
								.text(I18n.get('settingsOn'));
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
				+     `<li><button id="settings-ok" class="ui-close">${I18n.get(['settingsOk', 'ok'])}</button></li>`
				+     `<li><button id="settings-reset">${I18n.get('settingsReset')}</button></li>`
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
		mainMenu         : { value : mainMenu },

		// UI Functions, Built-in Dialogs.
		alert         : { value : openAlert },
		restart       : { value : openRestart },
		saves         : { value : openSaves },
		settings      : { value : openSettings },
		// buildAutoload : { value : buildAutoload },
		buildRestart  : { value : buildRestart },
		buildSaves    : { value : buildSaves },
		buildSettings : { value : buildSettings }
	}));
})();


/*
	Module Exports.
*/
export default UI;
