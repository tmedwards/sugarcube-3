/***********************************************************************************************************************

	utils/createdeferred.js

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/

/*
	Returns a deferred `Promise`.
*/
function createDeferred(executor) {
	let _resolve;
	let _reject;

	const deferred = new Promise((resolve, reject) => {
		_resolve = resolve;
		_reject = reject;

		if (executor) {
			executor(resolve, reject);
		}
	});

	Object.defineProperties(deferred, {
		resolve : {
			value(value) {
				_resolve(value);
				return deferred;
			}
		},
		reject : {
			value(reason) {
				_reject(reason);
				return deferred;
			}
		}
	});

	return deferred;
}


/*
	Module Exports.
*/
export default createDeferred;
