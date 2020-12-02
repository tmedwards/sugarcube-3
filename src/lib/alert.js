/***********************************************************************************************************************

	lib/alert.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	TODO: This regular expression should be elsewhere.

	Error prologs by engine/browser: (ca. 2018)
		Chrome, Opera, & Vivaldi → `Uncaught \w*Error: …`
		Edge & IE                → `…`
		Firefox                  → `Error: …`
		Opera (Presto)           → `Uncaught exception: \w*(?:Error|Exception): …`
		Safari (ca. v5.1)        → `\w*(?:Error|_ERR): …`
*/
const errorPrologRE = /^(?:(?:uncaught\s+(?:exception:\s+)?)?\w*(?:error|exception|_err):\s+)+/i; // eslint-disable-line no-unused-vars, no-var

/*
	Alert API static object.
*/
const Alert = (() => {
	/*******************************************************************************
		Error Functions.
	*******************************************************************************/

	function mesg(where, error, isFatal, isUncaught) {
		let mesg = 'Error';
		let nice = `${isFatal ? 'A fatal' : 'An'} error has occurred.`;

		if (isFatal) {
			nice += ' Aborting.';
		}
		else {
			nice += ' You may be able to continue, but some parts may not work properly.';
		}

		const isObject = error !== null && typeof error === 'object';
		const isExLike = isObject && 'message' in error;
		const what     = (
			isExLike ? String(error.message).replace(errorPrologRE, '') : String(error)
		).trim() || 'unknown error';

		if (where != null) { // lazy equality for null
			mesg += ` [${where}]`;
		}

		mesg += `: ${what}.`;

		if (isObject && 'stack' in error) {
			mesg += `\n\nStack Trace:\n${error.stack}`;
		}

		if (mesg) {
			nice += `\n\n${mesg}`;
		}

		// Log a plain message.
		if (!isUncaught) {
			console[isFatal ? 'error' : 'warn'](mesg);
		}

		// Pop up a nice message.
		window.alert(nice); // eslint-disable-line no-alert
	}

	function alertError(where, error) {
		mesg(where, error);
	}

	function alertFatal(where, error) {
		mesg(where, error, true);
	}


	/*******************************************************************************
		`window.onerror` Handler.
	*******************************************************************************/

	/*
		Set up a global error handler for uncaught exceptions.
	*/
	(origOnError => {
		window.onerror = function (what, source, lineNum, colNum, error) {
			// console.error(what, source, lineNum, colNum, error);

			// Uncaught exceptions during play may be recoverable/ignorable.
			if (document.readyState === 'complete') {
				mesg(null, error || what, false, true);
			}

			// Uncaught exceptions during startup should be fatal.
			else {
				mesg(null, error || what, true, true);
				window.onerror = origOnError;

				if (typeof window.onerror === 'function') {
					window.onerror.apply(this, arguments);
				}
			}
		};
	})(window.onerror);


	/*******************************************************************************
		Object Exports.
	*******************************************************************************/

	return Object.freeze(Object.create(null, {
		error : { value : alertError },
		fatal : { value : alertFatal }
	}));
})();


/*
	Module Exports.
*/
export { Alert as default, errorPrologRE };
