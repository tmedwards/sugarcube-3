/***********************************************************************************************************************

	macros/macro.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

import Patterns from './lib/patterns';
import getTypeOf from './utils/gettypeof';


/*
	TODO: Allow/require granular specification of how macro arguments should be parsed.
*/

/*
	Macro API static object.
*/
const Macro = (() => {
	// Macro definitions map ('macro name' → {definition object}).
	const definitions = new Map();

	// Macro tags' parents map ('tag name' → [parent names array]).
	const tagsParents = new Map();

	// Valid macro name regular expression.
	const validNameRe = new RegExp(`^(?:${Patterns.macroName})$`);


	/*******************************************************************************
		Macros Functions.
	*******************************************************************************/

	function macrosAdd(name, def) {
		if (name instanceof Array) {
			return name.forEach(name => macrosAdd(name, def));
		}

		if (!validNameRe.test(name)) {
			throw new Error(`invalid macro name "${name}"`);
		}

		if (definitions.has(name)) {
			throw new Error(`cannot clobber existing macro <<${name}>>`);
		}
		else if (tagsParents.has(name)) {
			const parents = tagsParents.get(name);
			throw new Error(`cannot clobber child tag <<${name}>> of parent macro${parents.length === 1 ? '' : 's'} <<${parents.join('>>, <<')}>>`);
		}

		if (def == null) { // lazy equality for null
			throw new Error(`macro <<${name}>> definition cannot be null/undefined`);
		}

		if (typeof def === 'object') {
			if (typeof def.handler !== 'function') {
				throw new TypeError(`macro <<${name}>> definition handler property must be a function`);
			}

			if (
				typeof def.tags !== 'undefined'
				&& (!(def.tags instanceof Array) || def.tags.some(tag => typeof tag !== 'string'))
			) {
				throw new Error(`macro <<${name}>> definition tags property must be an Array of tag names (received: ${def.tags instanceof Array ? 'Array of any' : getTypeOf(def.tags)})`);
			}
		}
		else if (!definitions.has(def)) {
			throw new Error(`macro <<${name}>> cannot be aliased to nonexistent macro <<${def}>>`);
		}

		// A new macro definition or an alias to an existing one.
		const macro = Object.seal(
			typeof def === 'object'
				? Object.assign(Object.create(null), def)
				: Object.create(definitions.get(def), {
					_ALIAS_OF : {
						enumerable : true,
						value      : def
					}
				})
		);

		// Add the macro definition.
		definitions.set(name, macro);

		// Tags processing.
		if (typeof macro.tags !== 'undefined') {
			tagsRegister(name, macro.tags);
		}

		return macro;
	}

	function macrosDelete(name) {
		if (name instanceof Array) {
			return name.forEach(name => macrosDelete(name));
		}

		// Attempt to get the macro by the given name.
		const macro = definitions.get(name);

		// Remove the macro if it exists.
		if (macro) {
			if (typeof macro.tags !== 'undefined') {
				tagsUnregister(name);
			}

			definitions.delete(name);
		}
		// Elsewise, ensure that a child tag wasn't the target.
		else if (tagsParents.has(name)) {
			const parents = tagsParents.get(name);
			throw new Error(`cannot remove child tag <<${name}>> of parent macro${parents.length === 1 ? '' : 's'} <<${parents.join('>>, <<')}>>`);
		}
	}

	function macrosGet(name) {
		return definitions.get(name);
	}

	function macrosHas(name) {
		return definitions.has(name);
	}

	function macrosInit() {
		definitions.forEach((macro, name) => {
			if (typeof macro.init === 'function') {
				macro.init.call(null, name);
			}
		});
	}

	function macrosIsEmpty() {
		return definitions.size === 0;
	}


	/*******************************************************************************
		Tags Functions.
	*******************************************************************************/

	function tagsGet(name) {
		return tagsParents.get(name);
	}

	function tagsHas(name) {
		return tagsParents.has(name);
	}

	function tagsRegister(parent, children = []) {
		if (!parent) {
			throw new Error('no parent specified');
		}

		// Add the closing tag and any child tags.
		[`/${parent}`].concat(children).forEach(tag => {
			if (definitions.has(tag)) {
				throw new Error(`cannot register tag "${tag}" for an existing macro name`);
			}

			const parents = tagsParents.get(tag);

			if (parents) {
				if (!parents.includes(parent)) {
					parents.push(parent);
					parents.sort();
				}
			}
			else {
				tagsParents.set(tag, [parent]);
			}
		});
	}

	function tagsUnregister(parent) {
		if (!parent) {
			throw new Error('no parent specified');
		}

		tagsParents.forEach((arr, tag) => {
			const pos = arr.indexOf(parent);

			if (pos !== -1) {
				if (arr.length === 1) {
					tagsParents.delete(tag);
				}
				else {
					arr.splice(pos, 1);
				}
			}
		});
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.defineProperties(Object.create(null), {
		// Macro Functions.
		add     : { value : macrosAdd },
		delete  : { value : macrosDelete },
		isEmpty : { value : macrosIsEmpty },
		has     : { value : macrosHas },
		get     : { value : macrosGet },
		init    : { value : macrosInit },

		// Tags Functions.
		tags : {
			value : Object.freeze(Object.defineProperties({}, {
				has : { value : tagsHas },
				get : { value : tagsGet }
			}))
		}
	}));
})();


/*
	Module Exports.
*/
export default Macro;
