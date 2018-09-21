const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const RawBundlerPlugin = require('webpack-raw-bundler');

module.exports = {
    entry: './generated/rt.js',
    mode: "production",
    plugins: [
      new HtmlWebpackPlugin({
          title: 'Caching',
          inlineSource: '.(js|css)$',
          template: 'source/index.html'
      }),
        new HtmlWebpackInlineSourcePlugin(),
    ],
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
    },
    resolve: {
        alias: {
            fs: path.resolve(__dirname, 'stubs/fs.js')
        }
    },
    context: path.resolve(__dirname, '.')
};
