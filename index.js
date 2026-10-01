require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/urlshortener')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Create short URL
app.post('/api/shorturl', function(req, res) {

  const inputUrl = req.body.url;

  let url;

  try {
    url = new URL(inputUrl);
  } catch (error) {
    return res.json({ error: 'invalid url' });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(url.hostname, async function(err) {

    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {

      const latest = await Url.findOne().sort({ short_url: -1 });

      const nextShortUrl = latest ? latest.short_url + 1 : 1;

      const newUrl = new Url({
        original_url: inputUrl,
        short_url: nextShortUrl
      });

      const savedUrl = await newUrl.save();

      res.json({
        original_url: savedUrl.original_url,
        short_url: savedUrl.short_url
      });

    } catch (error) {
      res.status(500).json({ error: 'database error' });
    }

  });

});

// Redirect short URL
app.get('/api/shorturl/:short_url', async function(req, res) {

  try {

    const url = await Url.findOne({
      short_url: req.params.short_url
    });

    if (!url) {
      return res.json({ error: 'No short URL found' });
    }

    res.redirect(url.original_url);

  } catch (error) {
    res.status(500).json({ error: 'database error' });
  }

});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});