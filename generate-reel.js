const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const sharp = require('sharp');

const ffmpegPath = path.resolve(__dirname, 'node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
const outDir = path.resolve(__dirname, 'reel_assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('--- Step 1: Downloading Thai Voiceover Audio ---');

const scenes = [
  {
    id: 1,
    start: 0,
    duration: 5,
    text: 'ยิงแอดวันละร้อย แต่คนทักถามแล้วเงียบ รู้ไหมเพราะอะไร',
    subtitle: 'ยิงแอดวันละร้อย แต่คนทักถามแล้วเงียบ? รู้ไหมเพราะอะไร?'
  },
  {
    id: 2,
    start: 5,
    duration: 7,
    text: 'เพราะคุณไม่มีแลนดิ้งเพจ คอยตอบคำถามและปิดการขายไง แต่จะไปจ้างเป็นหมื่นทำไม ในเมื่อที่นี่หนึ่งวันเสร็จ',
    subtitle: 'เพราะคุณไม่มี Landing Page คอยตอบคำถามและปิดการขายไง! ไม่ต้องจ่ายเป็นหมื่น 1 วันเสร็จ!'
  },
  {
    id: 3,
    start: 12,
    duration: 13,
    text: 'นี่เลย เว็บฟาสต์ หนึ่งเก้าเก้า บริการทำแลนดิ้งเพจ หน้าเดียวสำหรับขายของและยิงแอดโดยเฉพาะ ราคาแค่หนึ่งร้อยเก้าสิบเก้าบาท ฟังไม่ผิด ร้อยเก้าสิบเก้าบาท',
    subtitle: 'นี่เลย! WebFast 199 บริการทำ Landing Page หน้าเดียวสำหรับขายของ แค่ 199 บาท ฟังไม่ผิด!'
  },
  {
    id: 4,
    start: 25,
    duration: 13,
    text: 'ได้เว็บสวย โหลดไว รองรับมือถือหนึ่งร้อยเปอร์เซ็นต์ มีปุ่มโทร ปุ่มไลน์ครบ เอาไปยิงแอด เฟซบุ๊ก ติ๊กต็อก ได้เลยทันที',
    subtitle: 'ได้เว็บสวย โหลดไว รองรับมือถือ 100% มีปุ่มโทร ปุ่มไลน์ครบ เอาไปยิงแอด Facebook, TikTok ได้เลย!'
  },
  {
    id: 5,
    start: 38,
    duration: 12,
    text: 'อยากได้เว็บขายดีแบบนี้ ทักแชทเพจ วันเดย์เว็บสองศูนย์สองหก หรือคลิกลิงก์ วันเดย์เว็บดอทเซโคเอดู ดอทคอม ด้านล่างได้เลย แอบกระซิบ รับแค่วันละสามคิวนะ',
    subtitle: 'อยากได้เว็บขายดีแบบนี้ ทักแชทเพจ onedayweb2026 หรือคลิกลิงก์ onedayweb.seikouedu.com รับแค่วันละ 3 คิว!'
  },
  {
    id: 6,
    start: 50,
    duration: 10,
    text: 'ชอบไอเดียนี้ กดไลก์ กดแชร์เก็บไว้เลย สนใจทักแชทด่วน หรือโทร ศูนย์แปดหก เก้าสามสอง สามแปดสามแปด ครับ',
    subtitle: 'ชอบไอเดียนี้ กดไลก์ กดแชร์เก็บไว้เลย! สนใจทักแชทด่วน หรือโทร 086-932-3838 ครับ!'
  }
];

function downloadVoice(text, filename) {
  return new Promise((resolve, reject) => {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=th&client=tw-ob';
    const filePath = path.join(outDir, filename);
    const file = fs.createWriteStream(filePath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', reject);
  });
}

async function prepareAudio() {
  const audioFiles = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const filename = `voice_${s.id}.mp3`;
    console.log(`Downloading voice ${s.id}...`);
    const p = await downloadVoice(s.text, filename);
    audioFiles.push(p);
  }

  console.log('Assembling 60-second audio track with FFmpeg...');
  // Build a complex filter to place each audio at exact timestamps: 0s, 5s, 12s, 25s, 38s, 50s
  // and pad total to 60s
  const fullAudioPath = path.join(outDir, 'voice_full.wav');
  
  // We can use an ffmpeg filter chain with adelay and amix
  const inputArgs = audioFiles.map(f => `-i "${f}"`).join(' ');
  const filterDelays = scenes.map((s, idx) => `[${idx}]adelay=${s.start * 1000}|${s.start * 1000}[a${idx}]`).join(';');
  const mixInputs = scenes.map((s, idx) => `[a${idx}]`).join('');
  const filterComplex = `"${filterDelays};${mixInputs}amix=inputs=6:dropout_transition=0,apad[out]"`;

  const cmd = `"${ffmpegPath}" -y ${inputArgs} -filter_complex ${filterComplex} -map "[out]" -t 60 "${fullAudioPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('Audio track created:', fullAudioPath);
  return fullAudioPath;
}

console.log('--- Step 2: Generating 9:16 Video Frames (720x1280) ---');

async function generateFrames() {
  // Scene 1: Hook
  const scene1Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#000000" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="720" height="500" fill="url(#topG)"/>
    <!-- Top Account -->
    <rect x="40" y="45" width="220" height="42" rx="21" fill="rgba(0,0,0,0.6)"/>
    <text x="60" y="73" font-family="sans-serif" font-weight="bold" font-size="18" fill="#FFFFFF">⚡ onedayweb2026</text>
    
    <!-- Red Badge -->
    <rect x="80" y="140" width="560" height="85" rx="20" fill="#EF4444" stroke="#B91C1C" stroke-width="4"/>
    <text x="360" y="198" font-family="sans-serif" font-weight="900" font-size="42" fill="#FFFFFF" text-anchor="middle">&quot;ยิงแอดแล้วเงียบ&quot;</text>

    <!-- Yellow Sticker -->
    <rect x="140" y="245" width="440" height="75" rx="18" fill="#FACC15" stroke="#CA8A04" stroke-width="4"/>
    <text x="360" y="296" font-family="sans-serif" font-weight="900" font-size="36" fill="#000000" text-anchor="middle">เพราะไม่มีหน้าเว็บ? 🤔</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#EF4444" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="25" fill="#FACC15" text-anchor="middle">&quot;ยิงแอดวันละร้อย แต่คนทักถามแล้วเงียบ?&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="25" fill="#FACC15" text-anchor="middle">รู้ไหมเพราะอะไร?</text>
  </svg>`;

  await sharp('reel-scene1-hook.jpg')
    .resize(720, 1280, { fit: 'cover' })
    .composite([{ input: Buffer.from(scene1Svg), top: 0, left: 0 }])
    .png()
    .toFile(path.join(outDir, 'frame_scene1.png'));

  // Scene 2: 1 Day Finished
  const heroResized = await sharp('hero-banner.jpg').resize(620, 360, { fit: 'cover' }).toBuffer();
  const scene2Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0B1329"/>
    <!-- Top Account -->
    <rect x="40" y="45" width="220" height="42" rx="21" fill="rgba(255,255,255,0.1)"/>
    <text x="60" y="73" font-family="sans-serif" font-weight="bold" font-size="18" fill="#FFFFFF">⚡ onedayweb2026</text>

    <!-- Red Cross Badge -->
    <rect x="70" y="140" width="580" height="85" rx="20" fill="#DC2626" stroke="#991B1B" stroke-width="4"/>
    <text x="360" y="198" font-family="sans-serif" font-weight="900" font-size="40" fill="#FFFFFF" text-anchor="middle">ไม่ต้องจ่ายเป็นหมื่น! ❌</text>

    <!-- Yellow 1 Day Badge -->
    <rect x="110" y="250" width="500" height="95" rx="24" fill="#FACC15" stroke="#CA8A04" stroke-width="4"/>
    <text x="360" y="315" font-family="sans-serif" font-weight="900" font-size="50" fill="#000000" text-anchor="middle">เสร็จใน 1 วัน! ⚡</text>

    <text x="360" y="860" font-family="sans-serif" font-weight="bold" font-size="26" fill="#38BDF8" text-anchor="middle">ตอบคำถาม &amp; ปิดการขายออโต้ 24 ชม.</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#38BDF8" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FACC15" text-anchor="middle">&quot;เพราะคุณไม่มี Landing Page คอยตอบคำถามและปิดการขายไง!&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FFFFFF" text-anchor="middle">จะไปจ้างเป็นหมื่นทำไม? ในเมื่อที่นี่ 1 วันเสร็จ!</text>
  </svg>`;

  await sharp(Buffer.from(scene2Svg))
    .composite([{ input: heroResized, top: 430, left: 50 }])
    .png()
    .toFile(path.join(outDir, 'frame_scene2.png'));

  // Scene 3: WebFast 199 Offer
  const logoResized = await sharp('logo.jpg').resize(180, 180).toBuffer();
  const scene3Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#080E1A"/>
    <!-- Top Account -->
    <rect x="40" y="45" width="220" height="42" rx="21" fill="rgba(255,255,255,0.1)"/>
    <text x="60" y="73" font-family="sans-serif" font-weight="bold" font-size="18" fill="#FFFFFF">⚡ onedayweb2026</text>

    <text x="360" y="420" font-family="sans-serif" font-weight="900" font-size="52" fill="#FFFFFF" text-anchor="middle">WebFast <tspan fill="#00D2FF">199</tspan></text>
    <text x="360" y="470" font-family="sans-serif" font-weight="bold" font-size="24" fill="#94A3B8" text-anchor="middle">รับทำ Landing Page หน้าเดียวสำหรับยิงแอดโดยเฉพาะ</text>

    <!-- Explosion Yellow Price -->
    <rect x="60" y="540" width="600" height="120" rx="30" fill="#FACC15" stroke="#EAB308" stroke-width="6"/>
    <text x="360" y="625" font-family="sans-serif" font-weight="900" font-size="64" fill="#000000" text-anchor="middle">แค่ 199 บาท!! 💥</text>

    <rect x="180" y="700" width="360" height="50" rx="25" fill="#1E293B"/>
    <text x="360" y="734" font-family="sans-serif" font-weight="bold" font-size="22" fill="#38BDF8" text-anchor="middle">ฟังไม่ผิด! ร้อยเก้าสิบเก้าบาท</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#FACC15" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FACC15" text-anchor="middle">&quot;นี่เลย! WebFast 199 บริการทำ Landing Page หน้าเดียวสำหรับยิงแอด&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FFFFFF" text-anchor="middle">ราคาแค่ 199 บาท! ฟังไม่ผิดร้อยเก้าสิบเก้าบาท!</text>
  </svg>`;

  await sharp(Buffer.from(scene3Svg))
    .composite([{ input: logoResized, top: 180, left: 270 }])
    .png()
    .toFile(path.join(outDir, 'frame_scene3.png'));

  // Scene 4: Features & Ads
  const multiResized = await sharp('responsive-showcase.jpg').resize(620, 380, { fit: 'cover' }).toBuffer();
  const scene4Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#09101F"/>
    <!-- Badges -->
    <rect x="60" y="130" width="280" height="70" rx="18" fill="#0284C7"/>
    <text x="200" y="176" font-family="sans-serif" font-weight="bold" font-size="28" fill="#FFFFFF" text-anchor="middle">รองรับมือถือ 📱</text>

    <rect x="380" y="130" width="280" height="70" rx="18" fill="#10B981"/>
    <text x="520" y="176" font-family="sans-serif" font-weight="bold" font-size="28" fill="#FFFFFF" text-anchor="middle">พร้อมยิงแอด 🚀</text>

    <!-- 3 Feature Boxes -->
    <rect x="60" y="660" width="600" height="60" rx="14" fill="#1E293B" stroke="#334155"/>
    <text x="90" y="700" font-family="sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF">⚡ โหลดเร็ว 0.8 วินาที</text>
    <text x="630" y="700" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="end">100% Mobile Ready</text>

    <rect x="60" y="740" width="600" height="60" rx="14" fill="#1E293B" stroke="#334155"/>
    <text x="90" y="780" font-family="sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF">📞 ปุ่มโทร &amp; ปุ่ม LINE ทันใจ</text>
    <text x="630" y="780" font-family="sans-serif" font-weight="bold" font-size="20" fill="#10B981" text-anchor="end">One-Click Contact</text>

    <rect x="60" y="820" width="600" height="60" rx="14" fill="#1E293B" stroke="#334155"/>
    <text x="90" y="860" font-family="sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF">🎯 ติดตั้ง Meta &amp; TikTok Pixel</text>
    <text x="630" y="860" font-family="sans-serif" font-weight="bold" font-size="20" fill="#A855F7" text-anchor="end">Pixel Tracking</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#10B981" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FACC15" text-anchor="middle">&quot;ได้เว็บสวย โหลดไว รองรับมือถือ 100% มีปุ่มโทร ปุ่มไลน์ครบ&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FFFFFF" text-anchor="middle">เอาไปยิงแอด Facebook, TikTok ได้เลยทันที!</text>
  </svg>`;

  await sharp(Buffer.from(scene4Svg))
    .composite([{ input: multiResized, top: 230, left: 50 }])
    .png()
    .toFile(path.join(outDir, 'frame_scene4.png'));

  // Scene 5: Urgent CTA
  const scene5Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#120B04"/>
    <rect x="60" y="150" width="600" height="95" rx="24" fill="#EF4444" stroke="#B91C1C" stroke-width="4"/>
    <text x="360" y="215" font-family="sans-serif" font-weight="900" font-size="44" fill="#FFFFFF" text-anchor="middle">ทักด่วน! รับวันละ 3 คิว 🔥</text>

    <!-- Website URL box -->
    <rect x="50" y="320" width="620" height="240" rx="28" fill="#1E293B" stroke="#00D2FF" stroke-width="4"/>
    <text x="360" y="380" font-family="sans-serif" font-weight="bold" font-size="26" fill="#94A3B8" text-anchor="middle">คลิกลิงก์เข้าชมหน้าเว็บได้เลย:</text>
    
    <rect x="80" y="415" width="560" height="75" rx="16" fill="#0B132B"/>
    <text x="360" y="465" font-family="sans-serif" font-weight="bold" font-size="30" fill="#38BDF8" text-anchor="middle">🔗 onedayweb.seikouedu.com</text>

    <text x="360" y="530" font-family="sans-serif" font-weight="bold" font-size="24" fill="#FACC15" text-anchor="middle">หรือทักแชทเพจ: onedayweb2026</text>

    <text x="360" y="750" font-family="sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" text-anchor="middle">⚡ จองคิววันนี้ ได้เว็บพรุ่งนี้ทันที! ⚡</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#F59E0B" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FACC15" text-anchor="middle">&quot;อยากได้เว็บขายดีแบบนี้ ทักแชทเพจ onedayweb2026&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FFFFFF" text-anchor="middle">หรือกดลิงก์ onedayweb.seikouedu.com แอบกระซิบ...รับแค่วันละ 3 คิว!</text>
  </svg>`;

  await sharp(Buffer.from(scene5Svg)).png().toFile(path.join(outDir, 'frame_scene5.png'));

  // Scene 6: Outro & Contact
  const scene6Svg = `
  <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#070C18"/>
    <rect x="120" y="130" width="480" height="85" rx="22" fill="#0284C7" stroke="#0369A1" stroke-width="4"/>
    <text x="360" y="190" font-family="sans-serif" font-weight="900" font-size="42" fill="#FFFFFF" text-anchor="middle">กดไลก์ &amp; แชร์ 📌</text>

    <text x="360" y="470" font-family="sans-serif" font-weight="bold" font-size="34" fill="#FFFFFF" text-anchor="middle">สนใจทำเว็บด่วน 1 วันเสร็จ โทรเลย!</text>

    <!-- Big Phone Number Box -->
    <rect x="60" y="530" width="600" height="120" rx="30" fill="#FACC15" stroke="#CA8A04" stroke-width="6"/>
    <text x="360" y="612" font-family="sans-serif" font-weight="900" font-size="56" fill="#000000" text-anchor="middle">📞 086-932-3838</text>

    <text x="360" y="730" font-family="sans-serif" font-weight="bold" font-size="26" fill="#94A3B8" text-anchor="middle">LINE: @webfast199 | เพจ: onedayweb2026</text>
    <text x="360" y="780" font-family="sans-serif" font-weight="bold" font-size="28" fill="#38BDF8" text-anchor="middle">เว็บสวย โหลดไว ปิดการขายทันที</text>

    <!-- Subtitle Bottom -->
    <rect x="40" y="1060" width="640" height="140" rx="24" fill="rgba(0,0,0,0.85)" stroke="#0284C7" stroke-width="2"/>
    <text x="360" y="1105" font-family="sans-serif" font-weight="bold" font-size="20" fill="#38BDF8" text-anchor="middle">VOICEOVER SUBTITLE</text>
    <text x="360" y="1145" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FACC15" text-anchor="middle">&quot;ชอบไอเดียนี้ กดไลก์ กดแชร์เก็บไว้เลย!&quot;</text>
    <text x="360" y="1178" font-family="sans-serif" font-weight="bold" font-size="23" fill="#FFFFFF" text-anchor="middle">สนใจทักแชทด่วน หรือโทร 086-932-3838 ครับ!</text>
  </svg>`;

  await sharp(Buffer.from(scene6Svg))
    .composite([{ input: logoResized, top: 240, left: 270 }])
    .png()
    .toFile(path.join(outDir, 'frame_scene6.png'));

  console.log('All 6 frames rendered successfully in:', outDir);
}

console.log('--- Step 3: Compiling Final MP4 Video ---');

async function compileVideo(audioPath) {
  // We produce a video stream of the 6 scenes using ffmpeg concat
  const concatList = path.join(outDir, 'concat_list.txt');
  let listContent = '';
  scenes.forEach(s => {
    const frameFile = path.join(outDir, `frame_scene${s.id}.png`).replace(/\\/g, '/');
    listContent += `file '${frameFile}'\nduration ${s.duration}\n`;
  });
  // Add last frame once more for duration completeness
  listContent += `file '${path.join(outDir, 'frame_scene6.png').replace(/\\/g, '/')}'\n`;
  fs.writeFileSync(concatList, listContent, 'utf-8');

  const finalMp4 = path.resolve(__dirname, 'webfast199-reel.mp4');

  const cmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatList}" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest "${finalMp4}"`;
  console.log('Executing FFmpeg command...');
  execSync(cmd, { stdio: 'inherit' });
  console.log('🎉 REEL MP4 CREATED SUCCESSFULLY:', finalMp4);
  const stats = fs.statSync(finalMp4);
  console.log(`Video File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

(async () => {
  try {
    const audio = await prepareAudio();
    await generateFrames();
    await compileVideo(audio);
  } catch (err) {
    console.error('Build Error:', err);
  }
})();
