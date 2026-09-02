'use strict';

const config = require('./config');

const seoConfig = {
  '/': {
    title: 'InstaSaver — Instagram Video Downloader (HD & Free)',
    description: 'Download Instagram videos, reels, photos, and carousels in HD quality for free. Fast, no registration needed, works on mobile & desktop.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [], // Home is the root, no breadcrumbs displayed
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${config.siteUrl}/#website`,
        'name': config.siteName,
        'url': config.siteUrl
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${config.siteUrl}/#webapplication`,
        'name': config.siteName,
        'url': url,
        'applicationCategory': 'MultimediaApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires HTML5',
        'offers': {
          '@type': 'Offer',
          'price': '0.00',
          'priceCurrency': 'USD'
        }
      }
    ]
  },
  '/audio': {
    title: 'Instagram Reels Audio Downloader — Reel to MP3',
    description: 'Convert and download Instagram reels audio to MP3 in high quality. Extract sound from any public Instagram reel easily for free.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: 'Reels Audio', item: '/audio', key: 'seo.bread.audio' }
    ],
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${config.siteUrl}/audio#webapplication`,
        'name': `Reels Audio Downloader | ${config.siteName}`,
        'url': url,
        'applicationCategory': 'MultimediaApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires HTML5',
        'offers': {
          '@type': 'Offer',
          'price': '0.00',
          'priceCurrency': 'USD'
        }
      }
    ]
  },
  '/photo': {
    title: 'Instagram Photo Downloader — Download Full HD JPG',
    description: 'Download Instagram photos and carousels in high resolution JPG format. Simple, fast and free Instagram picture downloader.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: 'Photo Downloader', item: '/photo', key: 'seo.bread.photo' }
    ],
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${config.siteUrl}/photo#webapplication`,
        'name': `Photo Downloader | ${config.siteName}`,
        'url': url,
        'applicationCategory': 'MultimediaApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires HTML5',
        'offers': {
          '@type': 'Offer',
          'price': '0.00',
          'priceCurrency': 'USD'
        }
      }
    ]
  },
  '/about': {
    title: 'About InstaSaver — Free Instagram Downloader',
    description: 'Learn more about InstaSaver, a free web tool to download Instagram videos, reels, photos, and audio. Simple, fast, and no registration.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: 'About', item: '/about', key: 'footer.about' }
    ],
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': `${config.siteUrl}/about#webpage`,
        'name': `About | ${config.siteName}`,
        'description': 'Learn more about InstaSaver and how to download Instagram media.',
        'url': url
      }
    ]
  },
  '/privacy': {
    title: 'Privacy Policy | InstaSaver Instagram Downloader',
    description: 'Read the privacy policy of InstaSaver. Learn how we handle your data, rate limit checks, logs, and respect your privacy.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: 'Privacy Policy', item: '/privacy', key: 'footer.privacy' }
    ],
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'PrivacyPolicy',
        '@id': `${config.siteUrl}/privacy#webpage`,
        'name': `Privacy Policy | ${config.siteName}`,
        'url': url
      }
    ]
  },
  '/terms': {
    title: 'Terms of Use | InstaSaver Instagram Downloader',
    description: 'Understand the terms of use for InstaSaver. Guidelines on acceptable usage, copyright compliance, and disclaimer of liability.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: 'Terms of Use', item: '/terms', key: 'footer.terms' }
    ],
    schema: (url) => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${config.siteUrl}/terms#webpage`,
        'name': `Terms of Use | ${config.siteName}`,
        'url': url
      }
    ]
  },
  '404': {
    title: 'Page Not Found | InstaSaver',
    description: 'The requested page was not found on InstaSaver. Go back to our free Instagram video, reel, and photo downloader.',
    robots: 'noindex, nofollow',
    ogImage: '/og-image.png',
    breadcrumbs: [
      { name: 'Home', item: '/', key: 'seo.bread.home' },
      { name: '404 Not Found', item: '', key: 'seo.bread.404' }
    ],
    schema: (url) => []
  }
};

module.exports = seoConfig;
