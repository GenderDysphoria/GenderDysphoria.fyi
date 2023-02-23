/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

const express = require('express');
const morgan = require('morgan');
const directory = require('serve-index');
const log = require('fancy-log');

var app = express();

app.disable('etag');
app.use(morgan('dev'));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  req.headers['if-none-match'] = 'no-match-for-this';
  next();
});

app.use(express.static('dist', { etag: false, maxAge: 5 }));

app.use(directory('dist', { 'icons': true }));

app.get('/i', (req, res) => res.send(''));

app.listen(process.env.PORT || 8000, () => log('Listening on http://127.0.0.1:8000'));
