/***********************************************************************************************************************

	markup/wikifier.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Lexer, { EOF } from '~/markup/lexer';
import Config from '~/config';
import Patterns from '~/lib/patterns';
import Scripting from '~/markup/scripting';
import State from '~/state';
import Story from '~/story';
import convertBreaks from '~/utils/convertbreaks';
import cssPropToDOMProp from '~/utils/cssproptodomprop';
import { errorPrologRE } from '~/lib/alert';
import getTypeOf from '~/utils/gettypeof';


/*
	TODO: The Wikifier, and associated code, could stand to receive a serious refactoring.
*/

/*
	Wikifier API class/static object.
*/
/* eslint-disable max-len */
const Wikifier = (() => {
	// Wikifier call depth.
	let _callDepth = 0;

	// Temporary state object.
	let _tempState = {};


	/*******************************************************************************
		Wikifier Class.
	*******************************************************************************/

	class Wikifier {
		constructor(destination, source, options) {
			if (Wikifier.Parser.Profile.isEmpty()) {
				Wikifier.Parser.Profile.compile();
			}

			Object.defineProperties(this, {
				// General Wikifier properties.
				source : {
					value : String(source)
				},

				options : {
					writable : true,
					value    : { profile : 'all', ...options }
				},

				nextMatch : {
					writable : true,
					value    : 0
				},

				output : {
					writable : true,
					value    : null
				},

				// Macro parser ('macro') related properties.
				_rawArgs : {
					writable : true,
					value    : ''
				}
			});

			// No destination specified.  Create a fragment to act as the output buffer.
			if (destination == null) { // lazy equality for null
				this.output = document.createDocumentFragment();
			}

			// jQuery-wrapped destination.  Grab the first element.
			else if (destination.jquery) { // cannot use `hasOwnProperty()` here as `jquery` is from jQuery's prototype
				this.output = destination[0];
			}

			// Normal destination.
			else {
				this.output = destination;
			}

			// Wikify the source into the output buffer element, possibly converting line
			// breaks into paragraphs.
			//
			// NOTE: There's no catch clause here because this try/finally exists solely
			// to ensure that the call depth is properly restored.
			try {
				++_callDepth;

				this.subWikify(this.output);
			}
			finally {
				--_callDepth;
			}

			// Limit various post-Wikifier behaviors to non-recursive calls.
			if (_callDepth === 0) {
				let exitFn;

				// If `_tempState.exit` is a function, record it for later.
				if (typeof _tempState.exit === 'function') {
					exitFn = _tempState.exit;
				}

				// Attempt line break conversion, if requested.
				if (Config.cleanupWikifierOutput && !this.options.noCleanup) {
					convertBreaks(this.output);
				}

				// Reset the Wikifier's temporary state.
				_tempState = {};

				// Call the exit function, if any.
				if (exitFn) {
					return exitFn();
				}
			}
		}

		subWikify(output, terminator, options) {
			let origOutput;
			let origOptions;

			// NOTE: There's no catch clause here because this try/finally exists
			// solely to ensure that the original output buffer and options are
			// properly restored.
			try {
				// Cache and temporarily replace the current output buffer.
				origOutput = this.output;
				this.output = output;

				let newOptions;

				// Global option overrides.
				// (none)
				// Parser option overrides.
				if (Wikifier.Option.length > 0) {
					newOptions = Object.assign(newOptions || {}, Wikifier.Option.options);
				}
				// Local parameter option overrides.
				if (options !== null && typeof options === 'object') {
					newOptions = Object.assign(newOptions || {}, options);
				}
				// If new options exist, cache and temporarily replace the current options.
				if (newOptions) {
					origOptions = this.options;
					this.options = { ...this.options, ...newOptions };
				}

				const parsersProfile   = Wikifier.Parser.Profile.get(this.options.profile);
				const terminatorRE = terminator
					? new RegExp(`(?:${terminator})`, this.options.ignoreTerminatorCase ? 'gim' : 'gm')
					: null;
				let terminatorMatch;
				let parserMatch;

				do {
					// Prepare the RegExp match positions.
					parsersProfile.parserRE.lastIndex = this.nextMatch;

					if (terminatorRE) {
						terminatorRE.lastIndex = this.nextMatch;
					}

					// Get the first matches.
					parserMatch     = parsersProfile.parserRE.exec(this.source);
					terminatorMatch = terminatorRE ? terminatorRE.exec(this.source) : null;

					// Try for a terminator match, unless there's a closer parser match.
					if (terminatorMatch && (!parserMatch || terminatorMatch.index <= parserMatch.index)) {
						// Output any text before the match.
						if (terminatorMatch.index > this.nextMatch) {
							this.outputText(this.output, this.nextMatch, terminatorMatch.index);
						}

						// Set the match parameters.
						this.matchStart  = terminatorMatch.index;
						this.matchLength = terminatorMatch[0].length;
						this.matchText   = terminatorMatch[0];
						this.nextMatch   = terminatorRE.lastIndex;

						// Exit.
						return;
					}

					// Try for a parser match.
					else if (parserMatch) {
						// Output any text before the match.
						if (parserMatch.index > this.nextMatch) {
							this.outputText(this.output, this.nextMatch, parserMatch.index);
						}

						// Set the match parameters.
						this.matchStart  = parserMatch.index;
						this.matchLength = parserMatch[0].length;
						this.matchText   = parserMatch[0];
						this.nextMatch   = parsersProfile.parserRE.lastIndex;

						// Figure out which parser matched.
						let matchingParser;

						for (let i = 1, iend = parserMatch.length; i < iend; ++i) {
							if (parserMatch[i]) {
								matchingParser = i - 1;
								break; // stop once we've found the matching parser
							}
						}

						// Call the parser.
						parsersProfile.parsers[matchingParser].handler(this);

						if (_tempState.exit != null) { // lazy equality for null
							// Exit.
							return;
						}
						else if (_tempState.break != null) { // lazy equality for null
							break;
						}
					}
				} while (terminatorMatch || parserMatch);

				// Output any text after the last match.
				if (_tempState.break == null) { // lazy equality for null
					if (this.nextMatch < this.source.length) {
						this.outputText(this.output, this.nextMatch, this.source.length);
						this.nextMatch = this.source.length;
					}
				}
				// In case of <<break>>/<<continue>>, remove the last <br>.
				else if (
					this.output.lastChild
					&& this.output.lastChild.nodeType === Node.ELEMENT_NODE
					&& this.output.lastChild.nodeName.toUpperCase() === 'BR'
				) {
					jQuery(this.output.lastChild).remove();
				}
			}
			finally {
				// Restore the original output buffer and options.
				this.output = origOutput;

				if (origOptions) {
					this.options = origOptions;
				}
			}
		}

		outputText(destination, startPos, endPos) {
			jQuery(destination).append(document.createTextNode(this.source.substring(startPos, endPos)));
		}

		/*
			Clear the temporary state.
		*/
		static clearTemporary() {
			_tempState = {};
		}

		/*
			Returns the current temporary state object.
		*/
		static get temporary() {
			return _tempState;
		}

		/*
			Returns the output generated by wikifying the given text, throwing if there were errors.
		*/
		static wikifyEval(text) {
			const output = document.createDocumentFragment();

			new Wikifier(output, text);

			const errors = output.querySelector('.error');

			if (errors !== null) {
				throw new Error(errors.textContent.replace(errorPrologRE, ''));
			}

			return output;
		}
	}


	/*******************************************************************************
		Option Static Object.
	*******************************************************************************/

	Object.defineProperty(Wikifier, 'Option', {
		value : (() => {
			// Options array (stack).
			let _optionsStack = [];


			/*
				GlobalOption Functions.
			*/
			function optionLength() {
				return _optionsStack.length;
			}

			function optionGetter() {
				return Object.assign({}, ..._optionsStack);
			}

			function optionClear() {
				_optionsStack = [];
			}

			function optionGet(idx) {
				return _optionsStack[idx];
			}

			function optionPop() {
				return _optionsStack.pop();
			}

			function optionPush(options) {
				if (typeof options !== 'object' || options === null) {
					throw new TypeError(`Wikifier.Option.push options parameter must be an object (received: ${getTypeOf(options)})`);
				}

				return _optionsStack.push(options);
			}


			/*
				Object Exports.
			*/
			return Object.freeze(Object.create(null, {
				length  : { get : optionLength },
				options : { get : optionGetter },
				clear   : { value : optionClear },
				get     : { value : optionGet },
				pop     : { value : optionPop },
				push    : { value : optionPush }
			}));
		})()
	});


	/*******************************************************************************
		Parser Static Object.
	*******************************************************************************/

	Object.defineProperty(Wikifier, 'Parser', {
		value : (() => {
			// Parser definition array.  Ordering matters, so this must be an ordered list.
			const _parsers = [];

			// Parser profiles object.
			let _profiles;


			/*
				Parser Functions.
			*/
			function parsersGetter() {
				return _parsers;
			}

			function parsersAdd(parser) {
				// Parser object sanity checks.
				if (typeof parser !== 'object') {
					throw new Error('Wikifier.Parser.add parser parameter must be an object');
				}

				if (!parser.hasOwnProperty('name')) {
					throw new Error('parser object missing required "name" property');
				}
				else if (typeof parser.name !== 'string') {
					throw new Error('parser object "name" property must be a string');
				}

				if (!parser.hasOwnProperty('match')) {
					throw new Error('parser object missing required "match" property');
				}
				else if (typeof parser.match !== 'string') {
					throw new Error('parser object "match" property must be a string');
				}

				if (!parser.hasOwnProperty('handler')) {
					throw new Error('parser object missing required "handler" property');
				}
				else if (typeof parser.handler !== 'function') {
					throw new Error('parser object "handler" property must be a function');
				}

				if (parser.hasOwnProperty('profiles') && !(parser.profiles instanceof Array)) {
					throw new Error('parser object "profiles" property must be an array');
				}

				// Check for an existing parser with the same name.
				if (parsersHas(parser.name)) {
					throw new Error(`cannot clobber existing parser "${parser.name}"`);
				}

				// Add the parser to the end of the array.
				_parsers.push(parser);
			}

			function parsersDelete(name) {
				const parser = _parsers.find(parser => parser.name === name);

				if (parser) {
					_parsers.delete(parser);
				}
			}

			function parsersIsEmpty() {
				return _parsers.length === 0;
			}

			function parsersHas(name) {
				return !!_parsers.find(parser => parser.name === name);
			}

			function parsersGet(name) {
				return _parsers.find(parser => parser.name === name) || null;
			}


			/*
				Parser Profile Functions.
			*/
			function profilesGetter() {
				return _profiles;
			}

			function profilesCompile() {
				if (BUILD_DEBUG) { console.log('[Wikifier.Parser/profilesCompile()]'); }

				const all  = _parsers;
				const core = all.filter(parser => !(parser.profiles instanceof Array) || parser.profiles.includes('core'));

				_profiles = Object.freeze({
					all : {
						parsers  : all,
						parserRE : new RegExp(all.map(parser => `(${parser.match})`).join('|'), 'gm')
					},
					core : {
						parsers  : core,
						parserRE : new RegExp(core.map(parser => `(${parser.match})`).join('|'), 'gm')
					}
				});

				return _profiles;
			}

			function profilesIsEmpty() {
				return typeof _profiles !== 'object' || Object.keys(_profiles).length === 0;
			}

			function profilesGet(profile) {
				if (typeof _profiles !== 'object' || !_profiles.hasOwnProperty(profile)) {
					throw new Error(`nonexistent parser profile "${profile}"`);
				}

				return _profiles[profile];
			}

			function profilesHas(profile) {
				return typeof _profiles === 'object' && _profiles.hasOwnProperty(profile);
			}


			/*
				Object Exports.
			*/
			return Object.freeze(Object.create(null, {
				// Parser Containers.
				parsers : { get : parsersGetter },

				// Parser Functions.
				add     : { value : parsersAdd },
				delete  : { value : parsersDelete },
				isEmpty : { value : parsersIsEmpty },
				has     : { value : parsersHas },
				get     : { value : parsersGet },

				// Parser Profile.
				Profile : {
					value : Object.freeze(Object.create(null, {
						// Profiles Containers.
						profiles : { get : profilesGetter },

						// Profiles Functions.
						compile : { value : profilesCompile },
						isEmpty : { value : profilesIsEmpty },
						has     : { value : profilesHas },
						get     : { value : profilesGet }
					}))
				}
			}));
		})()
	});


	/*******************************************************************************
		Helper Static Methods.
	*******************************************************************************/

	Object.defineProperty(Wikifier, 'helpers', { value : {} });
	Object.defineProperties(Wikifier.helpers, {
		inlineCss : {
			value : (() => {
				const lookaheadRE = new RegExp(Patterns.inlineCss, 'gm');
				const idOrClassRE = new RegExp(Patterns.cssIdOrClass, 'g');

				function helperInlineCss(w) {
					const css = { classes : [], id : '', styles : {} };
					let matched;

					do {
						lookaheadRE.lastIndex = w.nextMatch;

						const match = lookaheadRE.exec(w.source);

						matched = match && match.index === w.nextMatch;

						if (matched) {
							if (match[1]) {
								css.styles[cssPropToDOMProp(match[1])] = match[2].trim();
							}
							else if (match[3]) {
								let subMatch;

								while ((subMatch = idOrClassRE.exec(match[3])) !== null) {
									if (subMatch[1] === '.') {
										css.classes.push(subMatch[2]);
									}
									else {
										css.id = subMatch[2];
									}
								}
							}

							w.nextMatch = lookaheadRE.lastIndex; // eslint-disable-line no-param-reassign
						}
					} while (matched);

					return css;
				}

				return helperInlineCss;
			})()
		},

		evalText : {
			value(text) {
				let result;

				try {
					result = Scripting.evalTwineScript(text);

					/*
						Attempt to prevent the leakage of auto-globals by enforcing that
						the resultant value be either a string or a number.

						NOTE: This is not a foolproof solution to the problem of auto-global
						leakage.  Various auto-globals, which return strings or numbers, can
						still leak through—e.g. `window.status` → string.
					*/
					switch (typeof result) {
						case 'string':
							if (result.trim() === '') {
								result = text;
							}

							break;

						case 'number':
							result = String(result);
							break;

						default:
							result = text;
							break;
					}
				}
				catch (ex) {
					result = text;
				}

				return result;
			}
		},

		evalPassageId : {
			value(passage) {
				if (passage == null || Story.has(passage)) { // lazy equality for null; `0` is a valid name, so we cannot simply evaluate `passage`
					return passage;
				}

				return Wikifier.helpers.evalText(passage);
			}
		},

		hasBlockContext : {
			value(nodes) {
				const hasGCS = typeof window.getComputedStyle === 'function';

				for (let i = nodes.length - 1; i >= 0; --i) {
					const node = nodes[i];

					switch (node.nodeType) {
						case Node.ELEMENT_NODE: {
							const tagName = node.nodeName.toUpperCase();

							if (tagName === 'BR') {
								return true;
							}

							const styles = hasGCS ? window.getComputedStyle(node, null) : node.currentStyle;

							if (styles && styles.display) {
								if (styles.display === 'none') {
									continue;
								}

								return styles.display === 'block';
							}

							/*
								WebKit/Blink-based browsers do not attach any computed style
								information to elements until they're inserted into the DOM
								(and probably visible), not even the default browser styles
								and any user styles.  So, we make an assumption based on the
								element.
							*/
							switch (tagName) {
								case 'ADDRESS':
								case 'ARTICLE':
								case 'ASIDE':
								case 'BLOCKQUOTE':
								case 'CENTER':
								case 'DIV':
								case 'DL':
								case 'FIGURE':
								case 'FOOTER':
								case 'FORM':
								case 'H1':
								case 'H2':
								case 'H3':
								case 'H4':
								case 'H5':
								case 'H6':
								case 'HEADER':
								case 'HR':
								case 'MAIN':
								case 'NAV':
								case 'OL':
								case 'P':
								case 'PRE':
								case 'SECTION':
								case 'TABLE':
								case 'UL':
									return true;
							}

							return false;
						}

						case Node.COMMENT_NODE:
							continue;

						default:
							return false;
					}
				}

				return true;
			}
		},

		createShadowSetterCallback : {
			value : (() => {
				let macroParser = null;

				function cacheMacroParser() {
					if (!macroParser) {
						macroParser = Wikifier.Parser.get('macro');

						if (!macroParser) {
							throw new Error('cannot find "macro" parser');
						}
					}

					return macroParser;
				}

				function getMacroContextShadowView() {
					const macro = macroParser || cacheMacroParser();
					const view  = new Set();

					for (let context = macro.context; context !== null; context = context.parent) {
						if (context._shadows) {
							context._shadows.forEach(name => view.add(name));
						}
					}

					return Array.from(view);
				}

				function helperCreateShadowSetterCallback(code) {
					const shadowStore = {};

					getMacroContextShadowView().forEach(varName => {
						const varKey = varName.slice(1);
						const store  = varName[0] === '$' ? State.variables : State.temporary;
						shadowStore[varName] = store[varKey];
					});

					return function () {
						const shadowNames = Object.keys(shadowStore);
						const valueCache  = shadowNames.length > 0 ? {} : null;

						/*
							There's no catch clause because this try/finally is here simply to ensure that
							proper cleanup is done in the event that an exception is thrown during the
							evaluation.
						*/
						try {
							/*
								Cache the existing values of the variables to be shadowed and assign the
								shadow values.
							*/
							shadowNames.forEach(varName => {
								const varKey = varName.slice(1);
								const store  = varName[0] === '$' ? State.variables : State.temporary;

								if (store.hasOwnProperty(varKey)) {
									valueCache[varKey] = store[varKey];
								}

								store[varKey] = shadowStore[varName];
							});

							// Evaluate the JavaScript.
							return Scripting.evalJavaScript(code);
						}
						finally {
							// Revert the variable shadowing.
							shadowNames.forEach(varName => {
								const varKey = varName.slice(1);
								const store  = varName[0] === '$' ? State.variables : State.temporary;

								/*
									Update the shadow store with the variable's current value, in case it
									was modified during the callback.
								*/
								shadowStore[varName] = store[varKey];

								if (valueCache.hasOwnProperty(varKey)) {
									store[varKey] = valueCache[varKey];
								}
								else {
									delete store[varKey];
								}
							});
						}
					};
				}

				return helperCreateShadowSetterCallback;
			})()
		},

		parseSquareBracketedMarkup : {
			value : (() => {
				/* eslint-disable no-param-reassign */
				const Item = Lexer.enumFromNames([ // lex item types object (pseudo-enumeration)
					'Error',     // error
					'DelimLTR',  // '|' or '->'
					'DelimRTL',  // '<-'
					'InnerMeta', // ']['
					'ImageMeta', // '[img[', '[<img[', or '[>img['
					'LinkMeta',  // '[['
					'Link',      // link destination
					'RightMeta', // ']]'
					'Setter',    // setter expression
					'Source',    // image source
					'Text'       // link text or image alt text
				]);
				const Delim = Lexer.enumFromNames([ // delimiter state object (pseudo-enumeration)
					'None', // no delimiter encountered
					'LTR',  // '|' or '->'
					'RTL'   // '<-'
				]);

				// Lexing functions.
				function slurpQuote(lexer, endQuote) {
					loop: for (;;) {
						switch (lexer.next()) {
							case '\\': {
								const ch = lexer.next();

								if (ch !== EOF && ch !== '\n') {
									break;
								}
							}
							/* falls through */

							case EOF:
							case '\n':
								return EOF;

							case endQuote:
								break loop;
						}
					}

					return lexer.pos;
				}

				function lexLeftMeta(lexer) {
					if (!lexer.accept('[')) {
						return lexer.error(Item.Error, 'malformed square-bracketed markup');
					}

					// Is link markup.
					if (lexer.accept('[')) {
						lexer.data.isLink = true;
						lexer.emit(Item.LinkMeta);
					}

					// May be image markup.
					else {
						lexer.accept('<>'); // aligner syntax

						if (!lexer.accept('Ii') || !lexer.accept('Mm') || !lexer.accept('Gg') || !lexer.accept('[')) {
							return lexer.error(Item.Error, 'malformed square-bracketed markup');
						}

						lexer.data.isLink = false;
						lexer.emit(Item.ImageMeta);
					}

					lexer.depth = 2; // account for both initial left square brackets
					return lexCoreComponents;
				}

				function lexCoreComponents(lexer) {
					const what = lexer.data.isLink ? 'link' : 'image';
					let delim = Delim.None;

					for (;;) {
						switch (lexer.next()) {
							case EOF:
							case '\n':
								return lexer.error(Item.Error, `unterminated ${what} markup`);

							case '"':
								// This is not entirely reliable within sections that allow raw strings, since
								// it's possible, however unlikely, for a raw string to contain unpaired double
								// quotes.  The likelihood is low enough, however, that I'm deeming the risk as
								// acceptable—for now, at least.
								if (slurpQuote(lexer, '"') === EOF) {
									return lexer.error(Item.Error, `unterminated double quoted string in ${what} markup`);
								}

								break;

							case '|': // possible pipe ('|') delimiter
								if (delim === Delim.None) {
									delim = Delim.LTR;
									lexer.backup();
									lexer.emit(Item.Text);
									lexer.forward();
									lexer.emit(Item.DelimLTR);
									// lexer.ignore();
								}

								break;

							case '-': // possible right arrow ('->') delimiter
								if (delim === Delim.None && lexer.peek() === '>') {
									delim = Delim.LTR;
									lexer.backup();
									lexer.emit(Item.Text);
									lexer.forward(2);
									lexer.emit(Item.DelimLTR);
									// lexer.ignore();
								}

								break;

							case '<': // possible left arrow ('<-') delimiter
								if (delim === Delim.None && lexer.peek() === '-') {
									delim = Delim.RTL;
									lexer.backup();
									lexer.emit(lexer.data.isLink ? Item.Link : Item.Source);
									lexer.forward(2);
									lexer.emit(Item.DelimRTL);
									// lexer.ignore();
								}

								break;

							case '[':
								++lexer.depth;
								break;

							case ']':
								--lexer.depth;

								if (lexer.depth === 1) {
									switch (lexer.peek()) {
										case '[':
											++lexer.depth;
											lexer.backup();

											if (delim === Delim.RTL) {
												lexer.emit(Item.Text);
											}
											else {
												lexer.emit(lexer.data.isLink ? Item.Link : Item.Source);
											}

											lexer.forward(2);
											lexer.emit(Item.InnerMeta);
											// lexer.ignore();
											return lexer.data.isLink ? lexSetter : lexImageLink;

										case ']':
											--lexer.depth;
											lexer.backup();

											if (delim === Delim.RTL) {
												lexer.emit(Item.Text);
											}
											else {
												lexer.emit(lexer.data.isLink ? Item.Link : Item.Source);
											}

											lexer.forward(2);
											lexer.emit(Item.RightMeta);
											// lexer.ignore();
											return null;

										default:
											return lexer.error(Item.Error, `malformed ${what} markup`);
									}
								}

								break;
						}
					}
				}

				function lexImageLink(lexer) {
					const what = lexer.data.isLink ? 'link' : 'image';

					for (;;) {
						switch (lexer.next()) {
							case EOF:
							case '\n':
								return lexer.error(Item.Error, `unterminated ${what} markup`);

							case '"':
								// This is not entirely reliable within sections that allow raw strings, since
								// it's possible, however unlikely, for a raw string to contain unpaired double
								// quotes.  The likelihood is low enough, however, that I'm deeming the risk as
								// acceptable—for now, at least.
								if (slurpQuote(lexer, '"') === EOF) {
									return lexer.error(Item.Error, `unterminated double quoted string in ${what} markup link component`);
								}

								break;

							case '[':
								++lexer.depth;
								break;

							case ']':
								--lexer.depth;

								if (lexer.depth === 1) {
									switch (lexer.peek()) {
										case '[':
											++lexer.depth;
											lexer.backup();
											lexer.emit(Item.Link);
											lexer.forward(2);
											lexer.emit(Item.InnerMeta);
											// lexer.ignore();
											return lexSetter;

										case ']':
											--lexer.depth;
											lexer.backup();
											lexer.emit(Item.Link);
											lexer.forward(2);
											lexer.emit(Item.RightMeta);
											// lexer.ignore();
											return null;

										default:
											return lexer.error(Item.Error, `malformed ${what} markup`);
									}
								}

								break;
						}
					}
				}

				function lexSetter(lexer) {
					const what = lexer.data.isLink ? 'link' : 'image';

					for (;;) {
						switch (lexer.next()) {
							case EOF:
							case '\n':
								return lexer.error(Item.Error, `unterminated ${what} markup`);

							case '"':
								if (slurpQuote(lexer, '"') === EOF) {
									return lexer.error(Item.Error, `unterminated double quoted string in ${what} markup setter component`);
								}

								break;

							case "'":
								if (slurpQuote(lexer, "'") === EOF) {
									return lexer.error(Item.Error, `unterminated single quoted string in ${what} markup setter component`);
								}

								break;

							case '[':
								++lexer.depth;
								break;

							case ']':
								--lexer.depth;

								if (lexer.depth === 1) {
									if (lexer.peek() !== ']') {
										return lexer.error(Item.Error, `malformed ${what} markup`);
									}

									--lexer.depth;
									lexer.backup();
									lexer.emit(Item.Setter);
									lexer.forward(2);
									lexer.emit(Item.RightMeta);
									// lexer.ignore();
									return null;
								}

								break;
						}
					}
				}

				// Parse function.
				function parseSquareBracketedMarkup(w) {
					// Initialize the lexer.
					const lexer  = new Lexer(w.source, lexLeftMeta);

					// Set the initial positions within the source string.
					lexer.start = lexer.pos = w.matchStart;

					// Lex the raw argument string.
					const markup = {};
					const items  = lexer.run();
					const last   = items.last();

					if (last && last.type === Item.Error) {
						markup.error = last.message;
					}
					else {
						items.forEach(item => {
							const text = item.text.trim();

							switch (item.type) {
								case Item.ImageMeta:
									markup.isImage = true;

									if (text[1] === '<') {
										markup.align = 'left';
									}
									else if (text[1] === '>') {
										markup.align = 'right';
									}

									break;

								case Item.LinkMeta:
									markup.isLink = true;
									break;

								case Item.Link:
									if (text[0] === '~') {
										markup.forceInternal = true;
										markup.link = text.slice(1);
									}
									else {
										markup.link = text;
									}

									break;

								case Item.Setter:
									markup.setter = text;
									break;

								case Item.Source:
									markup.source = text;
									break;

								case Item.Text:
									markup.text = text;
									break;
							}
						});
					}

					markup.pos = lexer.pos;
					return markup;
				}

				return parseSquareBracketedMarkup;
				/* eslint-enable no-param-reassign */
			})()
		}
	});


	/*******************************************************************************
		Class Exports.
	*******************************************************************************/

	return Wikifier;
})();
/* eslint-enable max-len */


/*
	Module Exports.
*/
export default Wikifier;
