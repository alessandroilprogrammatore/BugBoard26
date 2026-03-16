import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'frames');
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

    const client = await page.target().createCDPSession();
    let frameCount = 0;

    client.on('Page.screencastFrame', async (frameObject) => {
        try {
            const filename = path.join(OUTPUT_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
            fs.writeFileSync(filename, Buffer.from(frameObject.data, 'base64'));
            frameCount++;
            await client.send('Page.screencastFrameAck', { sessionId: frameObject.sessionId });
        } catch (e) { }
    });

    // Start capturing
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
    console.log('Capturing started...');

    const moveAndClick = async (selector) => {
        try {
            const el = await page.$(selector);
            if (el) {
                const bounding_box = await el.boundingBox();
                await page.mouse.move(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2, { steps: 15 });
                await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
                return true;
            }
        } catch (e) { }
        return false;
    }

    const moveAndClickUrl = async (urlSuffix) => {
        try {
            const els = await page.$$(`a[href="${urlSuffix}"]`);
            for (let el of els) {
                const bounding_box = await el.boundingBox();
                if (bounding_box && bounding_box.width > 0 && bounding_box.height > 0) {
                    await page.mouse.move(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2, { steps: 15 });
                    await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
                    return true;
                }
            }
        } catch (e) { }
        return false;
    }

    // FLUSSO
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Login
    try {
        const inputs = await page.$$('input');
        for (const input of inputs) {
            const type = await page.evaluate(el => el.type, input);
            if (type === 'email' || type === 'text') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin@bugboard.com', { delay: 60 });
            }
            if (type === 'password') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin123', { delay: 60 });
            }
        }
        await sleep(500);
        await moveAndClick('button[type="submit"]');
    } catch (e) { console.log(e); }

    // Dashboard
    await sleep(4000);

    // Bugs
    console.log('Going to bugs');
    await moveAndClickUrl('/bugs');
    await sleep(2500);

    // Detailed Bug
    console.log('Going to detail');
    try {
        // Find the first row in the table or the first bug link
        const links = await page.$$('a[href^="/bug/"]');
        for (let link of links) {
            const href = await page.evaluate(el => el.getAttribute('href'), link);
            if (href && href !== '/bug/new' && !href.includes('edit') && !href.includes('assign')) {
                const bb = await link.boundingBox();
                if (bb && bb.width > 0) {
                    await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 15 });
                    await page.mouse.click(bb.x + 10, bb.y + 10);
                    break;
                }
            }
        }
        await sleep(3000);
    } catch (e) { console.log(e); }

    // Notifiche
    console.log('Going to notifications');
    await moveAndClickUrl('/notifications');
    await sleep(2000);

    // Profilo
    console.log('Going to profile');
    await moveAndClickUrl('/profile');
    await sleep(2500);

    await client.send('Page.stopScreencast');
    await browser.close();

    console.log(`Saved ${frameCount} frames.`);

    // Now run ffmpeg
    console.log('Running ffmpeg to compile video...');
    try {
        const videoPath = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'demo_fluida_finale.mp4');
        execSync(`ffmpeg -y -framerate 15 -i "${OUTPUT_DIR}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`, { stdio: 'inherit' });
        console.log('Video saved to: ' + videoPath);
    } catch (err) {
        console.error('Error creating video:', err);
    }
})();
