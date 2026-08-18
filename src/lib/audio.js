'use strict';

const { spawn, execFile } = require('child_process');
const config = require('../config');
const { DESKTOP_UA } = require('./http');

let availability = null;

/** Cached probe so a missing ffmpeg is only looked up once per process. */
function isAvailable() {
  if (availability) return availability;

  availability = new Promise((resolve) => {
    execFile(config.ffmpegPath, ['-version'], { timeout: 8000 }, (error) => resolve(!error));
  });

  return availability;
}

/**
 * Pulls the audio track out of a remote MP4 and pipes it back as MP3.
 *
 * Response headers are deliberately withheld until ffmpeg produces its first
 * byte: if the source has no audio track, or the CDN link has expired, we can
 * still answer with a clean JSON error instead of a truncated download.
 */
function streamAudio({ url, filename, res, onError }) {
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-user_agent', DESKTOP_UA,
    '-headers', 'Referer: https://www.instagram.com/\r\n',
    '-i', url,
    '-vn',                    // drop the video stream
    '-map', 'a:0',            // first audio track only
    '-acodec', 'libmp3lame',
    '-b:a', config.audioBitrate,
    '-f', 'mp3',
    'pipe:1',
  ];

  const ffmpeg = spawn(config.ffmpegPath, args, { windowsHide: true });

  let headersSent = false;
  let stderr = '';
  let finished = false;

  const fail = (message) => {
    if (finished) return;
    finished = true;
    onError(message);
  };

  ffmpeg.stdout.on('data', (chunk) => {
    if (!headersSent) {
      headersSent = true;
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      res.set('Cache-Control', 'no-store');
    }
    if (!res.write(chunk)) ffmpeg.stdout.pause();
  });

  res.on('drain', () => ffmpeg.stdout.resume());

  ffmpeg.stderr.on('data', (chunk) => {
    // Keep only the tail; a failing conversion can be very chatty.
    stderr = (stderr + chunk.toString()).slice(-2000);
  });

  ffmpeg.on('error', () => {
    fail('ffmpeg could not be started. Check the FFMPEG_PATH setting.');
  });

  ffmpeg.on('close', (code) => {
    if (headersSent) {
      finished = true;
      return res.end();
    }

    if (code === 0) return fail('No audio could be extracted from that post.');

    const noAudio = /does not contain any stream|Stream map .* matches no streams|Output file #0 does not contain/i.test(stderr);
    const expired = /403 Forbidden|404 Not Found|Server returned/i.test(stderr);

    fail(
      noAudio
        ? 'That post has no audio track.'
        : expired
        ? 'The media link expired. Fetch the post again and retry.'
        : 'Audio extraction failed. Try again in a moment.'
    );
  });

  // Do not leave a converter running for a download the user cancelled.
  res.on('close', () => {
    if (!res.writableEnded) ffmpeg.kill('SIGKILL');
  });
}

module.exports = { isAvailable, streamAudio };
