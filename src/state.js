/***********************************************************************************************************************

	state.js

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

// import Config from './config';
import Db from './db';
import PRNGWrapper from './lib/prngwrapper';
import Scripting from './markup/scripting';
import clone from './utils/clone';
import hasOwn from './utils/hasown';


/*
	State API static object.
*/
const State = (() => {
	// Passage name.
	let _name = '';

	// Previous passage name.
	let _previous = '';

	// Passage visits mapping (name → count).
	//
	// NOTE: This mapping must never include counts less-than `1`.
	let _visits = Object.create(null);

	// Base story variables.
	let _variables = Object.create(null);

	// Working story variables.
	let _working = Object.create(null);

	// Total number of played passages.
	let _turns = 0;

	// (optional) Seedable PRNG object.
	let _prng = null;

	// (optional) Seedable PRNG pull count.
	let _pull = 0;

	// Temporary variables object.
	let _temporary = Object.create(null);


	/*******************************************************************************
		State Functions.
	*******************************************************************************/

	/*
		Resets the story state.
	*/
	function stateReset() {
		if (BUILD_DEBUG) { console.log('[State/stateReset()]'); }

		// Delete the active session.
		Db.session.delete('state');

		// Reset the properties.
		_name      = '';
		_previous  = '';
		_visits    = Object.create(null);
		_variables = Object.create(null);
		_working   = Object.create(null);
		_turns     = 0;
		_prng      = _prng === null ? null : new PRNGWrapper(_prng.seed, false);
		_pull      = 0;
		_temporary = Object.create(null);
	}

	/*
		Restores the story state from the active session.
	*/
	function stateRestore() {
		if (BUILD_DEBUG) { console.log('[State/stateRestore()]'); }

		// Retrieve the active session.
		const sessionState = Db.session.get('state');

		if (BUILD_DEBUG) { console.log('\tsession state:', sessionState); }

		if (sessionState == null) { // lazy equality for null
			return false;
		}

		// Restore the active session.
		stateUnmarshal(sessionState, false);
		return true;
	}

	/*
		Updates the active session and triggers a state update event.
	*/
	function stateUpdate(updateSession = true) {
		if (BUILD_DEBUG) { console.log(`[State/stateUpdate(updateSession: ${updateSession})]`); }

		// Update the active session.
		if (updateSession) {
			Db.session.set('state', stateMarshal());
		}

		// Trigger a global `:stateupdate` event.
		jQuery.event.trigger(':stateupdate');
	}

	/*
		Returns the current story state marshaled into a serializable object.
	*/
	function stateMarshal() {
		if (BUILD_DEBUG) { console.log('[State/stateMarshal()]'); }

		const state = {
			name      : _name,
			visits    : _visits,
			variables : _variables
		};

		if (_previous !== '') {
			state.previous = _previous;
		}

		if (_prng !== null) {
			state.seed = _prng.seed;
			state.pull = _pull;
		}

		return state;
	}

	/*
		Restores the story state from a marshaled story state serialization object.
	*/
	function stateUnmarshal(state, updateSession = true) {
		if (BUILD_DEBUG) { console.log(`[State/stateUnmarshal(updateSession: ${updateSession})]`); }

		if (state == null) { // lazy equality for null
			throw new Error('state object is null or undefined');
		}

		if (!hasOwn(state, 'name')) {
			throw new Error('state object has no name');
		}

		if (!hasOwn(state, 'visits')) {
			throw new Error('state object has no visits mapping');
		}

		if (!hasOwn(state, 'variables')) {
			throw new Error('state object has no variables');
		}

		if (_prng !== null && !hasOwn(state, 'seed')) {
			throw new Error('state object has no seed, but PRNG is enabled');
		}

		if (_prng === null && hasOwn(state, 'seed')) {
			throw new Error('state object has seed, but PRNG is disabled');
		}

		// Restore the state.
		_name      = state.name;
		_previous  = state?.previous ?? '';
		_visits   = Object.assign(Object.create(null), state.visits);
		_variables = Object.assign(Object.create(null), state.variables);
		_working   = clone(_variables);
		_turns     = Object.keys(_visits).reduce((sum, key) => sum += _visits[key], 0); // eslint-disable-line no-param-reassign
		_temporary = Object.create(null);

		if (hasOwn(state, 'seed')) {
			if (_prng !== null) {
				_pull = state.pull;

				// NOTE: This is necessary to properly restore the PRNG's internal state.
				_prng = PRNGWrapper.unmarshal({
					seed : state.seed,
					pull : _pull
				});
			}
		}

		// Finalize the state update.
		stateUpdate(updateSession);
	}

	/*
		Creates a new state.
	*/
	function stateCreate(passageName) {
		if (BUILD_DEBUG) { console.log(`[State/stateCreate(passageName: "${passageName}")]`); }

		if (typeof passageName !== 'string' || passageName === '') {
			throw Error('State.create passageName parameter must be a non-empty string');
		}

		_previous = _name;
		_name = passageName;
		_visits[_name] = 1 + (_visits[_name] ?? 0);
		_variables = clone(_working);

		// QUESTION: Do I need this here?
		// _working = clone(_variables);

		_turns++;

		// QUESTION: Move _temporary clearning here?

		if (_prng !== null) {
			_pull = _prng.pull;
		}

		// Finalize the state update.
		stateUpdate();
	}

	/*
		Returns whether a passage with the given name has been visited.

		NOTE: Does not count the current turn as the visit is still in progress.
	*/
	function stateHasVisited(passageName) {
		if (typeof passageName !== 'string' || passageName === '') {
			throw Error('State.hasVisited passageName parameter must be a non-empty string');
		}

		return passageName === _name
			? (_visits[passageName] ?? 0) > 1
			: hasOwn(_visits, passageName);
	}

	/*
		Returns the name of the current passage.
	*/
	function statePassage() {
		return _name;
	}

	/*
		Returns the name of the previous passage.
	*/
	function statePrevious() {
		return _previous;
	}

	/*
		Returns the total number of played turns.
	*/
	function stateTurns() {
		return _turns;
	}

	/*
		Returns the working variables.
	*/
	function stateVariables() {
		return _working;
	}

	/*
		Returns a new mapping of passage visit counts.
	*/
	function stateVisits() {
		return Object.assign(Object.create(null), _visits);
	}


	/*******************************************************************************
		PRNG Functions.
	*******************************************************************************/

	// QUESTION: Move this to `Config`?
	function prngInit(seed, useEntropy) {
		if (BUILD_DEBUG) { console.log(`[State/prngInit(seed: ${seed}, useEntropy: ${useEntropy})]`); }

		if (_turns === 0) {
			throw new Error('State.initPRNG must be called during initialization, within either the Story JavaScript or the StoryInit special passage');
		}

		_prng = new PRNGWrapper(seed, useEntropy);
		_pull = _prng.pull;
	}

	function prngIsEnabled() {
		return _prng !== null;
	}

	function prngPull() {
		return _prng ? _prng.pull : NaN;
	}

	function prngSeed() {
		return _prng ? _prng.seed : null;
	}

	function prngRandom() {
		if (BUILD_DEBUG) { console.log('[State/prngRandom()]'); }

		return _prng ? _prng.random() : Math.random();
	}


	/*******************************************************************************
		Temporary Variables Functions.
	*******************************************************************************/

	/*
		Clear the temporary variables.
	*/
	function tempVariablesClear() {
		if (BUILD_DEBUG) { console.log('[State/tempVariablesClear()]'); }

		_temporary = Object.create(null);
	}

	/*
		Returns the current temporary variables.
	*/
	function tempVariables() {
		return _temporary;
	}


	/*******************************************************************************
		Variable Chain Functions.
	*******************************************************************************/

	/*
		Returns the value of the given story/temporary variable.
	*/
	function variableGet(varExpression) {
		try {
			return Scripting.evalTwineScript(varExpression);
		}
		catch (ex) { /* no-op */ }
	}

	/*
		Sets the value of the given story/temporary variable.
	*/
	function variableSet(varExpression, value) {
		try {
			Scripting.evalTwineScript(`${varExpression} = evalTwineScript$Data$`, null, value);
			return true;
		}
		catch (ex) { /* no-op */ }

		return false;
	}


	/*******************************************************************************
		Story Metadata Functions.
	*******************************************************************************/

	const METADATA_STORE = 'metadata';

	function metadataClear() {
		Db.storage.delete(METADATA_STORE);
	}

	function metadataDelete(key) {
		if (typeof key !== 'string') {
			throw new TypeError(`State.metadata.delete key parameter must be a string (received: ${typeof key})`);
		}

		const store = Db.storage.get(METADATA_STORE);

		if (store && store.hasOwnProperty(key)) {
			if (Object.keys(store).length === 1) {
				Db.storage.delete(METADATA_STORE);
			}
			else {
				delete store[key];
				Db.storage.set(METADATA_STORE, store);
			}
		}
	}

	function metadataGet(key) {
		if (typeof key !== 'string') {
			throw new TypeError(`State.metadata.get key parameter must be a string (received: ${typeof key})`);
		}

		const store = Db.storage.get(METADATA_STORE);
		return store && store.hasOwnProperty(key) ? store[key] : undefined;
	}

	function metadataHas(key) {
		if (typeof key !== 'string') {
			throw new TypeError(`State.metadata.has key parameter must be a string (received: ${typeof key})`);
		}

		const store = Db.storage.get(METADATA_STORE);
		return store && store.hasOwnProperty(key);
	}

	function metadataSet(key, value) {
		if (typeof key !== 'string') {
			throw new TypeError(`State.metadata.set key parameter must be a string (received: ${typeof key})`);
		}

		if (typeof value === 'undefined') {
			metadataDelete(key);
		}
		else {
			const store = Db.storage.get(METADATA_STORE) || {};
			store[key] = value;
			Db.storage.set(METADATA_STORE, store);
		}
	}

	function metadataSize() {
		const store = Db.storage.get(METADATA_STORE);
		return store ? Object.keys(store).length : 0;
	}


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.preventExtensions(Object.create(null, {
		// State Functions.
		reset      : { value : stateReset },
		restore    : { value : stateRestore },
		marshal    : { value : stateMarshal },
		unmarshal  : { value : stateUnmarshal },
		create     : { value : stateCreate },
		hasVisited : { value : stateHasVisited },
		passage    : { get : statePassage },
		previous   : { get : statePrevious },
		turns      : { get : stateTurns },
		variables  : { get : stateVariables },
		visits     : { get : stateVisits },

		// PRNG Functions.
		prng : {
			value : Object.preventExtensions(Object.create(null, {
				init      : { value : prngInit },
				isEnabled : { value : prngIsEnabled },
				pull      : { get : prngPull },
				seed      : { get : prngSeed }
			}))
		},
		random : { value : prngRandom },

		// Temporary Variables Functions.
		clearTemporary : { value : tempVariablesClear },
		temporary      : { get : tempVariables },

		// Variable Chain Functions.
		getVar : { value : variableGet },
		setVar : { value : variableSet },

		// Story Metadata Functions.
		metadata : {
			value : Object.preventExtensions(Object.create(null, {
				clear  : { value : metadataClear },
				delete : { value : metadataDelete },
				get    : { value : metadataGet },
				has    : { value : metadataHas },
				set    : { value : metadataSet },
				size   : { get : metadataSize }
			}))
		}
	}));
})();


/*
	Module Exports.
*/
export default State;
