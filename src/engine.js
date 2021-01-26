/***********************************************************************************************************************

	engine.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Alert from './lib/alert';
import Config from './config';
import DebugView from './lib/debugview';
import Dialog from './dialog';
import Has from './lib/has';
import L10n from './l10n/l10n';
import LoadScreen from './loadscreen';
import { MIN_DOM_ACTION_DELAY } from './constants';
import Save from './save';
import State from './state';
import Story from './story';
import StyleWrapper from './lib/stylewrapper';
import UI from './ui';
import Wikifier from './markup/wikifier';
import getTypeOf from './utils/gettypeof';
import mappingFrom from './utils/mappingfrom';
import now from './utils/now';


/*
	Engine API static object.
*/
const Engine = (() => {
	// Engine state types object (pseudo-enumeration).
	const States = mappingFrom({
		Init      : 'init',
		Idle      : 'idle',
		Playing   : 'playing',
		Rendering : 'rendering'
	});

	// Current state of the engine.
	let state = States.Init;

	// Last time `enginePlay()` was called (in milliseconds).
	let lastPlay = null;

	// Cache of the debug view for the StoryInit special passage.
	let storyInitDebugView = null;

	// Cache of the outline patching <style> element (`StyleWrapper`-wrapped).
	let outlinePatch = null;

	// List of objects describing `StoryInterface` elements to update via passages during navigation.
	let updateList = null;


	/*******************************************************************************
		Engine Functions.
	*******************************************************************************/

	/*
		Initialize the core story elements and perform some bookkeeping.
	*/
	function engineInit() {
		if (BUILD_DEBUG) { console.log('[Engine/engineInit()]'); }

		// Generate the core story elements and insert them into the page before the store area.
		(() => {
			const $elems = jQuery(document.createDocumentFragment());
			const markup = Story.has('StoryInterface') && Story.get('StoryInterface').source.trim();

			if (markup) {
				// Remove the core display area styles.
				jQuery(document.head).find('#style-core-display').remove();

				$elems.append(markup);

				if ($elems.find('#passages').length === 0) {
					throw new Error('no element with ID "passages" found within "StoryInterface" special passage');
				}

				const updating = [];

				$elems.find('[data-passage]').each((i, el) => {
					if (el.id === 'passages') {
						throw new Error(`"StoryInterface" element <${el.nodeName.toLowerCase()} id="passages"> must not contain a "data-passage" content attribute`);
					}

					const passage = el.getAttribute('data-passage').trim();

					if (el.firstElementChild !== null) {
						throw new Error(`"StoryInterface" element <${el.nodeName.toLowerCase()} data-passage="${passage}"> contains child elements`);
					}

					if (Story.has(passage)) {
						updating.push({
							passage,
							element : el
						});
					}
				});

				if (updating.length > 0) {
					updateList = updating;
				}

				Config.ui.updateStoryElements = false;
			}
			else {
				$elems.append('<div id="story" role="main"><div id="passages"></div></div>');
			}

			// Insert the core UI elements into the page before the main script.
			$elems.insertBefore('body>script#script-sugarcube');
		})();

		// Generate and cache the ARIA outlines <style> element (`StyleWrapper`-wrapped)
		// and set up the handler to manipulate the outlines.
		//
		// IDEA: http://www.paciellogroup.com/blog/2012/04/how-to-remove-css-outlines-in-an-accessible-manner/
		outlinePatch = new StyleWrapper((
			() => jQuery(document.createElement('style'))
				.attr({
					id   : 'style-aria-outlines',
					type : 'text/css'
				})
				.appendTo(document.head)
				.get(0) // return the <style> element itself
		)());
		hideOutlines(); // initially hide outlines
		let lastOutlineEvent;
		jQuery(document).on(
			'mousedown.aria-outlines keydown.aria-outlines',
			ev => {
				if (ev.type !== lastOutlineEvent) {
					lastOutlineEvent = ev.type;

					if (ev.type === 'keydown') {
						showOutlines();
					}
					else {
						hideOutlines();
					}
				}
			}
		);
	}

	/*
		Pre-starts the story.

		TODO: That is a stupid description.  Fix it.
	*/
	function enginePrestart() {
		if (BUILD_DEBUG) { console.log('[Engine/enginePrestart()]'); }

		// Execute the StoryInit special passage.
		if (Story.has('StoryInit')) {
			try {
				const debugBuffer = Wikifier.wikifyEval(Story.get('StoryInit').source);

				if (Config.debug) {
					const debugView = new DebugView(
						document.createDocumentFragment(),
						'special',
						'StoryInit',
						'StoryInit'
					);
					debugView.modes({ hidden : true });
					debugView.append(debugBuffer);
					storyInitDebugView = debugView.output;
				}
			}
			catch (ex) {
				Alert.error('StoryInit', ex);
			}
		}

		// Sanity checks.
		if (Config.navigation.start == null) { // lazy equality for null
			throw new Error('starting passage not selected');
		}
		if (!Story.has(Config.navigation.start)) {
			throw new Error(`starting passage ("${Config.navigation.start}") not found`);
		}
	}

	/*
		Starts the story.
	*/
	function engineStart() {
		if (BUILD_DEBUG) { console.log('[Engine/engineStart()]'); }

		// Focus the document element initially.
		jQuery(document.documentElement).focus();

		// Update the engine state.
		state = States.Idle;

		// Attempt to restore an active session.
		if (State.restore()) {
			engineShow();
			return Promise.resolve();
		}

		// If there was no active session available, attempt to autoload the autosave.
		// Failing that, play the starting passage.
		return new Promise(resolve => {
			const autoloadType = typeof Config.saves.autoload;

			if (
				autoloadType === 'boolean' && Config.saves.autoload
				|| autoloadType === 'function' && Config.saves.autoload()
			) {
				if (BUILD_DEBUG) { console.log(`\tattempting autoload: "${Save.autosave.get().title}"`); }

				Save.autosave.load()
					.then(
						loaded => resolve(loaded ? !engineShow() : true),
						ex => {
							UI.alert(`${ex.message.toUpperFirst()}.</p><p>${L10n.get('aborting')}.`);
							resolve(true);
						}
					);
			}
			else if (autoloadType === 'string' && Config.saves.autoload === 'prompt') {
				UI.buildAutoload();
				Dialog.open();
				resolve(false);
			}
			else {
				resolve(true);
			}
		})
			.then(playStart => {
				if (playStart) {
					if (BUILD_DEBUG) { console.log(`\tstarting passage: "${Config.navigation.start}"`); }

					enginePlay(Config.navigation.start);
				}
			});
	}

	/*
		Restarts the story.
	*/
	function engineRestart() {
		if (BUILD_DEBUG) { console.log('[Engine/engineRestart()]'); }

		// Show the loading screen to hide any unsightly rendering shenanigans during
		// the page reload.
		LoadScreen.show();

		// Scroll the window to the top.
		//
		// This is required by most browsers for the starting passage or it will
		// remain at whatever its current scroll position is after the page reload.
		// We do it generally, rather than only for the currently set starting passage,
		// since the starting passage may be dynamically manipulated.
		window.scroll(0, 0);

		// Delete the active session.
		State.reset();

		// Trigger an ':enginerestart' event.
		jQuery.event.trigger(':enginerestart');

		// Reload the page.
		window.location.reload();
	}

	/*
		Returns the current state of the engine.
	*/
	function engineState() {
		return state;
	}

	/*
		Returns whether the engine is idle.
	*/
	function engineIsIdle() {
		return state === States.Idle;
	}

	/*
		Returns whether the engine is playing.
	*/
	function engineIsPlaying() {
		return state === States.Playing || state === States.Rendering;
	}

	/*
		Returns whether the engine is rendering.
	*/
	function engineIsRendering() {
		return state === States.Rendering;
	}

	/*
		Returns a timestamp representing the last time `Engine.play()` was called.
	*/
	function engineLastPlay() {
		return lastPlay;
	}

	/*
		Activate the moment at the given index within the state history and show it.
	*/
	function engineGoTo(idx) {
		const succeded = State.goTo(idx);

		if (succeded) {
			engineShow();
		}

		return succeded;
	}

	/*
		Activate the moment at the given offset from the active moment within the
		state history and show it.
	*/
	function engineGo(offset) {
		const succeded = State.go(offset);

		if (succeded) {
			engineShow();
		}

		return succeded;
	}

	/*
		Go to the moment which directly precedes the active moment and show it.
	*/
	function engineBackward() {
		return engineGo(-1);
	}

	/*
		Go to the moment which directly follows the active moment and show it.
	*/
	function engineForward() {
		return engineGo(1);
	}

	/*
		Renders and displays the active (present) moment's associated passage without
		adding a new moment to the history.
	*/
	function engineShow() {
		return enginePlay(State.passage, true);
	}

	/*
		Renders and displays the passage referenced by the given title, optionally
		without adding a new moment to the history.
	*/
	function enginePlay(title, noHistory) {
		if (state === States.Init) {
			return false;
		}

		if (BUILD_DEBUG) { console.log(`[Engine/enginePlay(title: "${title}", noHistory: ${noHistory})]`); }

		let passageTitle = title;

		// Update the engine state.
		state = States.Playing;

		// Reset the temporary variables and state.
		State.clearTemporary();
		Wikifier.clearTemporary();

		// Debug view setup.
		let passageReadyOutput;
		let passageDoneOutput;

		// Execute the navigation override callback.
		if (typeof Config.navigation.override === 'function') {
			try {
				const overrideTitle = Config.navigation.override(passageTitle);

				if (overrideTitle) {
					passageTitle = overrideTitle;
				}
			}
			catch (ex) { /* no-op */ }
		}

		// Retrieve the passage by the given title.
		//
		// NOTE: The values of the `title` parameter and `passageTitle` variable
		// may be empty, strings, or numbers (though using a number as reference
		// to a numeric title should be discouraged), so after loading the passage,
		// always refer to `passage.title` and never to the others.
		const passage = Story.get(passageTitle);

		// Trigger `:passageinit` events.
		jQuery.event.trigger({
			type : ':passageinit',
			passage
		});

		// Create a new entry in the history.
		if (!noHistory) {
			State.create(passage.title);
		}

		// Update the last play time.
		//
		// NOTE: This is mostly for event, task, and special passage code,
		// though the likelihood of it being needed this early is low.  This
		// will be updated again later at the end.
		lastPlay = now();

		// Render the `PassageReady` passage, if it exists.
		if (Story.has('PassageReady')) {
			try {
				passageReadyOutput = Wikifier.wikifyEval(Story.get('PassageReady').source);
			}
			catch (ex) {
				Alert.error('PassageReady', ex);
			}
		}

		// Update the engine state.
		state = States.Rendering;

		// Get the passage's tags as a string, or `null` if there aren't any.
		const dataTags = passage.tags.length > 0 ? passage.tags.join(' ') : null;

		// Create and set up the incoming passage element.
		const passageEl = document.createElement('div');
		jQuery(passageEl)
			.attr({
				id             : passage.domId,
				'data-passage' : passage.title,
				'data-tags'    : dataTags
			})
			.addClass(`passage ${passage.className}`);

		// Add the passage's tags to the document element and body.
		//
		// QUESTION: Should we only add `data-tags` to the document element?
		jQuery([document.documentElement, document.body])
			.attr('data-tags', dataTags);

		// Trigger `:passagestart` events.
		jQuery.event.trigger({
			type    : ':passagestart',
			content : passageEl,
			passage
		});

		// Render the `PassageHeader` passage, if it exists, into the passage element.
		if (Story.has('PassageHeader')) {
			new Wikifier(passageEl, Story.get('PassageHeader').text);
		}

		// Render the passage into its element.
		passageEl.appendChild(passage.render());

		// Render the `PassageFooter` passage, if it exists, into the passage element.
		if (Story.has('PassageFooter')) {
			new Wikifier(passageEl, Story.get('PassageFooter').text);
		}

		// Trigger `:passagerender` events.
		jQuery.event.trigger({
			type    : ':passagerender',
			content : passageEl,
			passage
		});

		// Cache the passage container.
		const containerEl = document.getElementById('passages');

		// Empty the passage container.
		if (containerEl.hasChildNodes()) {
			if (
				typeof Config.navigation.transitionOut === 'number'
				|| typeof Config.navigation.transitionOut === 'string' && Has.transitionEndEvent
			) {
				Array.from(containerEl.childNodes).forEach(outgoing => {
					const $outgoing = jQuery(outgoing);

					if (outgoing.nodeType === Node.ELEMENT_NODE && $outgoing.hasClass('passage')) {
						if ($outgoing.hasClass('passage-out')) {
							return;
						}

						$outgoing
							.attr('id', `out-${$outgoing.attr('id')}`)
							.addClass('passage-out');

						if (typeof Config.navigation.transitionOut === 'string') {
							$outgoing.on(Has.transitionEndEvent, ev => {
								if (ev.originalEvent.propertyName === Config.navigation.transitionOut) {
									$outgoing.remove();
								}
							});
						}
						else {
							setTimeout(
								() => $outgoing.remove(),
								Math.max(MIN_DOM_ACTION_DELAY, Config.navigation.transitionOut)
							);
						}
					}
					else {
						$outgoing.remove();
					}
				});
			}
			else {
				jQuery(containerEl).empty();
			}
		}

		// Append the passage element to the passage container and set up its transition.
		jQuery(passageEl)
			.addClass('passage-in')
			.appendTo(containerEl);
		setTimeout(() => jQuery(passageEl).removeClass('passage-in'), MIN_DOM_ACTION_DELAY);

		// Scroll the window to the top.
		window.scroll(0, 0);

		// Update the engine state.
		state = States.Playing;

		// Render the `PassageDone` passage, if it exists.
		if (Story.has('PassageDone')) {
			try {
				passageDoneOutput = Wikifier.wikifyEval(Story.get('PassageDone').source);
			}
			catch (ex) {
				Alert.error('PassageDone', ex);
			}
		}

		// Trigger `:passagedisplay` events.
		jQuery.event.trigger({
			type    : ':passagedisplay',
			content : passageEl,
			passage
		});

		// Update the other interface elements, if necessary.
		if (updateList !== null) {
			updateList.forEach(pair => {
				jQuery(pair.element).empty();
				new Wikifier(pair.element, Story.get(pair.passage).text.trim());
			});
		}

		// Add the completed debug views for `StoryInit`, `PassageReady`, and `PassageDone`
		// to the incoming passage element.
		if (Config.debug) {
			let debugView;

			// Prepend the `PassageReady` debug view.
			if (passageReadyOutput != null) { // lazy equality for null
				debugView = new DebugView(
					document.createDocumentFragment(),
					'special',
					'PassageReady',
					'PassageReady'
				);
				debugView.modes({ hidden : true });
				debugView.append(passageReadyOutput);
				jQuery(passageEl).prepend(debugView.output);
			}

			// Append the `PassageDone` debug view.
			if (passageDoneOutput != null) { // lazy equality for null
				debugView = new DebugView(
					document.createDocumentFragment(),
					'special',
					'PassageDone',
					'PassageDone'
				);
				debugView.modes({ hidden : true });
				debugView.append(passageDoneOutput);
				jQuery(passageEl).append(debugView.output);
			}

			// Prepend the cached `StoryInit` debug view, if we're showing the first moment/turn.
			if (State.turns === 1 && storyInitDebugView != null) { // lazy equality for null
				jQuery(passageEl).prepend(storyInitDebugView);
			}
		}

		// Last second post-processing for accessibility and other things.
		jQuery('#story')
			// Add `link-external` to all `href` bearing `<a>` elements which don't have it.
			.find('a[href]:not(.link-external)')
			.addClass('link-external')
			.end()
			// Add `tabindex=0` to all interactive elements which don't have it.
			.find('a,link,button,input,select,textarea')
			.not('[tabindex]')
			.attr('tabindex', 0);

		// Handle autosaves.
		const autosaveType = getTypeOf(Config.saves.autosave);

		if (
			autosaveType === 'boolean' && Config.saves.autosave
			|| autosaveType === 'Array' && passage.tags.some(tag => Config.saves.autosave.includes(tag))
			|| autosaveType === 'function' && Config.saves.autosave()
		) {
			Save.autosave.save(Story.get(State.passage).description());
		}

		// Trigger `:passageend` events.
		jQuery.event.trigger({
			type    : ':passageend',
			content : passageEl,
			passage
		});

		// Reset the engine state.
		state = States.Idle;

		// Update the last play time.
		lastPlay = now();

		return true;
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function hideOutlines() {
		outlinePatch.set('*:focus{outline:none;}');
	}

	function showOutlines() {
		outlinePatch.clear();
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Enumerations.
		States : { value : States },

		// Core Functions.
		init        : { value : engineInit },
		prestart    : { value : enginePrestart },
		start       : { value : engineStart },
		restart     : { value : engineRestart },
		state       : { get : engineState },
		isIdle      : { value : engineIsIdle },
		isPlaying   : { value : engineIsPlaying },
		isRendering : { value : engineIsRendering },
		lastPlay    : { get : engineLastPlay },
		goTo        : { value : engineGoTo },
		go          : { value : engineGo },
		backward    : { value : engineBackward },
		forward     : { value : engineForward },
		show        : { value : engineShow },
		play        : { value : enginePlay }
	}));
})();


/*
	Module Exports.
*/
export default Engine;
