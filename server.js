'use strict';

const path = require('path');
const express = require('express');

const config = require('./src/config');
const apiRouter = require('./src/routes/api');
const pages = require('./src/views/pages');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Basic hardening. No inline-script CSP because the theme bootstrap and the
// JSON-LD blocks are inline by design.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
  })
);

app.use('/api', apiRouter);

// Pages themselves must not be cached, otherwise a browser holding yesterday's
// HTML never sees the new versioned asset urls inside it.
const html = (res, markup) =>
  res.set('Cache-Control', 'no-cache').type('html').send(markup);

app.get('/', (req, res) => html(res, pages.home()));
app.get('/audio', (req, res) => html(res, pages.audio()));

// Old URLs kept alive so existing links and bookmarks do not 404.
app.get('/reels', (req, res) => res.redirect(301, '/audio'));
app.get('/igtv', (req, res) => res.redirect(301, '/'));
app.get('/story', (req, res) => res.redirect(301, '/'));
app.get('/photo', (req, res) => html(res, pages.photo()));
app.get('/about', (req, res) => html(res, pages.about()));
app.get('/contact', (req, res) => html(res, pages.contact()));
app.get('/privacy', (req, res) => html(res, pages.privacy()));
app.get('/terms', (req, res) => html(res, pages.terms()));

app.get('/llms.txt', (req, res) => {
  res
    .type('text/plain')
    .send(`# InstaSaver

> Free online tool to download Instagram videos, reels, photos, and audio (MP3) in original quality. No sign-in required.

## What It Does
- Download Instagram videos and reels as MP4 in original quality
- Extract Instagram reel audio and save as MP3
- Download Instagram photos and carousels in full resolution JPG

## Pages
- Home (Video Downloader): ${config.siteUrl}/
- Reels Audio to MP3: ${config.siteUrl}/audio
- Photo Downloader: ${config.siteUrl}/photo
- About: ${config.siteUrl}/about
- Contact: ${config.siteUrl}/contact
- Privacy Policy: ${config.siteUrl}/privacy
- Terms of Use: ${config.siteUrl}/terms

## Contact
For bug reports or takedown requests: ${config.siteUrl}/contact

## Legal
- Only downloads public Instagram content
- Not affiliated with Instagram or Meta Platforms, Inc.
`);
});

app.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .send(`User-agent: *
Allow: /
Disallow: /api/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${config.siteUrl}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const routes = ['/', '/audio', '/photo', '/about', '/contact', '/privacy', '/terms'];
  const urls = routes
    .map(
      (route) =>
        `  <url><loc>${config.siteUrl}${route}</loc><changefreq>weekly</changefreq><priority>${route === '/' ? '1.0' : '0.7'}</priority></url>`
    )
    .join('\n');

  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Unknown endpoint.' });
  }
  res.status(404).type('html').send(pages.notFound());
});

app.use((error, req, res, next) => {
  console.error('[server]', error);
  if (res.headersSent) return next(error);
  res.status(500).type('html').send(pages.notFound());
});

app.listen(config.port, () => {
  console.log(`\n  ${config.siteName} running at http://localhost:${config.port}`);
  console.log(`  Instagram session cookie: ${config.sessionId ? 'configured' : 'not set (stories disabled)'}\n`);
});
