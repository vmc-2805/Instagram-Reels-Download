'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

function assetVersion(relativePath) {
  try {
    const file = path.join(__dirname, '..', '..', 'public', relativePath);
    return String(Math.floor(fs.statSync(file).mtimeMs));
  } catch {
    return '1';
  }
}

const CSS_VERSION = assetVersion('css/styles.css');
const JS_VERSION = assetVersion('js/app.js');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const NAV = [
  { href: '/', label: 'Video' },
  { href: '/audio', label: 'Audio' },
  { href: '/photo', label: 'Photo' },
];

function header(active) {
  const links = NAV.map(
    (item) =>
      `<a class="nav-link${item.href === active ? ' is-active' : ''}" href="${item.href}" data-i18n="nav.${item.label.toLowerCase()}">${item.label}</a>`
  ).join('');

  return `
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${escapeHtml(config.siteName)} — home">
        <img class="brand-logo brand-logo-dark" src="/logo.png" alt="${escapeHtml(config.siteName)}" loading="eager">
        <img class="brand-logo brand-logo-light" src="/light-logo.png" alt="${escapeHtml(config.siteName)}" loading="eager">
      </a>

      <div class="header-spacer"></div>

      <div class="header-right">
        <nav class="nav" id="site-nav">${links}</nav>

        <div class="lang-wrap" id="lang-wrap">
          <button class="lang-btn" id="lang-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
            <span class="lang-btn-flag" id="lang-btn-flag">EN</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="lang-dropdown" id="lang-dropdown" role="listbox" aria-label="Select language"></div>
        </div>

        <div class="header-actions">
          <button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle dark mode">
            <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            </svg>
            <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
          </button>
          <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 8h16M4 16h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="/" aria-label="${escapeHtml(config.siteName)} — home">
            <img class="brand-logo brand-logo-dark" src="/logo.png" alt="${escapeHtml(config.siteName)}" loading="lazy">
            <img class="brand-logo brand-logo-light" src="/light-logo.png" alt="${escapeHtml(config.siteName)}" loading="lazy">
          </a>
          <p class="footer-desc" data-i18n="footer.desc">Save public Instagram videos, reels and photos in original quality, or pull a reel's audio as MP3. No app, no sign in.</p>
        </div>

        <div class="footer-links">
          <div class="footer-col">
            <h3 data-i18n="footer.downloads">Downloaders</h3>
            <a href="/" data-i18n="footer.video_dl">Video downloader</a>
            <a href="/audio" data-i18n="footer.audio_dl">Reels audio to MP3</a>
            <a href="/photo" data-i18n="footer.photo_dl">Photo downloader</a>
          </div>
          <div class="footer-col">
            <h3 data-i18n="footer.site">Site</h3>
            <a href="/about" data-i18n="footer.about">About</a>
            <a href="/privacy" data-i18n="footer.privacy">Privacy policy</a>
            <a href="/terms" data-i18n="footer.terms">Terms of use</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; ${year} ${escapeHtml(config.siteName)}. <span data-i18n="footer.copy">Not affiliated with, endorsed by or sponsored by Instagram or Meta Platforms, Inc.</span></p>
      </div>
    </div>
  </footer>`;
}

function layout({
  title,
  description,
  active = '',
  canonical = '/',
  body,
  jsonLd = null,
  robots = 'index, follow, max-image-preview:large',
  ogImage = '/og-image.png',
  breadcrumbs = [],
  renderBreadcrumbNav = true
}) {
  const url = `${config.siteUrl}${canonical}`;
  const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${config.siteUrl}${ogImage}`;

  // Breadcrumbs JSON-LD Schema
  let breadcrumbListSchema = null;
  if (breadcrumbs && breadcrumbs.length > 0) {
    breadcrumbListSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': crumb.name,
        'item': crumb.item ? `${config.siteUrl}${crumb.item}` : undefined
      }))
    };
  }

  // Compile all schemas
  let schemas = [];
  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      schemas.push(...jsonLd);
    } else {
      schemas.push(jsonLd);
    }
  }
  if (breadcrumbListSchema) {
    schemas.push(breadcrumbListSchema);
  }

  const structured = schemas.map(schema =>
    `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
  ).join('\n');

  // Breadcrumbs Visual HTML
  let breadcrumbsHtml = '';
  if (breadcrumbs && breadcrumbs.length > 0 && renderBreadcrumbNav) {
    const items = breadcrumbs.map((crumb, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      const label = crumb.name;
      const href = crumb.item;
      const key = crumb.key || `seo.bread.${label.toLowerCase().replace(/\s+/g, '_')}`;
      if (isLast || !href) {
        return `<span class="breadcrumbs-current" data-i18n="${key}">${escapeHtml(label)}</span>`;
      }
      return `<a href="${href}" class="breadcrumbs-link" data-i18n="${key}">${escapeHtml(label)}</a>`;
    }).join(' <span class="breadcrumbs-separator" aria-hidden="true">&rsaquo;</span> ');

    breadcrumbsHtml = `
  <nav class="breadcrumbs-nav" aria-label="Breadcrumb">
    <div class="container">
      <div class="breadcrumbs">
        ${items}
      </div>
    </div>
  </nav>`;
  }

  const orgSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': config.siteName,
    'url': config.siteUrl,
    'logo': `${config.siteUrl}/logo.png`,
    'sameAs': []
  });

  const websiteSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': config.siteName,
    'url': config.siteUrl,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${config.siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title data-i18n-title="${escapeHtml(title)}">${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="${escapeHtml(config.siteName)}">
<meta name="keywords" content="instagram downloader, instagram video downloader, instagram reels download, instagram photo download, reels to mp3, instagram saver, download instagram reels, save instagram video, ig downloader, instagram video saver">
<meta name="robots" content="${escapeHtml(robots)}">
<meta name="googlebot" content="${escapeHtml(robots)}">
<meta name="language" content="English">
<meta name="theme-color" content="#fafafe">
<meta name="msapplication-TileColor" content="#fafafe">
<link rel="canonical" href="${escapeHtml(url)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(url)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(url)}">
${config.searchConsole ? `<meta name="google-site-verification" content="${escapeHtml(config.searchConsole)}">` : ''}
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/logo.png">
<link rel="manifest" href="/manifest.json">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(config.siteName)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ogImageUrl)}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">
<meta name="twitter:image:alt" content="${escapeHtml(title)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css?v=${CSS_VERSION}">
<script>
  try {
    var stored = localStorage.getItem('theme');
    document.documentElement.dataset.theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) { document.documentElement.dataset.theme = 'light'; }
</script>
${structured}
<script type="application/ld+json">${orgSchema}</script>
<script type="application/ld+json">${websiteSchema}</script>
${config.googleAnalytics ? `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(config.googleAnalytics)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${escapeHtml(config.googleAnalytics)}');
</script>` : ''}
</head>
<body>
<canvas class="mesh-canvas" id="mesh-canvas" aria-hidden="true"></canvas>
${header(active)}
<main id="main">
${breadcrumbsHtml}
${body}
</main>
${footer()}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/js/locales/en.js"></script>
<script src="/js/i18n.js"></script>
<script src="/js/app.js?v=${JS_VERSION}" defer></script>
</body>
</html>`;
}

module.exports = { layout, escapeHtml };
