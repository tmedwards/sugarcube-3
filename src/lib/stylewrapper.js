/***********************************************************************************************************************

	lib/stylewrapper.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Patterns from './lib/patterns';
import Story from './story';
import Wikifier from './markup/wikifier';


/*
	StyleWrapper API class.
*/
const StyleWrapper = (() => {
	const imageMarkupRE    = new RegExp(Patterns.cssImage, 'g');
	const hasImageMarkupRE = new RegExp(Patterns.cssImage);


	/*******************************************************************************
		StyleWrapper Class.
	*******************************************************************************/

	class StyleWrapper {
		constructor(style) {
			if (style == null) { // lazy equality for null
				throw new TypeError('StyleWrapper style parameter must be an HTMLStyleElement object');
			}

			Object.defineProperties(this, {
				style : {
					value : style
				}
			});
		}

		isEmpty() {
			// This should work in all supported browsers.
			return this.style.cssRules.length === 0;
		}

		set(rawCss) {
			this.clear();
			this.add(rawCss);
		}

		add(rawCss) {
			let css = rawCss;

			// Check for wiki image transclusion.
			if (hasImageMarkupRE.test(css)) {
				imageMarkupRE.lastIndex = 0;
				css = css.replace(imageMarkupRE, wikiImage => {
					const markup = Wikifier.helpers.parseSquareBracketedMarkup({
						source     : wikiImage,
						matchStart : 0
					});

					if (markup.hasOwnProperty('error') || markup.pos < wikiImage.length) {
						return wikiImage;
					}

					let source = markup.source;

					// Handle image passage transclusion.
					if (source.slice(0, 5) !== 'data:' && Story.has(source)) {
						const passage = Story.get(source);

						if (passage.tags.includes('Twine.image')) {
							source = passage.source.trim();
						}
					}

					// The source may be URI- or Base64-encoded, so we cannot use `encodeURIComponent()`
					// here.  Instead, we simply encode any double quotes, since the URI will be
					// delimited by them.
					return `url("${source.replace(/"/g, '%22')}")`;
				});
			}

			this.style.appendChild(document.createTextNode(css));
		}

		clear() {
			this.style.textContent = '';
		}
	}


	/*******************************************************************************
		Class Exports.
	*******************************************************************************/

	return StyleWrapper;
})();


/*
	Module Exports.
*/
export default StyleWrapper;
