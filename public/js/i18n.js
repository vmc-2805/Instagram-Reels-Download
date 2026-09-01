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

    const breadcrumbTranslations = {
      'seo.bread.home': {
        en: 'Home', es: 'Inicio', pt: 'Início', fr: 'Accueil', de: 'Startseite',
        hi: 'होम', ar: 'الرئيسية', zh: '首页', ja: 'ホーム', ko: '홈',
        ru: 'Главная', it: 'Home', tr: 'Ana Sayfa', vi: 'Trang chủ', th: 'หน้าแรก',
        nl: 'Home', pl: 'Główna', id: 'Beranda', bn: 'হোม', ur: 'ہوم'
      },
      'seo.bread.audio': {
        en: 'Reels Audio', es: 'Audio de Reels', pt: 'Áudio do Reels', fr: 'Audio de Reels', de: 'Reels-Audio',
        hi: 'रील्स ऑडियो', ar: 'صوت ريلز', zh: 'Reels 音频', ja: 'リール音声', ko: '릴스 오디오',
        ru: 'Аудио Рилс', it: 'Audio Reels', tr: 'Reels Ses', vi: 'Âm thanh Reels', th: 'เสียง Reels',
        nl: 'Reels-audio', pl: 'Audio z Reels', id: 'Audio Reels', bn: 'রিলস অডিও', ur: 'ریلز آڈیو'
      },
      'seo.bread.photo': {
        en: 'Photo Downloader', es: 'Descargador de fotos', pt: 'Downloader de fotos', fr: 'Téléchargeur de photos', de: 'Foto-Downloader',
        hi: 'फोटो डाउनलोडर', ar: 'تحميل الصور', zh: '照片下载器', ja: '写真ダウンロード', ko: '사진 다운로더',
        ru: 'Загрузчик фото', it: 'Downloader foto', tr: 'Fotoğraf İndirici', vi: 'Trình tải ảnh', th: 'ตัวดาวน์โหลดรูปภาพ',
        nl: 'Photo Downloader', pl: 'Pobieranie zdjęć', id: 'Pengunduh Foto', bn: 'ফটো ডাউনলোডার', ur: 'فوٹو ڈاؤنلوڈر'
      },
      'seo.bread.404': {
        en: '404 Not Found', es: '404 No encontrado', pt: '404 Não encontrado', fr: '404 Introuvable', de: '404 Nicht gefunden',
        hi: '404 नहीं मिला', ar: '404 غير موجود', zh: '404 未找到', ja: '404 見つかりません', ko: '404 찾을 수 없음',
        ru: '404 Не найдено', it: '404 Non trovato', tr: '404 Bulunamadı', vi: '404 Không tìm thấy', th: '404 ไม่พบหน้า',
        nl: '404 Niet gevonden', pl: '404 Nie znaleziono', id: '404 Tidak Ditemukan', bn: '404 পাওয়া যায়নি', ur: '404 नहीं ملا'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (breadcrumbTranslations[key] !== undefined) {
        el.innerHTML = breadcrumbTranslations[key][lang] || breadcrumbTranslations[key].en;
      } else if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      } else if (flat.en && flat.en[key] !== undefined) {
        el.innerHTML = flat.en[key];
      }
    });

    // Page title
    const titleEl = document.querySelector('title[data-i18n-title]');
    if (titleEl) {
      const path = window.location.pathname;
      const titleMaps = {
        '/': {
          en: 'InstaSaver — Instagram Video Downloader (HD & Free)',
          es: 'InstaSaver — Descargador de videos de Instagram (HD y gratis)',
          pt: 'InstaSaver — Downloader de vídeos do Instagram (HD e grátis)',
          fr: 'InstaSaver — Téléchargeur de vidéos Instagram (HD & Gratuit)',
          de: 'InstaSaver — Instagram-Video-Downloader (HD & kostenlos)',
          hi: 'InstaSaver — इंस्टाग्राम वीडियो डाउनलोडर (HD और फ्री)',
          ar: 'InstaSaver — تحميل فيديو انستقرام (HD ومجاني)',
          zh: 'InstaSaver — Instagram 视频下载器 (HD & 免费)',
          ja: 'InstaSaver — Instagram動画ダウンロード (HD & 無料)',
          ko: 'InstaSaver — 인스타그램 동영상 다운로더 (HD & 무료)',
          ru: 'InstaSaver — Скачать видео из Инстаграм (HD и бесплатно)',
          it: 'InstaSaver — Downloader di video Instagram (HD e gratuito)',
          tr: 'InstaSaver — Instagram Video Dönüştürücü (HD & Ücretsiz)',
          vi: 'InstaSaver — Trình tải video Instagram (HD & Miễn phí)',
          th: 'InstaSaver — ดาวน์โหลดวิดีโอ Instagram (HD & ฟรี)',
          nl: 'InstaSaver — Instagram Video Downloader (HD & gratis)',
          pl: 'InstaSaver — Pobieranie filmów z Instagrama (HD i bezpłatnie)',
          id: 'InstaSaver — Pengunduh Video Instagram (HD & Gratis)',
          bn: 'InstaSaver — ইনস্টাগ্রাম ভিডিও ডাউনলোডার (HD এবং ফ্রি)',
          ur: 'InstaSaver — انسٹاگرام ویڈیو ڈاؤنلوڈر (HD اور مفت)',
        },
        '/audio': {
          en: 'Instagram Reels Audio Downloader — Reel to MP3 | InstaSaver',
          es: 'Descargador de audio de Instagram Reels — Reel a MP3 | InstaSaver',
          pt: 'Downloader de áudio do Instagram Reels — Reel para MP3 | InstaSaver',
          fr: 'Téléchargeur audio Instagram Reels — Reel en MP3 | InstaSaver',
          de: 'Instagram Reels Audio Downloader — Reel zu MP3 | InstaSaver',
          hi: 'इंस्टाग्राम रील्स ऑडियो डाउनलोडर — रील से MP3 | InstaSaver',
          ar: 'تحميل صوت ريلز انستقرام — ريلز إلى MP3 | InstaSaver',
          zh: 'Instagram Reels 音频下载器 — Reel 转 MP3 | InstaSaver',
          ja: 'Instagram Reels音声ダウンロード — リールからMP3 | InstaSaver',
          ko: '인스타그램 릴스 오디오 다운로더 — 릴스에서 MP3로 | InstaSaver',
          ru: 'Скачать аудио из Инстаграм Рилс — Рилс в MP3 | InstaSaver',
          it: 'Downloader audio Instagram Reels — da Reel a MP3 | InstaSaver',
          tr: 'Instagram Reels Ses İndirici — Reel MP3 yapma | InstaSaver',
          vi: 'Trình tải âm thanh Instagram Reels — Reel sang MP3 | InstaSaver',
          th: 'ดาวน์โหลดเสียง Instagram Reels — Reel เป็น MP3 | InstaSaver',
          nl: 'Instagram Reels Audio Downloader — Reel naar MP3 | InstaSaver',
          pl: 'Pobieranie audio z Instagram Reels — Reel do MP3 | InstaSaver',
          id: 'Pengunduh Audio Instagram Reels — Reel ke MP3 | InstaSaver',
          bn: 'ইনস্টাগ্রাম রিলস অ디오 ডাউনলোডার — রিল থেকে MP3 | InstaSaver',
          ur: 'انسٹاگرام ریلز آڈیو ڈاؤنلوڈر — ریل سے MP3 | InstaSaver',
        },
        '/photo': {
          en: 'Instagram Photo Downloader — Download Full HD JPG | InstaSaver',
          es: 'Descargador de fotos de Instagram — Descargar JPG Full HD | InstaSaver',
          pt: 'Downloader de fotos do Instagram — Baixar JPG Full HD | InstaSaver',
          fr: 'Téléchargeur de photos Instagram — Télécharger JPG Full HD | InstaSaver',
          de: 'Instagram-Foto-Downloader — Full HD JPG herunterladen | InstaSaver',
          hi: 'इंस्टाग्राम फोटो डाउनलोडर — फुल HD JPG डाउनलोड करें | InstaSaver',
          ar: 'تحميل صور انستقرام — تحميل JPG بجودة Full HD | InstaSaver',
          zh: 'Instagram 照片下载器 — 下载全高清 JPG | InstaSaver',
          ja: 'Instagram写真ダウンロード — フルHD JPG의 저장 | InstaSaver',
          ko: '인스타그램 사진 다운로더 — 풀 HD JPG 다운로드 | InstaSaver',
          ru: 'Скачать фото из Инстаграм — Скачать Full HD JPG | InstaSaver',
          it: 'Downloader di foto Instagram — Scarica JPG Full HD | InstaSaver',
          tr: 'Instagram Fotoğraf İndirici — Full HD JPG indir | InstaSaver',
          vi: 'Trình tải ảnh Instagram — Tải ảnh JPG Full HD | InstaSaver',
          th: 'ดาวน์โหลดรูปภาพ Instagram — ดาวน์โหลด JPG แบบ Full HD | InstaSaver',
          nl: 'Instagram Photo Downloader — Download Full HD JPG | InstaSaver',
          pl: 'Pobieranie zdjęć z Instagrama — Pobierz Full HD JPG | InstaSaver',
          id: 'Pengunduh Foto Instagram — Unduh JPG Full HD | InstaSaver',
          bn: 'ইনস্টাগ্রাম ফটো ডাউনলোডার — ফুল এইচডি জেপিজি ডাউনলোড করুন | InstaSaver',
          ur: 'انسٹاگرام فوٹو ڈاؤنلوڈر — مکمل ایچ ڈی جے پی جی ڈاؤن لوڈ کریں | InstaSaver',
        },
        '/about': {
          en: 'About InstaSaver — Free Instagram Downloader',
          es: 'Acerca de InstaSaver — Descargador gratuito de Instagram',
          pt: 'Sobre o InstaSaver — Downloader gratuito do Instagram',
          fr: 'À propos de InstaSaver — Téléchargeur Instagram gratuit',
          de: 'Über InstaSaver — Kostenloser Instagram-Downloader',
          hi: 'InstaSaver के बारे में — फ्री इंस्टाग्राम डाउनलोडर',
          ar: 'حول InstaSaver — تحميل من انستقرام مجاناً',
          zh: '关于 InstaSaver — 免费 Instagram 下载器',
          ja: 'InstaSaverについて — 無料Instagramダウンロードツール',
          ko: 'InstaSaver 소개 — 무료 인스타그램 다운로더',
          ru: 'О проекте InstaSaver — Бесплатный загрузчик из Инстаграм',
          it: 'Informazioni su InstaSaver — Downloader Instagram gratuito',
          tr: 'InstaSaver Hakkında — Ücretsiz Instagram İndirici',
          vi: 'Giới thiệu về InstaSaver — Trình tải Instagram miễn phí',
          th: 'เกี่ยวกับ InstaSaver — ตัวดาวน์โหลด Instagram ฟรี',
          nl: 'Over InstaSaver — Gratis Instagram-downloader',
          pl: 'O InstaSaver — darmowe pobieranie z Instagrama',
          id: 'Tentang InstaSaver — Pengunduh Instagram Gratis',
          bn: 'InstaSaver সম্পর্কে — ফ্রি ইনস্টাগ্রাম ডাউনলোডার',
          ur: 'InstaSaver کے بارے میں — مفت انسٹاگرام ڈاؤنلوڈر',
        },
'/privacy': {
          en: 'Privacy Policy | InstaSaver Instagram Downloader',
          es: 'Política de privacidad | InstaSaver Instagram Downloader',
          pt: 'Política de Privacidade | InstaSaver Instagram Downloader',
          fr: 'Politique de confidentialité | InstaSaver Instagram Downloader',
          de: 'Datenschutzerklärung | InstaSaver Instagram Downloader',
          hi: 'गोपनीयता नीति | InstaSaver इंस्टाग्राम डाउनलोडर',
          ar: 'سياسة الخصوصية | تحميل من انستقرام InstaSaver',
          zh: '隐私政策 | InstaSaver Instagram 下载器',
          ja: 'プライバシーポリシー | InstaSaver Instagramダウンロード',
          ko: '개인정보 처리방침 | InstaSaver 인스타그램 다운로더',
          ru: 'Политика конфиденциальности | InstaSaver загрузчик',
          it: 'Informativa sulla privacy | InstaSaver Instagram Downloader',
          tr: 'Gizlilik Politikası | InstaSaver Instagram İndirici',
          vi: 'Chính sách bảo mật | Trình tải Instagram InstaSaver',
          th: 'นโยบายความเป็นส่วนตัว | ตัวดาวน์โหลด Instagram InstaSaver',
          nl: 'Privacybeleid | InstaSaver Instagram Downloader',
          pl: 'Polityka prywatności | InstaSaver Instagram Downloader',
          id: 'Kebijakan Privasi | Pengunduh Instagram InstaSaver',
          bn: 'গোপনীয়ता नीति | InstaSaver ইনস্টাগ্রাম ডাউনলোডার',
          ur: 'رازداری کی پالیسی | InstaSaver انسٹاگرام ڈاؤنلوڈر',
        },
        '/terms': {
          en: 'Terms of Use | InstaSaver Instagram Downloader',
          es: 'Términos de uso | InstaSaver Instagram Downloader',
          pt: 'Termos de Uso | InstaSaver Instagram Downloader',
          fr: "Conditions d'utilisation | InstaSaver Instagram Downloader",
          de: 'Nutzungsbedingungen | InstaSaver Instagram Downloader',
          hi: 'उपयोग की शर्तें | InstaSaver इंस्टाग्राम डाउनलोडर',
          ar: 'شروط الاستخدام | تحميل من انستقرام InstaSaver',
          zh: '使用条款 | InstaSaver Instagram 下载器',
          ja: '利用規約 | InstaSaver Instagramダウンロード',
          ko: '이용약관 | InstaSaver 인스타그램 다운로더',
          ru: 'Условия использования | InstaSaver загрузчик',
          it: 'Termini di utilizzo | InstaSaver Instagram Downloader',
          tr: 'Kullanım Koşulları | InstaSaver Instagram İndirici',
          vi: 'Điều khoản sử dụng | Trình tải Instagram InstaSaver',
          th: 'เงื่อนไขการใช้งาน | ตัวดาวน์โหลด Instagram InstaSaver',
          nl: 'Gebruiksvoorwaarden | InstaSaver Instagram Downloader',
          pl: 'Warunki korzystania | InstaSaver Instagram Downloader',
          id: 'Syarat Penggunaan | Pengunduh Instagram InstaSaver',
          bn: '사용ের শর্তাবলী | InstaSaver ইনস্টাগ্রাম ডাউনলোডার',
          ur: 'استعمال کی شرائط | InstaSaver انسٹاگرام ڈاؤنلوڈر',
        }
      };

      const pageMap = titleMaps[path] || titleMaps['/'];
      const titleText = pageMap[lang] || pageMap.en || titleEl.getAttribute('data-i18n-title');
      titleEl.textContent = titleText;
    }

    document.documentElement.setAttribute('lang', lang);
  }

  // Expose API
  window.InstasaverI18n = { LANGUAGES, flat, register, loadLang, applyLang };
})();
