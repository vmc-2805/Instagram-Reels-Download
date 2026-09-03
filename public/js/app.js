/* InstaSaver — front-end behaviour with animated mesh background. */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);

  /* ---------------------------------------------------------------- *
   * Animated Mesh Background
   * ---------------------------------------------------------------- */

  const meshCanvas = $('#mesh-canvas');
  if (meshCanvas && meshCanvas.getContext) {
    const ctx = meshCanvas.getContext('2d');
    let w, h, animId;
    const orbs = [];
    const ORB_COUNT = 4;

    function resize() {
      w = meshCanvas.width = window.innerWidth;
      h = meshCanvas.height = window.innerHeight;
    }

    function createOrbs() {
      const isDark = document.documentElement.dataset.theme !== 'light';
      const colors = isDark
        ? ['rgba(123,91,255,0.07)', 'rgba(225,48,108,0.05)', 'rgba(248,164,76,0.04)', 'rgba(123,91,255,0.03)']
        : ['rgba(123,91,255,0.05)', 'rgba(225,48,108,0.04)', 'rgba(248,164,76,0.03)', 'rgba(123,91,255,0.02)'];

      orbs.length = 0;
      for (let i = 0; i < ORB_COUNT; i++) {
        orbs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 200 + Math.random() * 300,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          color: colors[i % colors.length],
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.r) orb.x = w + orb.r;
        if (orb.x > w + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = h + orb.r;
        if (orb.y > h + orb.r) orb.y = -orb.r;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    createOrbs();
    draw();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); createOrbs(); }, 200);
    });

    // Rebuild orbs when theme changes
    const themeObserver = new MutationObserver(() => createOrbs());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, w, h);
    }
  }

  /* ---------------------------------------------------------------- *
   * Theme
   * ---------------------------------------------------------------- */

  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
    });
  }

  /* ---------------------------------------------------------------- *
   * Mobile nav
   * ---------------------------------------------------------------- */

  const navToggle = $('#nav-toggle');
  const nav = $('#site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !navToggle.contains(e.target)) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------------------------- *
   * Language Switcher (i18n)
   * ---------------------------------------------------------------- */

  const I18n = window.InstasaverI18n;
  const langBtn = $('#lang-btn');
  const langDropdown = $('#lang-dropdown');
  const langBtnFlag = $('#lang-btn-flag');

  if (I18n && langBtn && langDropdown) {
    let currentLang = 'en';
    try { currentLang = localStorage.getItem('lang') || 'en'; } catch {}
    if (!I18n.flat[currentLang]) currentLang = 'en';

    function switchLang(lang) {
      currentLang = lang;
      try { localStorage.setItem('lang', lang); } catch {}

      I18n.loadLang(lang).then(() => {
        I18n.applyLang(lang);
        if (langBtnFlag) langBtnFlag.textContent = lang.toUpperCase();
        langDropdown.querySelectorAll('.lang-option').forEach((opt) => {
          opt.classList.toggle('is-active', opt.dataset.lang === lang);
        });
      });
    }

    // Build dropdown options
    langDropdown.innerHTML = I18n.LANGUAGES.map(
      (l) => `<button class="lang-option" data-lang="${l.code}" role="option" type="button">
        <span class="lang-opt-label">${l.label}</span>
      </button>`
    ).join('');

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = langDropdown.classList.toggle('is-open');
      langBtn.setAttribute('aria-expanded', String(open));
    });

    langDropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.lang-option');
      if (!opt) return;
      switchLang(opt.dataset.lang);
      langDropdown.classList.remove('is-open');
      langBtn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', (e) => {
      if (!langDropdown.contains(e.target) && !langBtn.contains(e.target)) {
        langDropdown.classList.remove('is-open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    switchLang(currentLang);
  }

  /* ---------------------------------------------------------------- *
   * Toast
   * ---------------------------------------------------------------- */

  const toastEl = $('#toast');
  let toastTimer;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  /* ---------------------------------------------------------------- *
   * Scroll Reveal — Intersection Observer
   * ---------------------------------------------------------------- */

  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------------- *
   * Sidebar scroll-spy
   * ---------------------------------------------------------------- */

  const sidebarLinks = document.querySelectorAll('.static-sidebar-link');
  if (sidebarLinks.length) {
    const sectionIds = Array.from(sidebarLinks).map((l) => l.dataset.target);
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
      const spyObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              sidebarLinks.forEach((l) => l.classList.remove('is-active'));
              const active = document.querySelector(`.static-sidebar-link[data-target="${entry.target.id}"]`);
              if (active) active.classList.add('is-active');
            }
          });
        },
        { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
      );
      sections.forEach((s) => spyObserver.observe(s));
    }

    sidebarLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          sidebarLinks.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Downloader
   * ---------------------------------------------------------------- */

  const form = $('#download-form');
  if (!form) return;

  const input = $('#url-input');
  const submitBtn = $('#submit-btn');
  const pasteBtn = $('#paste-btn');
  const clearBtn = $('#clear-btn');
  const alertBox = $('#alert');
  const resultBox = $('#result');

  const MODES = ['audio', 'photo', 'media'];
  const mode = MODES.includes(form.dataset.mode) ? form.dataset.mode : 'media';
  const submitLabel = form.dataset.label || 'Download';

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function showError(message) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
  }

  function clearError() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('is-loading', loading);
    $('.btn-label', submitBtn).textContent = loading ? 'Fetching…' : submitLabel;
  }

  function toggleClear() {
    clearBtn.classList.toggle('hidden', !input.value.trim());
  }

  input.addEventListener('input', toggleClear);
  toggleClear();

  clearBtn.addEventListener('click', () => {
    input.value = '';
    toggleClear();
    clearError();
    resultBox.innerHTML = '';
    input.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast('Clipboard is empty');
      input.value = text.trim();
      toggleClear();
      form.requestSubmit();
    } catch {
      toast('Your browser blocked clipboard access — paste manually');
      input.focus();
    }
  });

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '';
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatCount = (value) => {
    if (value === null || value === undefined) return '';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  };

  function render(data) {
    const owner = data.owner || {};

    const mediaList =
      mode === 'audio'
        ? data.media.filter((item) => item.type === 'video' && item.audioUrl)
        : mode === 'photo'
        ? data.media.filter((item) => item.type === 'image')
        : data.media;

    if (!mediaList.length) {
      showError(
        mode === 'audio'
          ? 'That post has no video, so there is no audio to extract. Try a reel or a video post.'
          : mode === 'photo'
          ? 'That post has no photo in it. For a reel or video, use the video downloader.'
          : 'Nothing downloadable was found in that post.'
      );
      return;
    }

    const metaBits = [];
    if (data.takenAt) metaBits.push(new Date(data.takenAt).toLocaleDateString());
    if (data.likes !== null && data.likes !== undefined) metaBits.push(`${formatCount(data.likes)} likes`);
    if (data.views) metaBits.push(`${formatCount(data.views)} views`);
    const noun = mode === 'audio' ? 'track' : mode === 'photo' ? 'photo' : 'file';
    metaBits.push(`${mediaList.length} ${noun}${mediaList.length > 1 ? 's' : ''}`);

    const avatar = owner.avatar
      ? `<img class="avatar" src="/api/thumb?u=${encodeURIComponent(owner.avatar)}" alt="" loading="lazy">`
      : '<div class="avatar"></div>';

    const downloadIcon =
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>';

    const items = mediaList
      .map((item, index) => {
        const isVideo = item.type === 'video';
        const many = mediaList.length > 1;

        if (mode === 'audio') {
          const label = many ? `Track ${index + 1}` : 'Audio track';
          const meta = ['MP3 · 192 kbps'];
          if (item.duration) meta.push(formatDuration(item.duration));

          return `
          <article class="media-item audio-item">
            <div class="media-preview audio-preview">
              ${
                item.thumbnailUrl
                  ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="" loading="lazy">`
                  : ''
              }
              <span class="audio-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
              <span class="media-tag">${escapeHtml(label)} · ${escapeHtml(meta.join(' · '))}</span>
            </div>
            <div class="audio-player">
              <audio src="${escapeHtml(item.streamUrl)}" controls preload="none"></audio>
            </div>
            <div class="media-actions">
              <a class="download-btn" href="${escapeHtml(item.audioUrl)}" download>
                ${downloadIcon}
                Download MP3
              </a>
            </div>
          </article>`;
        }

        const label = many
          ? `${isVideo ? 'Video' : 'Photo'} ${index + 1}`
          : isVideo
          ? 'Video'
          : 'Photo';

        const preview = isVideo
          ? `<video src="${escapeHtml(item.streamUrl)}" ${
              item.thumbnailUrl ? `poster="${escapeHtml(item.thumbnailUrl)}"` : ''
            } controls preload="none" playsinline></video>`
          : `<img src="${escapeHtml(item.thumbnailUrl || item.streamUrl)}" alt="${escapeHtml(label)}" loading="lazy">`;

        const size =
          item.width && item.height
            ? `${item.width}×${item.height}`
            : isVideo
            ? 'MP4'
            : 'JPG';
        const duration = item.duration ? ` · ${formatDuration(item.duration)}` : '';

        return `
        <article class="media-item">
          <div class="media-preview">
            ${preview}
            <span class="media-tag">${escapeHtml(label)} · ${escapeHtml(size)}${escapeHtml(duration)}</span>
          </div>
          <div class="media-actions">
            <a class="download-btn" href="${escapeHtml(item.downloadUrl)}" download>
              ${downloadIcon}
              ${isVideo ? 'Download MP4' : 'Download JPG'}
            </a>
          </div>
        </article>`;
      })
      .join('');

    const captionText = (data.caption || '').trim();
    const caption = captionText
      ? `<p class="caption clamped" id="caption">${escapeHtml(captionText)}</p>
         ${captionText.length > 180 ? '<button class="caption-toggle" type="button" id="caption-toggle">Show more</button>' : ''}`
      : '';

    const warning = data.warning
      ? `<p class="notice">${escapeHtml(data.warning)}</p>`
      : '';

    resultBox.innerHTML = `
      <div class="result-card">
        <header class="result-head">
          ${avatar}
          <div>
            <div class="result-user">@${escapeHtml(owner.username || 'instagram')}</div>
            <div class="result-meta">${escapeHtml(metaBits.join(' · '))}</div>
          </div>
          <span class="badge">${escapeHtml(
            mode === 'audio' ? 'audio' : mode === 'photo' ? 'photo' : data.type
          )}</span>
        </header>
        ${warning}
        ${caption}
        <div class="media-grid">${items}</div>
      </div>`;

    const captionToggle = $('#caption-toggle');
    if (captionToggle) {
      captionToggle.addEventListener('click', () => {
        const el = $('#caption');
        const clamped = el.classList.toggle('clamped');
        captionToggle.textContent = clamped ? 'Show more' : 'Show less';
      });
    }

    resultBox.querySelectorAll('.download-btn').forEach((link) => {
      link.addEventListener('click', () =>
        toast(mode === 'audio' ? 'Converting to MP3 — the download will start shortly…' : 'Download started…')
      );
    });

    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = input.value.trim();

    if (!url) {
      showError('Paste an Instagram link first.');
      input.focus();
      return;
    }

    clearError();
    resultBox.innerHTML = '';
    setLoading(true);

    try {
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        showError(payload.error || `Request failed (${response.status}).`);
        return;
      }

      render(payload.data);
    } catch {
      showError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  });

  const preset = new URLSearchParams(location.search).get('url');
  if (preset) {
    input.value = preset;
    toggleClear();
    form.requestSubmit();
  }
})();
