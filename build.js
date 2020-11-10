#!/usr/bin/env node
/***********************************************************************************************************************

	build.js (v1.5.6, 2020-11-10)
		A Node.js-hosted build script for SugarCube.

	Copyright © 2013–2020 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/
/* eslint-env node, es6 */
/* eslint-disable strict */
'use strict';


/*******************************************************************************
	Configuration
*******************************************************************************/

const CONFIG = {
	css : [
		// The ordering herein is significant.
		'vendor/normalize.css',
		'src/css/init-screen.css',
		'src/css/font.css',
		'src/css/core.css',
		'src/css/core-display.css',
		'src/css/core-passage.css',
		'src/css/core-macro.css',
		'src/css/ui-dialog.css',
		'src/css/ui.css',
		'src/css/ui-bar.css',
		'src/css/ui-debug.css'
	],
	libs : [
		// The ordering herein is significant.
		'vendor/classList.min.js',
		'vendor/es5-shim.min.js',
		'vendor/es6-shim.min.js',
		'vendor/jquery.min.js',
		'vendor/jquery.ba-throttle-debounce.min.js',
		'vendor/imagesloaded.pkgd.min.js',
		'vendor/lz-string.min.js',
		'vendor/FileSaver.min.js',
		'vendor/seedrandom.min.js',
		'vendor/console-hack.min.js'
	],
	twine1 : {
		build : {
			src  : 'templates/twine1/html.tpl',
			dest : 'build/twine1/sugarcube-3/header.html'
		},
		copy : [
			{
				src  : 'templates/twine1/sugarcube-3.py',
				dest : 'build/twine1/sugarcube-3/sugarcube-3.py'
			},
			{
				src  : 'LICENSE',
				dest : 'build/twine1/sugarcube-3/LICENSE'
			}
		]
	},
	twine2 : {
		build : {
			src  : 'templates/twine2/html.tpl',
			dest : 'build/twine2/sugarcube-3/format.js',
			json : 'templates/twine2/config.json'
		},
		copy : [
			{
				src  : 'icon.svg',
				dest : 'build/twine2/sugarcube-3/icon.svg'
			},
			{
				src  : 'LICENSE',
				dest : 'build/twine2/sugarcube-3/LICENSE'
			}
		]
	}
};


/*******************************************************************************
	Main Script
*******************************************************************************/

// NOTICE!
//
// Where string replacements are done, we use the replacement function style to
// disable all special replacement patterns, since some of them may exist within
// the replacement strings—e.g., `$&` within the HTML or JavaScript sources.

const {
	log,
	die,
	makePath,
	copyFile,
	readFileContents,
	writeFileContents,
	concatFiles
} = require('./scripts/build-utils');
const _fs   = require('fs');
const _path = require('path');
const _opt  = require('node-getopt').create([
	['b', 'build=VERSION', 'Build only for Twine major version: 1 or 2; default: build for all.'],
	['d', 'debug',         'Keep debugging code; gated by DEBUG symbol.'],
	['u', 'unminified',    'Suppress minification stages.'],
	['6', 'es6',           'Suppress JavaScript transpilation stages.'],
	['h', 'help',          'Print this help, then exit.']
])
	.bindHelp()     // bind option 'help' to default action
	.parseSystem(); // parse command line

let _buildForTwine1 = true;
let _buildForTwine2 = true;

// build selection
if (_opt.options.build) {
	switch (_opt.options.build) {
		case '1':
			_buildForTwine2 = false;
			break;

		case '2':
			_buildForTwine1 = false;
			break;

		default:
			die(`unknown Twine major version: ${_opt.options.build}; valid values: 1 or 2`);
			break;
	}
}

// build the project
(async () => {
	console.log('Starting builds...');

	// Create the build ID file, if nonexistent.
	if (!_fs.existsSync('.build')) {
		writeFileContents('.build', '0');
	}

	// Get the version info and build metadata.
	const version = (() => {
		const semver = require('semver');
		const { name, version } = require('./package.json'); // relative path must be prefixed ('./')
		const prerelease = semver.prerelease(version);

		return {
			title      : name,
			major      : semver.major(version),
			minor      : semver.minor(version),
			patch      : semver.patch(version),
			prerelease : prerelease && prerelease.length > 0 ? prerelease.join('.') : null,
			build      : Number(readFileContents('.build')) + 1,
			date       : new Date().toISOString(),

			toString() {
				const prerelease = this.prerelease ? `-${this.prerelease}` : '';
				return `${this.major}.${this.minor}.${this.patch}${prerelease}`;
			}
		};
	})();

	// Build for Twine 2.x.
	if (_buildForTwine2 && CONFIG.twine2) {
		console.log('\nBuilding Twine 2.x compatible release:');

		// Process the story format templates and write the outfiles.
		projectBuild({
			build     : CONFIG.twine2.build,
			version   : version, // eslint-disable-line object-shorthand
			libSource : assembleLibraries(CONFIG.libs),                   // combine the libraries
			appSource : await compileJavaScript({ compiler : 'twine2' }), // combine and minify the app JS
			cssSource : compileStyles(CONFIG.css),                        // combine and minify the app CSS

			postProcess(sourceString) {
				// Load the output format.
				let output = require(`./${_path.normalize(this.build.json)}`); // relative path must be prefixed ('./')

				// Merge data into the output format.
				output = Object.assign(output, {
					description : output.description.replace(
						/(['"`])\{\{BUILD_VERSION_MAJOR\}\}\1/g,
						() => this.version.major
					),
					version : this.version.toString(),
					source  : sourceString
				});

				// Wrap the output in the `storyFormat()` function.
				output = `window.storyFormat(${JSON.stringify(output)});`;

				return output;
			}
		});

		// Process the files that simply need copied into the build.
		projectCopy(CONFIG.twine2.copy);
	}

	// Build for Twine 1.x.
	if (_buildForTwine1 && CONFIG.twine1) {
		console.log('\nBuilding Twine 1.x compatible release:');

		// Process the header templates and write the outfiles.
		projectBuild({
			build     : CONFIG.twine1.build,
			version   : version, // eslint-disable-line object-shorthand
			libSource : assembleLibraries(CONFIG.libs),                   // combine the libraries
			appSource : await compileJavaScript({ compiler : 'twine1' }), // combine and minify the app JS
			cssSource : compileStyles(CONFIG.css)                         // combine and minify the app CSS
		});

		// Process the files that simply need copied into the build.
		projectCopy(CONFIG.twine1.copy);
	}

	// Update the build ID.
	writeFileContents('.build', String(version.build));
})()
	// That's all folks!
	.then(() => console.log('\nBuilds complete!  (check the "build" directory)'))
	.catch(reason => console.log('\nERROR:', reason));


/*******************************************************************************
	Utility Functions
*******************************************************************************/
function assembleLibraries(filenames) {
	log('assembling libraries...');

	return concatFiles(filenames, contents => contents.replace(/^\n+|\n+$/g, ''));
}

function compileJavaScript(options) {
	log('compiling JavaScript...');
	const rollup       = require('rollup');
	const includepaths = require('rollup-plugin-includepaths');
	// const replace      = require('@rollup/plugin-replace');
	const babel        = require('rollup-plugin-babel');
	const uglify       = require('rollup-plugin-uglify').uglify;

	const rollupInputOpts = {
		input  : 'src/sugarcube.js',
		onwarn : warning => {
			// Handle some warnings.
			switch (warning.code) {
				// Squelch Rollup's circular dependency complaint.
				case 'CIRCULAR_DEPENDENCY': return;
				// Squelch Rollup's tone-deaf `eval()` complaint.
				case 'EVAL': return;

				// case 'NON_EXISTENT_EXPORT':
				// case 'UNUSED_EXTERNAL_IMPORT':
				// 	throw new Error(warning.message);
			}

			// Log everything else.
			console.warn(`${warning.code}: ${warning.message}`);
		},
		treeshake : false, // FIXME: Can/should we make this no longer required?
		plugins   : [
			includepaths({
				paths : [
					// Allow paths relative to `src` directory on imports.
					//
					// NOTE: The paths still need to be prefixed with `./` or
					// Rollup assumes they're external if their names happen
					// to match a well known package.
					'src'
				]
			})
			// // NOTE: Reenable `replace()` and remove the `uglify()` options
			// // when the treeshaking issue is resolved.
			// replace({
			// 	BUILD_TWINE_2 : options.compiler === 'twine2',
			// 	BUILD_TWINE_1 : options.compiler === 'twine1',
			// 	BUILD_DEBUG   : _opt.options.debug || false
			// })
		]
	};
	const rollupOutputOpts = {
		format : 'iife'
	};

	if (!_opt.options.es6) {
		rollupInputOpts.plugins.push(
			babel({
				code     : true,
				compact  : false,
				presets  : [['@babel/preset-env', { modules : false }]],
				// plugins  : ['@babel/plugin-external-helpers'],
				filename : 'sugarcube.bundle.js'
			})
		);
	}

	// uglify-js (v2) does not support ES6, so bypass minification when `es6` is enabled.
	if (!_opt.options.unminified && !_opt.options.es6) {
		rollupInputOpts.plugins.push(
			uglify({
				compress : {
					global_defs : { // eslint-disable-line camelcase
						BUILD_TWINE_2 : options.compiler === 'twine2',
						BUILD_TWINE_1 : options.compiler === 'twine1',
						BUILD_DEBUG   : _opt.options.debug || false
					}
				},
				mangle : false
			})
		);
	}

	async function compile() {
		const bundle     = await rollup.rollup(rollupInputOpts);
		const { output } = await bundle.generate(rollupOutputOpts);
		const code = output.map(chunk => chunk.code).join('');

		if (_opt.options.unminified) {
			return [
				`window.BUILD_TWINE_2=${options.compiler === 'twine2'}`,
				`window.BUILD_TWINE_1=${options.compiler === 'twine1'}`,
				`window.BUILD_DEBUG=${_opt.options.debug || false}`,
				code
			].join(';\n');
		}

		return code.trimRight();
	}

	return compile();
}

function compileStyles(filenames) {
	log('compiling CSS...');
	const autoprefixer    = require('autoprefixer');
	const postcss         = require('postcss');
	const CleanCSS        = require('clean-css');
	const normalizeRegExp = /normalize\.css$/;

	return concatFiles(filenames, (contents, filename) => {
		let css = contents;

		// Do not run autoprefixer on 'normalize.css'.
		if (!normalizeRegExp.test(filename)) {
			const processed = postcss([autoprefixer]).process(css, { from : filename });

			css = processed.css;

			processed.warnings().forEach(mesg => console.warn(mesg.text));
		}

		if (!_opt.options.unminified) {
			css = new CleanCSS({
				level         : 1,    // [clean-css v4] `1` is the default, but let's be specific
				compatibility : 'ie9' // [clean-css v4] 'ie10' is the default, so restore IE9 support
			})
				.minify(css)
				.styles;
		}

		const fileSlug = _path.basename(filename, '.css').toLowerCase().replace(/[^0-9a-z]+/g, '-');

		return `<style id="style-${fileSlug}" type="text/css">${css}</style>`;
	});
}

function projectBuild(project) {
	const infile  = _path.normalize(project.build.src);
	const outfile = _path.normalize(project.build.dest);

	log(`building: "${outfile}"`);

	let output = readFileContents(infile); // load the story format template

	// Process the source replacement tokens. (First!)
	output = output.replace(/(['"`])\{\{BUILD_LIB_SOURCE\}\}\1/, () => project.libSource);
	output = output.replace(/(['"`])\{\{BUILD_APP_SOURCE\}\}\1/, () => project.appSource);
	output = output.replace(/(['"`])\{\{BUILD_CSS_SOURCE\}\}\1/, () => project.cssSource);

	// Process the build replacement tokens.
	const prerelease = JSON.stringify(project.version.prerelease);
	const date       = JSON.stringify(project.version.date);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_MAJOR\}\}\1/g, () => project.version.major);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_MINOR\}\}\1/g, () => project.version.minor);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_PATCH\}\}\1/g, () => project.version.patch);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_PRERELEASE\}\}\1/g, () => prerelease);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_BUILD\}\}\1/g, () => project.version.build);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_DATE\}\}\1/g, () => date);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_VERSION\}\}\1/g, () => project.version);

	// Post-process hook.
	if (typeof project.postProcess === 'function') {
		output = project.postProcess(output);
	}

	// Write the outfile.
	makePath(_path.dirname(outfile));
	writeFileContents(outfile, output);
}

function projectCopy(fileObjs) {
	fileObjs.forEach(file => {
		const infile  = _path.normalize(file.src);
		const outfile = _path.normalize(file.dest);

		log(`copying : "${outfile}"`);

		makePath(_path.dirname(outfile));
		copyFile(infile, outfile);
	});
}
