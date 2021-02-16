#!/usr/bin/env node
/***********************************************************************************************************************

	build.js (v1.6.1, 2021-02-01)
		A Node.js-hosted build script for SugarCube.

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
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
		'vendor/lz-string.min.js',
		'vendor/seedrandom.min.js',
		'vendor/flatted.min.js',
		'vendor/FileSaver.min.js',
		'vendor/jquery.min.js',
		'vendor/jquery.ba-throttle-debounce.min.js',
		'vendor/imagesloaded.pkgd.min.js'
	],
	build : {
		src  : 'templates/html.tpl',
		dest : 'build/sugarcube-3/format.js',
		json : 'templates/config.json'
	},
	copy : [
		{
			src  : 'icon.svg',
			dest : 'build/sugarcube-3/icon.svg'
		},
		{
			src  : 'LICENSE',
			dest : 'build/sugarcube-3/LICENSE'
		}
	]
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
	// die,
	makePath,
	copyFile,
	readFileContents,
	writeFileContents,
	concatFiles
} = require('./scripts/build-utils');
const _fs   = require('fs');
const _path = require('path');
const _opt  = require('node-getopt').create([
	['d', 'debug',         'Keep debugging code; gated by DEBUG symbol.'],
	['u', 'unminified',    'Suppress minification stages.'],
	['n', 'no-transpile',  'Suppress JavaScript transpilation stages.'],
	['h', 'help',          'Print this help, then exit.']
])
	.bindHelp()     // bind option 'help' to default action
	.parseSystem(); // parse command line

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

	// Build for Twine ≥2.1.x compatible compilers.
	console.log('\nBuilding Twine ≥2.1.x compatible release:');

	// Process the story format templates and write the outfiles.
	projectBuild({
		build     : CONFIG.build,
		version   : version, // eslint-disable-line object-shorthand
		libSource : assembleLibraries(CONFIG.libs), // combine the libraries
		appSource : await compileJavaScript(),      // combine and minify the app JS
		cssSource : compileStyles(CONFIG.css),      // combine and minify the app CSS

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
	projectCopy(CONFIG.copy);

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

function compileJavaScript() {
	log('compiling JavaScript...');
	const rollup = require('rollup');
	const alias  = require('@rollup/plugin-alias');
	const babel  = require('@rollup/plugin-babel').babel;
	const terser = require('rollup-plugin-terser').terser;

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
		treeshake : false,
		plugins   : [
			alias({
				entries: [
					{ find : /^~\/(.*)(?:\.js)?$/, replacement : 'src/$1.js' }
				]
			})
		]
	};
	const rollupOutputOpts = {
		format : 'iife'
	};

	if (!_opt.options.noTranspile) {
		rollupInputOpts.plugins.push(
			babel({
				babelHelpers : 'bundled',
				code         : true,
				compact      : false,
				presets      : [['@babel/preset-env']],
				filename     : 'sugarcube.bundle.js'
			})
		);
	}

	if (!_opt.options.unminified) {
		rollupInputOpts.plugins.push(
			terser({
				compress : {
					global_defs : { // eslint-disable-line camelcase
						BUILD_DEBUG : _opt.options.debug || false
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
