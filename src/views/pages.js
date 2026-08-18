'use strict';

const config = require('../config');
const { layout, escapeHtml } = require('./layout');

/* ------------------------------------------------------------------ *
 * Reusable sections
 * ------------------------------------------------------------------ */

function downloaderSection({ eyebrow, heading, subheading, placeholder, note, mode = 'media', buttonLabel = 'Download', i18nPrefix = 'home' }) {
  return `
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow" data-i18n="${i18nPrefix}.eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 class="hero-title" data-i18n="${i18nPrefix}.heading">${heading}</h1>
        <p class="hero-sub" data-i18n="${i18nPrefix}.sub">${escapeHtml(subheading)}</p>
      </div>

      <form class="downloader" id="download-form" autocomplete="off" data-mode="${escapeHtml(mode)}" data-label="${escapeHtml(buttonLabel)}">
        <div class="field">
          <svg class="field-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>
          </svg>
          <input
            id="url-input"
            name="url"
            type="text"
            inputmode="url"
            spellcheck="false"
            placeholder="${escapeHtml(placeholder)}"
            aria-label="Instagram link"
            required>
          <button class="ghost-btn" id="paste-btn" type="button" data-i18n="btn.paste">Paste</button>
          <button class="ghost-btn hidden" id="clear-btn" type="button" aria-label="Clear">✕</button>
        </div>
        <button class="primary-btn" id="submit-btn" type="submit">
          <span class="btn-label" data-i18n="btn.${buttonLabel === 'Get MP3' ? 'get_mp3' : buttonLabel === 'Get photo' ? 'get_photo' : 'download'}">${escapeHtml(buttonLabel)}</span>
          <span class="spinner" aria-hidden="true"></span>
        </button>
      </form>

      <p class="hero-note" data-i18n="${i18nPrefix}.note">${escapeHtml(note)}</p>

      <div class="alert hidden" id="alert" role="alert"></div>
      <div class="result" id="result" aria-live="polite"></div>
    </div>
  </section>`;
}

function stepsSection(steps, prefix = 'steps') {
  return `
  <section class="section">
    <div class="container">
      <h2 class="section-title reveal" data-i18n="${prefix}.title">How it works</h2>
      <p class="section-sub reveal" data-i18n="${prefix}.sub">Three steps, about ten seconds.</p>
      <ol class="steps">
        ${steps
          .map(
            (step, index) => `
        <li class="step-card reveal reveal-delay-${index + 1}">
          <span class="step-number">${index + 1}</span>
          <h3 data-i18n="${prefix}.${index + 1}.title">${escapeHtml(step.title)}</h3>
          <p data-i18n="${prefix}.${index + 1}.text">${escapeHtml(step.text)}</p>
        </li>`
          )
          .join('')}
      </ol>
    </div>
  </section>`;
}

const FEATURES = [
  {
    icon: 'bolt',
    title: 'Original quality',
    text: 'Files are pulled straight from Instagram’s CDN, so you get the same resolution the app serves — no re-encoding.',
  },
  {
    icon: 'shield',
    title: 'No account needed',
    text: 'You never sign in and we never ask for your Instagram password. Paste a public link and you are done.',
  },
  {
    icon: 'devices',
    title: 'Works everywhere',
    text: 'One responsive page for Android, iPhone, iPad, Windows, macOS and Linux. Nothing to install.',
  },
  {
    icon: 'layers',
    title: 'Carousels supported',
    text: 'Multi-photo and mixed photo/video posts are unpacked into separate files you can grab individually.',
  },
  {
    icon: 'clock',
    title: 'No waiting queue',
    text: 'Links resolve in a second or two and downloads stream directly through your browser.',
  },
  {
    icon: 'eye',
    title: 'Nothing stored',
    text: 'We do not keep the media or your links. Resolved posts sit in a short-lived cache and then disappear.',
  },
];

const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  shield: '<path d="M12 3 5 6v6c0 4.4 3 8.3 7 9 4-0.7 7-4.6 7-9V6l-7-3z"/>',
  devices: '<rect x="2" y="4" width="14" height="11" rx="2"/><path d="M5 20h8"/><rect x="17" y="9" width="5" height="11" rx="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 14 9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
};

function featuresSection() {
  return `
  <section class="section section-alt">
    <div class="container">
      <h2 class="section-title reveal" data-i18n="feat.title">Why people use it</h2>
      <p class="section-sub reveal" data-i18n="feat.sub">A downloader that stays out of your way.</p>
      <div class="feature-grid">
        ${FEATURES.map(
          (feature, index) => `
        <article class="feature-card reveal reveal-delay-${(index % 3) + 1}">
          <span class="feature-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[feature.icon]}</svg>
          </span>
          <h3 data-i18n="feat.${index + 1}.title">${escapeHtml(feature.title)}</h3>
          <p data-i18n="feat.${index + 1}.text">${escapeHtml(feature.text)}</p>
        </article>`
        ).join('')}
      </div>
    </div>
  </section>`;
}

function faqSection(items, prefix = 'faq') {
  return `
  <section class="section" id="faq">
    <div class="container narrow">
      <h2 class="section-title reveal" data-i18n="${prefix}.title">Frequently asked questions</h2>
      <p class="section-sub reveal" data-i18n="${prefix}.sub">Quick answers to common questions.</p>
      <div class="faq">
        ${items
          .map(
            (item, index) => `
        <details class="faq-item reveal reveal-delay-${(index % 4) + 1}">
          <summary>
            <span class="faq-q" data-i18n="${prefix}.${index + 1}.q">${escapeHtml(item.q)}</span>
            <span class="faq-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
          </summary>
          <div class="faq-answer"><p data-i18n="${prefix}.${index + 1}.a">${item.a}</p></div>
        </details>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function toolsSection(activeHref) {
  const tools = [
    { href: '/', titleKey: 'tools.video.title', textKey: 'tools.video.text', title: 'Video downloader', text: 'Any public post, reel or video, saved as MP4.' },
    { href: '/audio', titleKey: 'tools.audio.title', textKey: 'tools.audio.text', title: 'Reels audio downloader', text: 'Pull the sound out of a reel and save it as MP3.' },
    { href: '/photo', titleKey: 'tools.photo.title', textKey: 'tools.photo.text', title: 'Photo downloader', text: 'Full-size JPGs, including every slide of a carousel.' },
  ].filter((tool) => tool.href !== activeHref);

  return `
  <section class="section section-alt">
    <div class="container">
      <h2 class="section-title reveal" data-i18n="tools.title">More downloaders</h2>
      <p class="section-sub reveal" data-i18n="tools.sub">Same engine, tuned for each type of post.</p>
      <div class="tool-grid">
        ${tools
          .map(
            (tool, index) => `
        <a class="tool-card reveal reveal-delay-${index + 1}" href="${tool.href}">
          <div class="tool-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div class="tool-card-body">
            <h3 data-i18n="${tool.titleKey}">${escapeHtml(tool.title)}</h3>
            <p data-i18n="${tool.textKey}">${escapeHtml(tool.text)}</p>
          </div>
        </a>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

const COMMON_FAQ = [
  {
    q: 'Is it free?',
    a: 'Yes. There is no fee, no download limit per day and no account to create.',
  },
  {
    q: 'Do I have to install anything?',
    a: 'No. Everything runs in your browser. On iPhone the file is saved through the Files app or the share sheet, depending on your browser.',
  },
  {
    q: 'Can I download private posts?',
    a: 'No. Only content on public profiles can be resolved. Private posts stay private, which is how it should be.',
  },
  {
    q: 'Where do the files go?',
    a: 'To your browser’s normal download folder. On Android that is usually <em>Downloads</em>; on iOS, <em>Files &rsaquo; Downloads</em>; on desktop, whatever folder your browser is set to.',
  },
  {
    q: 'Why did my link fail?',
    a: 'The most common reasons are a private account, a deleted post, an age-restricted post, or a link that was copied from a preview rather than the post itself. Open the post in Instagram, tap the ••• menu and choose <em>Copy link</em>.',
  },
  {
    q: 'Can I repost what I download?',
    a: 'Only with the creator’s permission. The person who made the video or photo still owns it — downloading a copy does not transfer any rights.',
  },
];

function toolPage({
  route,
  title,
  description,
  eyebrow,
  heading,
  subheading,
  placeholder,
  note,
  steps,
  faq,
  copy,
  mode = 'media',
  buttonLabel = 'Download',
  i18nPrefix = 'home',
  stepsPrefix = 'steps',
  faqPrefix = 'faq',
}) {
  const body = `
  ${downloaderSection({ eyebrow, heading, subheading, placeholder, note, mode, buttonLabel, i18nPrefix })}
  ${stepsSection(steps, stepsPrefix)}
  ${featuresSection()}
  ${copy ? `<section class="section"><div class="container reveal">${copy}</div></section>` : ''}
  ${toolsSection(route)}
  ${faqSection(faq, faqPrefix)}`;

  return layout({
    title,
    description,
    active: route,
    canonical: route,
    body,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a.replace(/<[^>]+>/g, '') },
      })),
    },
  });
}

/* ------------------------------------------------------------------ *
 * Pages
 * ------------------------------------------------------------------ */

const home = () =>
  toolPage({
    route: '/',
    title: `${config.siteName} — Instagram Video Downloader (HD, free)`,
    description:
      'Paste an Instagram link and save the video, reel, photo or carousel in original quality. Free, no sign in, works on phone and desktop.',
    eyebrow: 'Instagram downloader',
    heading: 'Download Instagram <span class="gradient-text">videos</span> in seconds',
    subheading:
      'Paste a link to any public post, reel or carousel. We fetch the original file and hand it straight to your browser.',
    placeholder: 'https://www.instagram.com/p/...',
    note: 'Public posts only. Files are streamed, never stored on our servers.',
    i18nPrefix: 'home',
    stepsPrefix: 'steps',
    faqPrefix: 'faq',
    steps: [
      { title: 'Copy the link', text: 'In Instagram, open the post and tap the ••• menu, then Copy link. On desktop, copy the address bar URL.' },
      { title: 'Paste it above', text: 'Drop the link into the box and press Download. The Paste button fills it in for you.' },
      { title: 'Save the file', text: 'Preview the result, then pick the quality or slide you want and save it to your device.' },
    ],
    faq: COMMON_FAQ,
    copy: `
      <div class="split-section reveal">
        <div class="split-left">
          <h2 data-i18n="split.title">A downloader for every kind of Instagram post</h2>
          <p data-i18n="split.p1">Instagram deliberately has no save button. If you want to keep a clip for offline viewing, archive your own work, or collect reference footage for editing, you have to pull the file yourself. That is all this tool does: it reads the public data Instagram already serves for a post and gives you a direct link to the underlying MP4 or JPG.</p>
          <p data-i18n="split.p2">Nothing is re-encoded. The file that lands in your downloads folder is byte for byte the one Instagram's CDN serves to the app, so a reel uploaded at 1080p arrives at 1080p. If a post was uploaded at a lower quality, no tool can add detail that was never there.</p>
        </div>
        <div class="split-right">
          <div class="split-feature reveal reveal-delay-1">
            <span class="split-feature-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </span>
            <div>
              <h3 data-i18n="split.c1.title">Feed videos</h3>
              <p data-i18n="split.c1.text">Any <code>/p/</code> link whose post contains a video.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-2">
            <span class="split-feature-icon split-feature-icon--green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </span>
            <div>
              <h3 data-i18n="split.c2.title">Reels</h3>
              <p data-i18n="split.c2.text"><code>/reel/</code> and <code>/reels/</code> links, saved as MP4. Want only the sound? Use the <a href="/audio">audio downloader</a>.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-3">
            <span class="split-feature-icon split-feature-icon--warn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </span>
            <div>
              <h3 data-i18n="split.c3.title">Photos</h3>
              <p data-i18n="split.c3.text">Single images at the largest size Instagram publishes.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-4">
            <span class="split-feature-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 14 9 5 9-5"/></svg>
            </span>
            <div>
              <h3 data-i18n="split.c4.title">Carousels</h3>
              <p data-i18n="split.c4.text">Every slide is listed separately so you can pick the ones you want.</p>
            </div>
          </div>
        </div>
      </div>`,
  });

const audio = () =>
  toolPage({
    route: '/audio',
    mode: 'audio',
    buttonLabel: 'Get MP3',
    title: `Instagram Reels Audio Downloader — reel to MP3 | ${config.siteName}`,
    description:
      'Extract the audio from an Instagram reel and save it as an MP3. Paste the reel link and get the sound only — no video file. Free, no sign in.',
    eyebrow: 'Reels audio',
    heading: 'Instagram Reels <span class="gradient-text">audio</span> downloader',
    subheading:
      'Paste a reel link and get the sound on its own, converted to MP3. The video is never saved — only the audio track.',
    placeholder: 'https://www.instagram.com/reel/...',
    note: 'Audio only. Posts without a video track have nothing to extract.',
    i18nPrefix: 'audio',
    stepsPrefix: 'asteps',
    faqPrefix: 'afaq',
    steps: [
      { title: 'Copy the reel link', text: 'Tap the share icon under the reel, then choose Copy link.' },
      { title: 'Paste it above', text: 'Press Get MP3 and wait for the track to be listed.' },
      { title: 'Listen, then save', text: 'Preview the sound in the player, then download the MP3.' },
    ],
    faq: [
      {
        q: 'What exactly do I get?',
        a: 'An MP3 at 192 kbps containing the reel\'s audio track — music, voice, effects and all. No video file is produced or saved.',
      },
      {
        q: 'Why is the quality not better than the original?',
        a: 'The audio inside a reel is already compressed by Instagram, usually AAC at a modest bitrate. Converting it to MP3 cannot add back detail that Instagram removed, so 192 kbps is comfortably transparent for this source.',
      },
      {
        q: 'Can I separate the music from the speech?',
        a: 'No. The reel has one mixed audio track, so whatever you hear in the app is what lands in the MP3.',
      },
      {
        q: 'Can I use the music in my own videos?',
        a: 'Usually not without permission. Most reel audio is licensed music owned by the artist or label, and extracting it does not grant you a licence. Personal listening is one thing; publishing it is another.',
      },
      {
        q: 'The post has no audio. What happened?',
        a: 'Some posts are silent, and photo-only posts have no audio track at all. In those cases there is nothing to extract and the page will tell you so.',
      },
      ...COMMON_FAQ,
    ],
    copy: `
      <div class="split-section reveal">
        <div class="split-left">
          <h2 data-i18n="asplit.title">Reel to MP3, without saving the video</h2>
          <p data-i18n="asplit.p1">Sometimes the sound is the point: a voice note, a joke, a snippet you want on your phone rather than a 40 MB clip you will never watch again. This page pulls the audio stream out of the reel on the server and hands you an MP3 &mdash; the video frames are decoded and discarded, never written anywhere.</p>
          <p data-i18n="asplit.p2">Downloading a track for personal listening is not the same as being allowed to reuse it. Reel audio is very often licensed music, and reposting it in your own content can get that content muted or taken down. When in doubt, ask the creator.</p>
        </div>
        <div class="split-right">
          <div class="split-feature reveal reveal-delay-1">
            <span class="split-feature-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><path d="M8 17V5l12-2v12"/></svg>
            </span>
            <div>
              <h3 data-i18n="asplit.c1.title">How it works</h3>
              <p data-i18n="asplit.c1.text">The reel's MP4 is read from Instagram's servers, the audio track is separated, and re-encoded to MP3 at 192 kbps. Nothing is stored.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-2">
            <span class="split-feature-icon split-feature-icon--green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </span>
            <div>
              <h3 data-i18n="asplit.c2.title">Where it lands</h3>
              <p data-i18n="asplit.c2.text">On Android into <em>Downloads</em>. On iPhone into <em>Files &rsaquo; Downloads</em>. Open it there to play or share.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-3">
            <span class="split-feature-icon split-feature-icon--warn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </span>
            <div>
              <h3 data-i18n="asplit.c3.title">No waiting</h3>
              <p data-i18n="asplit.c3.text">The file streams to your browser as it is produced &mdash; no queue, no temporary copy left behind.</p>
            </div>
          </div>
        </div>
      </div>`,
  });

const photo = () =>
  toolPage({
    route: '/photo',
    mode: 'photo',
    buttonLabel: 'Get photo',
    title: `Instagram Photo Downloader — full size JPG | ${config.siteName}`,
    description:
      'Download Instagram photos and carousels in full resolution. Paste a post link and save every slide as a JPG. Free, no app, no login.',
    eyebrow: 'Photos',
    heading: 'Instagram <span class="gradient-text">photo</span> downloader',
    subheading:
      'Grab a single picture or every slide of a carousel at the largest size Instagram publishes.',
    placeholder: 'https://www.instagram.com/p/...',
    note: 'Images only. Video slides in a carousel are skipped on this page.',
    i18nPrefix: 'photo',
    stepsPrefix: 'psteps',
    faqPrefix: 'pfaq',
    steps: [
      { title: 'Copy the post link', text: 'Use the ••• menu on the post and choose Copy link.' },
      { title: 'Paste and fetch', text: 'Press Download to list every image in the post.' },
      { title: 'Pick your slides', text: 'Each slide gets its own button, so save only the ones you want.' },
    ],
    faq: [
      {
        q: 'What resolution do I get?',
        a: 'The largest version Instagram serves — usually 1080 pixels on the long edge. Instagram compresses on upload, so nothing can recover the photographer\'s original file.',
      },
      {
        q: 'Can I download a profile picture?',
        a: 'Not from this page. Paste a link to a post; profile picture links are not post URLs.',
      },
      ...COMMON_FAQ,
    ],
    copy: `
      <div class="split-section reveal">
        <div class="split-left">
          <h2 data-i18n="psplit.title">Full-size images, one slide at a time</h2>
          <p data-i18n="psplit.p1">Right-clicking an Instagram photo gives you a small preview, not the real image, and a screenshot gives you whatever your screen happens to be. This page reads the post's media list and returns a direct link to each JPG at the size Instagram actually stores.</p>
          <p data-i18n="psplit.p2">The largest version Instagram serves &mdash; usually 1080 pixels on the long edge. Instagram compresses on upload, so nothing can recover the photographer's original file.</p>
        </div>
        <div class="split-right">
          <div class="split-feature reveal reveal-delay-1">
            <span class="split-feature-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 14 9 5 9-5"/></svg>
            </span>
            <div>
              <h3 data-i18n="psplit.c1.title">Carousels</h3>
              <p data-i18n="psplit.c1.text">Every item is listed with its own preview and button, labelled by position. A ten-slide post becomes ten separate downloads.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-2">
            <span class="split-feature-icon split-feature-icon--green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </span>
            <div>
              <h3 data-i18n="psplit.c2.title">Full resolution</h3>
              <p data-i18n="psplit.c2.text">The largest version Instagram stores, usually 1080px on the long edge. No re-encoding, no quality loss.</p>
            </div>
          </div>
          <div class="split-feature reveal reveal-delay-3">
            <span class="split-feature-icon split-feature-icon--warn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div>
              <h3 data-i18n="psplit.c3.title">No storage</h3>
              <p data-i18n="psplit.c3.text">Files stream from Instagram's CDN straight to your browser. Nothing is saved on our servers.</p>
            </div>
          </div>
        </div>
      </div>`,
  });

/* --- static content pages --- */

const PAGE_ICONS = {
  about: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  contact: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>',
  privacy: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.4 3 8.3 7 9 4-0.7 7-4.6 7-9V6l-7-3z"/>',
  terms: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
};

const staticPage = (route, titleKey, descKey, body, sidebarItems) =>
  layout({
    title: `${titleKey} | ${config.siteName}`,
    description: '',
    active: route,
    canonical: route,
    body: `
    <section class="static-hero">
      <div class="static-hero-bg" aria-hidden="true"></div>
      <div class="container narrow center">
        <h1 class="static-hero-title reveal reveal-delay-1" data-i18n="${titleKey}">${titleKey}</h1>
        <p class="static-hero-sub reveal reveal-delay-2" data-i18n="${descKey}">${descKey}</p>
      </div>
    </section>
    <section class="section static-body">
      <div class="container static-layout">
        <aside class="static-sidebar reveal">
          <nav class="static-sidebar-nav">
            ${sidebarItems.map(item =>
              `<a href="#${item.id}" class="static-sidebar-link" data-target="${item.id}" data-i18n="${item.key}">${item.label}</a>`
            ).join('')}
          </nav>
        </aside>
        <div class="static-content reveal reveal-delay-1">${body}</div>
      </div>
    </section>`,
  });

const about = () =>
  staticPage(
    '/about',
    'about.title',
    'about.desc',
    `<div class="static-intro-card">
      <p data-i18n="about.intro">${escapeHtml(config.siteName)} is a small web tool for saving public Instagram media. You paste a link, the server asks Instagram for the public data behind that post, and you get back direct download links for the video or images it contains.</p>
    </div>
    <div class="static-section" id="about-how-it-works">
      <h2 data-i18n="about.how.title">How it works</h2>
      <p data-i18n="about.how.text">Instagram publishes structured data for every public post &mdash; the same data that powers embeds and link previews. The server reads that data, picks the highest-quality file in it, and streams the file back to you so your browser can save it. Nothing is re-encoded and nothing is uploaded anywhere.</p>
    </div>
    <div class="static-section" id="about-what-it-does-not-do">
      <h2 data-i18n="about.not.title">What it does not do</h2>
      <ul>
        <li data-i18n="about.not.1">It does not ask for, store, or use your Instagram credentials.</li>
        <li data-i18n="about.not.2">It does not open private accounts, private posts, or expired stories.</li>
        <li data-i18n="about.not.3">It does not keep copies of the media you fetch.</li>
      </ul>
    </div>
    <div class="static-section" id="about-who-it-is-for">
      <h2 data-i18n="about.who.title">Who it is for</h2>
      <p data-i18n="about.who.text">Creators archiving their own uploads, editors collecting reference clips, and anyone who wants to watch something offline. If you plan to publish what you download, get the creator's permission first.</p>
    </div>`,
    [
      { id: 'about-how-it-works', label: 'How it works', key: 'about.how.title' },
      { id: 'about-what-it-does-not-do', label: 'What it does not do', key: 'about.not.title' },
      { id: 'about-who-it-is-for', label: 'Who it is for', key: 'about.who.title' },
    ]
  );

const contact = () =>
  layout({
    title: `Contact | ${config.siteName}`,
    description: '',
    active: '/contact',
    canonical: '/contact',
    body: `
    <section class="static-hero">
      <div class="static-hero-bg" aria-hidden="true"></div>
      <div class="container narrow center">
        <h1 class="static-hero-title reveal reveal-delay-1" data-i18n="contact.title">Contact</h1>
        <p class="static-hero-sub reveal reveal-delay-2" data-i18n="contact.desc">Get in touch about a bug, a takedown request or a feature idea.</p>
      </div>
    </section>
    <section class="section static-body">
      <div class="container narrow">
        <div class="static-content reveal reveal-delay-3">
    <div class="static-intro-card">
      <p data-i18n="contact.intro">Bug reports, takedown requests and feature ideas are all welcome.</p>
    </div>
    <div class="static-cards-grid">
      <div class="static-info-card">
        <span class="static-info-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
        <h3 data-i18n="contact.report.title">Reporting a problem</h3>
        <p data-i18n="contact.report.text">If a link fails, include the link itself and roughly when you tried it. Instagram changes its internals often, and a broken link is usually the first sign that something needs updating.</p>
      </div>
      <div class="static-info-card">
        <span class="static-info-icon static-info-icon--warn"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4.4 3 8.3 7 9 4-0.7 7-4.6 7-9V6l-7-3z"/></svg></span>
        <h3 data-i18n="contact.takedown.title">Takedown requests</h3>
        <p data-i18n="contact.takedown.text">We do not host any Instagram media &mdash; files stream directly from Instagram's own servers and nothing is retained. If your content appears somewhere it should not, the request needs to go to the site actually hosting it, or to Instagram.</p>
      </div>
      <div class="static-info-card">
        <span class="static-info-icon static-info-icon--green"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg></span>
        <h3 data-i18n="contact.email.title">Email</h3>
        <p data-i18n="contact.email.text">Replace this section with your own address before you deploy the site.</p>
      </div>
    </div>
    </div>
      </div>
    </section>`,
  });

const privacy = () =>
  staticPage(
    '/privacy',
    'privacy.title',
    'privacy.desc',
    `<p class="static-date">Last updated: ${new Date().toISOString().slice(0, 10)}</p>
    <div class="static-intro-card static-intro-card--accent">
      <span class="static-intro-badge" data-i18n="privacy.short">Short version</span>
      <p data-i18n="privacy.short.text">No account, no tracking profile, no stored media. The links you paste are used to fetch a post and are then forgotten.</p>
    </div>
    <div class="static-section" id="privacy-what-is-processed">
      <h2 data-i18n="privacy.processed.title">What is processed</h2>
      <ul>
        <li data-i18n="privacy.processed.1"><strong>The link you submit</strong> &mdash; used only to resolve the post. Resolved results sit in a short-lived memory cache and are dropped automatically.</li>
        <li data-i18n="privacy.processed.2"><strong>Your IP address</strong> &mdash; held briefly, in memory, for rate limiting so one visitor cannot flood the service.</li>
        <li data-i18n="privacy.processed.3"><strong>Standard server logs</strong> &mdash; request path, status and timing.</li>
      </ul>
    </div>
    <div class="static-section" id="privacy-what-is-not-collected">
      <h2 data-i18n="privacy.notcollected.title">What is not collected</h2>
      <p data-i18n="privacy.notcollected.text">No Instagram credentials, no advertising identifiers, and no copies of the media you download. Files stream through the server to your browser and are not written to disk.</p>
    </div>
    <div class="static-section" id="privacy-third-parties">
      <h2 data-i18n="privacy.third.title">Third parties</h2>
      <p data-i18n="privacy.third.text">Media and post data come from Instagram's servers, so requests reach Meta's infrastructure. Their handling of that traffic is covered by their own privacy policy. Web fonts are loaded from Google Fonts; self-host them if you would rather avoid that request.</p>
    </div>
    <div class="static-section" id="privacy-children">
      <h2 data-i18n="privacy.children.title">Children</h2>
      <p data-i18n="privacy.children.text">This site is not directed at children under 13.</p>
    </div>
    <div class="static-section" id="privacy-changes">
      <h2 data-i18n="privacy.changes.title">Changes</h2>
      <p data-i18n="privacy.changes.text">If this policy changes, the date above changes with it.</p>
    </div>`,
    [
      { id: 'privacy-what-is-processed', label: 'What is processed', key: 'privacy.processed.title' },
      { id: 'privacy-what-is-not-collected', label: 'What is not collected', key: 'privacy.notcollected.title' },
      { id: 'privacy-third-parties', label: 'Third parties', key: 'privacy.third.title' },
      { id: 'privacy-children', label: 'Children', key: 'privacy.children.title' },
      { id: 'privacy-changes', label: 'Changes', key: 'privacy.changes.title' },
    ]
  );

const terms = () =>
  staticPage(
    '/terms',
    'terms.title',
    'terms.desc',
    `<p class="static-date">Last updated: ${new Date().toISOString().slice(0, 10)}</p>
    <div class="static-section" id="terms-acceptable-use">
      <h2 data-i18n="terms.accept.title">Acceptable use</h2>
      <p data-i18n="terms.accept.text">Use the site to download publicly available Instagram media for personal, lawful purposes. Do not use it to harass anyone, to bypass privacy settings, or to build a service on top of it through automated scraping.</p>
    </div>
    <div class="static-section" id="terms-copyright">
      <h2 data-i18n="terms.copyright.title">Copyright</h2>
      <p data-i18n="terms.copyright.text">Every photo and video on Instagram belongs to whoever created it. Downloading a copy gives you no rights over it. Republishing, selling or commercially reusing someone else's content without permission may infringe their copyright, and that responsibility is entirely yours.</p>
    </div>
    <div class="static-section" id="terms-no-affiliation">
      <h2 data-i18n="terms.affiliation.title">No affiliation</h2>
      <p data-i18n="terms.affiliation.text">${escapeHtml(config.siteName)} is an independent tool. It is not affiliated with, endorsed by or sponsored by Instagram or Meta Platforms, Inc. All trademarks belong to their respective owners.</p>
    </div>
    <div class="static-section" id="terms-availability">
      <h2 data-i18n="terms.availability.title">Availability</h2>
      <p data-i18n="terms.availability.text">The service is provided as is, without warranty of any kind. Instagram can change its systems at any time, and features may break or disappear without notice.</p>
    </div>
    <div class="static-section" id="terms-liability">
      <h2 data-i18n="terms.liability.title">Liability</h2>
      <p data-i18n="terms.liability.text">To the extent permitted by law, we accept no liability for any loss arising from use of this site.</p>
    </div>`,
    [
      { id: 'terms-acceptable-use', label: 'Acceptable use', key: 'terms.accept.title' },
      { id: 'terms-copyright', label: 'Copyright', key: 'terms.copyright.title' },
      { id: 'terms-no-affiliation', label: 'No affiliation', key: 'terms.affiliation.title' },
      { id: 'terms-availability', label: 'Availability', key: 'terms.availability.title' },
      { id: 'terms-liability', label: 'Liability', key: 'terms.liability.title' },
    ]
  );

const notFound = () =>
  layout({
    title: `Page not found | ${config.siteName}`,
    description: 'That page does not exist.',
    canonical: '/404',
    body: `
    <section class="section error-page">
      <div class="container narrow center">
        <p class="eyebrow" data-i18n="error.eyebrow">404</p>
        <h1 class="page-title reveal" data-i18n="error.title">That page does not exist</h1>
        <p class="muted reveal" data-i18n="error.text">The link may be old, or the address may have a typo in it.</p>
        <p class="reveal"><a class="primary-btn inline" href="/" data-i18n="error.cta">Back to the downloader</a></p>
      </div>
    </section>`,
  });

module.exports = { home, audio, photo, about, contact, privacy, terms, notFound };
