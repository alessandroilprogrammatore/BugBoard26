import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'frames_final');
const BASE = 'http://localhost:8080';

if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Mouse pointer simulation
    await page.evaluateOnNewDocument(() => {
        window.addEventListener('DOMContentLoaded', () => {
            const box = document.createElement('div');
            box.classList.add('puppeteer-mouse-pointer');
            const styleElement = document.createElement('style');
            styleElement.innerHTML = `
        .puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(255,0,0,.4);
          border: 1px solid red;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
      `;
            document.head.appendChild(styleElement);
            document.body.appendChild(box);
            document.addEventListener('mousemove', event => {
                box.style.left = event.pageX + 'px';
                box.style.top = event.pageY + 'px';
            }, true);
            document.addEventListener('mousedown', event => {
                box.style.background = 'rgba(255,0,0,.8)';
            }, true);
            document.addEventListener('mouseup', event => {
                box.style.background = 'rgba(255,0,0,.4)';
            }, true);
        }, false);
    });

    let isRecording = false;
    let frameCount = 0;

    const recordingLoop = async () => {
        while (isRecording) {
            const start = Date.now();
            try {
                const filename = path.join(OUTPUT_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
                await page.screenshot({ path: filename, type: 'jpeg', quality: 90 });
                frameCount++;
            } catch (e) { }
            const elapsed = Date.now() - start;
            const waitTime = Math.max(0, 100 - elapsed);
            await sleep(waitTime); // Exactly 10fps
        }
    };

    const clickByXpath = async (xpath) => {
        try {
            const els = await page.$$('::-p-xpath(' + xpath + ')');
            for (let el of els) {
                const bounding_box = await el.boundingBox();
                if (bounding_box && bounding_box.width > 0 && bounding_box.height > 0) {
                    const x = bounding_box.x + bounding_box.width / 2;
                    const y = bounding_box.y + bounding_box.height / 2;
                    await page.mouse.move(x, y, { steps: 15 });
                    await sleep(200);
                    await page.mouse.click(x, y);
                    return true;
                }
            }
        } catch (e) { console.log("XPATH FAIL: ", xpath, e.message); }
        return false;
    };

    const clickByPartialText = async (text) => {
        try {
            const els = await page.$$('::-p-text(' + text + ')');
            for (let el of els) {
                const bounding_box = await el.boundingBox();
                if (bounding_box && bounding_box.width > 0 && bounding_box.height > 0) {
                    const x = bounding_box.x + bounding_box.width / 2;
                    const y = bounding_box.y + bounding_box.height / 2;
                    await page.mouse.move(x, y, { steps: 15 });
                    await sleep(200);
                    await page.mouse.click(x, y);
                    return true;
                }
            }
        } catch (e) { console.log("TEXT FAIL: ", text, e.message); }
        return false;
    };

    // FLUSSO
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    isRecording = true;
    recordingLoop(); // start recording without awaiting

    // Login
    try {
        const inputs = await page.$$('input');
        for (const input of inputs) {
            const type = await page.evaluate(el => el.type, input);
            if (type === 'email' || type === 'text') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin@bugboard.com', { delay: 50 });
            }
            if (type === 'password') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin123', { delay: 50 });
            }
        }
        await sleep(500);
        try {
            const el = await page.$('button[type="submit"]');
            if (el) {
                const bounding_box = await el.boundingBox();
                await page.mouse.move(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2, { steps: 15 });
                await sleep(100);
                await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
            }
        } catch (e) { }
    } catch (e) { console.log(e); }

    // Dashboard
    await sleep(4000); // 4s

    console.log('Going to bugs');
    await clickByXpath('//span[text()="Bug"]'); // Bottom nav
    await sleep(3500); // 3.5s

    console.log('Going to detail');
    const clickedBug = await clickByXpath('(//div[contains(@class, "cursor-pointer")])[1]'); // First BugCard
    await sleep(3500); // 3.5s

    if (clickedBug) {
        console.log('Going to assign');
        await clickByXpath('//button[contains(., "Assegna")]');
        await sleep(3000); // 3s
        await page.goBack();
        await sleep(2000);
    }

    console.log('Going to notifications');
    await clickByXpath('//span[text()="Notifiche"]'); // Bottom nav
    await sleep(2500);

    console.log('Going to profile');
    await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
    await sleep(2500);

    console.log('Going to users');
    await clickByXpath('//button[contains(., "Gestione utenti")]');
    await sleep(3500);
    await page.goBack();
    await sleep(1500);

    console.log('Going to reports');
    await clickByXpath('//button[contains(., "Report mensili")]');
    await sleep(4000);
    await page.goBack();
    await sleep(1500);

    console.log('Going to archive');
    await clickByXpath('//button[contains(., "Archivio")]');
    await sleep(2500);
    await page.goBack();
    await sleep(1500);

    console.log('Going to export');
    await clickByXpath('//button[contains(., "Esporta dati")]');
    await sleep(3500);

    console.log('Ending recording');
    await sleep(2000);

    isRecording = false;
    await sleep(1000); // wait for remaining frame

    await browser.close();

    console.log(`Video saved ${frameCount} frames! Compiling...`);
    try {
        const videoPath = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'flusso_definitivo_completo.mp4');
        execSync(`ffmpeg -y -framerate 10 -i "${OUTPUT_DIR}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`, { stdio: 'inherit' });
        console.log('Video saved to: ' + videoPath);
    } catch (err) {
        console.error('Error creating video:', err);
    }
})();
