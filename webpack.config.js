var webpack = require('webpack');
var loaders = require('./webpack.loaders.js');

module.exports = {
	devtool: 'source-map',
	context: __dirname + '/src',
	entry: {
		'open-physiology-manifest': [ 'babel-polyfill', './index.js' ],
		'open-physiology-manifest-minimal':           [ './index.js' ]
	},
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		library: 'OpenPhysiologyManifest',
		libraryTarget: 'umd',
		sourceMapFilename: '[file].map',
		/* source-map support for IntelliJ/WebStorm */
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
	},
	module: {
		loaders: loaders
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin()
	]
};
