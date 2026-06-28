/**
 * FitAlchemy — One-Time Exercise Image Downloader
 * Run once: node download-exercise-images.js
 * Downloads all Wger exercise images to public/exercise-images/
 * After running, images load from localhost — no external dependency.
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const OUTPUT_DIR = path.join(__dirname, 'public', 'exercise-images');
const WGER_BASE  = 'https://wger.de';
const DELAY_MS   = 300; // polite delay between requests

// Make sure output folder exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('📁 Created folder: public/exercise-images/');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllImages() {
  let page = 1;
  let downloaded = 0;
  let skipped    = 0;
  let failed     = 0;

  console.log('🚀 Starting Wger image download...\n');

  while (true) {
    try {
      const res = await axios.get(`${WGER_BASE}/api/v2/exerciseimage/`, {
        params: { format: 'json', limit: 100, offset: (page - 1) * 100 },
        headers: { 'User-Agent': 'FitAlchemy/1.0 (educational project)' },
        timeout: 10000
      });

      const { results, next } = res.data;
      if (!results || results.length === 0) break;

      console.log(`📄 Page ${page} — ${results.length} images`);

      for (const img of results) {
        if (!img.image) continue;

        // Build local filename from URL — e.g. "123-Front.jpg"
        const urlPath  = img.image.startsWith('http') ? img.image : WGER_BASE + img.image;
        const filename = `${img.exercise}-${path.basename(urlPath)}`;
        const destPath = path.join(OUTPUT_DIR, filename);

        // Skip if already downloaded
        if (fs.existsSync(destPath)) {
          skipped++;
          continue;
        }

        try {
          const imgRes = await axios.get(urlPath, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: { 'User-Agent': 'FitAlchemy/1.0 (educational project)' }
          });
          fs.writeFileSync(destPath, imgRes.data);
          downloaded++;
          process.stdout.write(`  ✅ ${filename}\n`);
          await sleep(DELAY_MS);
        } catch (e) {
          failed++;
          process.stdout.write(`  ❌ Failed: ${filename} — ${e.message}\n`);
        }
      }

      if (!next) break;
      page++;
      await sleep(500);

    } catch (err) {
      console.error('❌ Page fetch failed:', err.message);
      break;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Downloaded : ${downloaded}`);
  console.log(`   Skipped    : ${skipped} (already existed)`);
  console.log(`   Failed     : ${failed}`);
  console.log(`\n📂 Images saved to: public/exercise-images/`);
}

fetchAllImages();
