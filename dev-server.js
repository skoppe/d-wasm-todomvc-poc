const webpack = require('webpack');
const middleware = require('webpack-dev-middleware');
const config = require('./webpack.config.js');
const compiler = webpack(config);
const express = require('express');
const app = express();

console.log(config);
app.use(middleware(compiler, {
}));
app.use(express.static('./dist',{setHeaders: function(req, path, stat){
    req.set('Content-Type', "application/wasm");
}}))

app.listen(3000, () => console.log('Example app listening on port 3000!'))
