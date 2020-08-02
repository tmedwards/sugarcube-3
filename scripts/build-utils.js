/***********************************************************************************************************************

	scripts/build-utils.js (v1.0.0, 2020-04-01)
		Build utility functions for SugarCube.

	Copyright © 2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/
/* eslint-env node, es6 */

const _fs     = require('fs');
const _path   = require('path');
const _indent = ' -> ';


function log(message, indent) {
	console.log('%s%s', indent ? indent : _indent, message);
}

function die(message, error) {
	if (error) {
		console.error('error: %s\n[@: %d/%d] Trace:\n', message, error.line, error.col, error.stack);
	}
	else {
		console.error('error: %s', message);
	}

	process.exit(1);
}

function makePath(pathname) {
	const pathBits = _path.normalize(pathname).split(_path.sep);

	for (let i = 0; i < pathBits.length; ++i) {
		const dirPath = i === 0 ? pathBits[i] : pathBits.slice(0, i + 1).join(_path.sep);

		if (!_fs.existsSync(dirPath)) {
			_fs.mkdirSync(dirPath);
		}
	}
}

function copyFile(srcFilename, destFilename) {
	const srcPath  = _path.normalize(srcFilename);
	const destPath = _path.normalize(destFilename);
	let buf;

	try {
		buf = _fs.readFileSync(srcPath);
	}
	catch (ex) {
		die(`cannot open file "${srcPath}" for reading (reason: ${ex.message})`);
	}

	try {
		_fs.writeFileSync(destPath, buf);
	}
	catch (ex) {
		die(`cannot open file "${destPath}" for writing (reason: ${ex.message})`);
	}

	return true;
}

function readFileContents(filename) {
	const filepath = _path.normalize(filename);

	try {
		// the replace() is necessary because Node.js only offers binary mode file
		// access, regardless of platform, so we convert DOS-style line terminators
		// to UNIX-style, just in case someone adds/edits a file and gets DOS-style
		// line termination all over it
		return _fs.readFileSync(filepath, { encoding : 'utf8' }).replace(/\r\n/g, '\n');
	}
	catch (ex) {
		die(`cannot open file "${filepath}" for reading (reason: ${ex.message})`);
	}
}

function writeFileContents(filename, data) {
	const filepath = _path.normalize(filename);

	try {
		_fs.writeFileSync(filepath, data, { encoding : 'utf8' });
	}
	catch (ex) {
		die(`cannot open file "${filepath}" for writing (reason: ${ex.message})`);
	}
}

function concatFiles(filenames, callback) {
	const output = filenames.map(filename => {
		const contents = readFileContents(filename);
		return typeof callback === 'function' ? callback(contents, filename) : contents;
	});
	return output.join('\n');
}

exports.log               = log;
exports.die               = die;
exports.makePath          = makePath;
exports.copyFile          = copyFile;
exports.readFileContents  = readFileContents;
exports.writeFileContents = writeFileContents;
exports.concatFiles       = concatFiles;
