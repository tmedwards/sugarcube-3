/***********************************************************************************************************************

	lib/outliner.js

	Copyright © 2015–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Outliner API static object.
*/
const Outliner = (() => {
	// Cache of the outline patching `<style>` element.
	let styleEl = null;

	// Last event seen.
	let lastEvent;


	/*******************************************************************************
		API Functions.
	*******************************************************************************/

	function outlinerInit() {
		if (styleEl) {
			return;
		}

		// Generate the `<style>` element and add it to the document head.
		styleEl = document.createElement('style');
		styleEl.id = 'style-outliner';
		document.head.appendChild(styleEl);

		// Attach the event handler to manipulate the outlines.
		document.addEventListener('keydown', eventHandler, { passive : true });
		document.addEventListener('mousedown', eventHandler, { passive : true });

		// Initially hide outlines.
		lastEvent = 'mousedown';
		outlinerHide();
	}

	function outlinerHide() {
		document.documentElement.removeAttribute('data-outlines');
		styleEl.textContent = '*:focus{outline:none;}';
	}

	function outlinerShow() {
		document.documentElement.setAttribute('data-outlines', '');
		styleEl.textContent = '';
	}


	/*******************************************************************************
		Utility Functions.
	*******************************************************************************/

	function eventHandler(ev) {
		if (ev.type !== lastEvent) {
			lastEvent = ev.type;

			if (ev.type === 'keydown') {
				outlinerShow();
			}
			else {
				outlinerHide();
			}
		}
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// Functions.
		init : { value : outlinerInit },
		hide : { value : outlinerHide },
		show : { value : outlinerShow }
	}));
})();


/*
	Module Exports.
*/
export default Outliner;
