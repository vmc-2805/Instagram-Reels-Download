/* InstaSaver i18n — auto-flatten nested locale files, dynamic language loading. */
(() => {
  'use strict';

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'pt', label: 'Português' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'ru', label: 'Русский' },
    { code: 'it', label: 'Italiano' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'th', label: 'ไทย' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'ur', label: 'اردو' },
  ];

  // Flatten a nested object into dot-notation keys
  function flatten(obj, prefix) {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullKey = prefix ? prefix + '.' + key : key;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, flatten(val, fullKey));
      } else {
        result[fullKey] = val;
      }
    }
    return result;
  }

  // Storage for flattened translations per language
  const flat = {};

  // Register a raw nested locale object
  function register(code, nested) {
    flat[code] = flatten(nested, '');
  }

  // Process any locales already on window.__locales
  if (window.__locales) {
    for (const code of Object.keys(window.__locales)) {
      register(code, window.__locales[code]);
    }
  }

  // Dynamically load a language file if not already loaded
  function loadLang(code) {
    return new Promise((resolve, reject) => {
      if (flat[code]) return resolve();
      // If raw nested data is on window.__locales but not flattened yet
      if (window.__locales && window.__locales[code]) {
        register(code, window.__locales[code]);
        return resolve();
      }
      const script = document.createElement('script');
      script.src = '/js/locales/' + code + '.js';
      script.onload = () => {
        if (window.__locales && window.__locales[code]) {
          register(code, window.__locales[code]);
        }
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load locale: ' + code));
      document.head.appendChild(script);
    });
  }

  // Apply translations to the DOM
  function applyLang(lang) {
    const dict = flat[lang] || flat.en;
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      } else if (flat.en && flat.en[key] !== undefined) {
        el.innerHTML = flat.en[key];
      }
    });

    // Page title
    const titleEl = document.querySelector('title[data-i18n-title]');
    if (titleEl) {
      const titleKey = titleEl.getAttribute('data-i18n-title');
      const titleMap = {
        en: 'Video Downloader',
        es: 'Descargador de video',
        pt: 'Downloader de vídeo',
        fr: 'Téléchargeur vidéo',
        de: 'Video-Downloader',
        hi: 'वीडियो डाउनलोडर',
        ar: 'حمّل الفيديو',
        zh: '视频下载器',
        ja: '動画ダウンローダー',
        ko: '비디오 다운로더',
        ru: 'Загрузчик видео',
        it: 'Downloader video',
        tr: 'Video indirici',
        vi: 'Trình tải video',
        th: 'ตัวดาวน์โหลดวิดีโอ',
        nl: 'Video-downloader',
        pl: 'Pobieranie wideo',
        id: 'Pengunduh video',
        bn: 'ভিডিও ডাউনলোডার',
        ur: 'ویڈیو ڈاؤن لوڈر',
      };
      const siteName = 'InstaSaver';
      const prefix = titleMap[lang] || titleMap.en;
      titleEl.textContent = prefix + ' | ' + siteName;
    }

    document.documentElement.setAttribute('lang', lang);
  }

  // Expose API
  window.InstasaverI18n = { LANGUAGES, flat, register, loadLang, applyLang };
})();
