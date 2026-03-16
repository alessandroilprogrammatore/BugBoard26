import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'scenari_tutorial');
const BASE = 'http://localhost:8080';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setupPage(browser) {
    const page = await browser.newPage();
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('about:blank');

    await page.evaluateOnNewDocument(() => {
        window.addEventListener('DOMContentLoaded', () => {
            // Mouse Pointer
            const box = document.createElement('div');
            box.classList.add('puppeteer-mouse-pointer');

            // Tutorial Tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'puppeteer-tutorial-tooltip';

            const styleElement = document.createElement('style');
            styleElement.innerHTML = `
        .puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 30px;
          height: 30px;
          background: rgba(255,50,50,.5);
          border: 2px solid red;
          border-radius: 15px;
          margin: -15px 0 0 -15px;
          padding: 0;
          transition: background .2s, border-radius .2s, transform .2s;
        }
        #puppeteer-tutorial-tooltip {
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          font-family: sans-serif;
          font-size: 16px;
          font-weight: bold;
          z-index: 20000;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
      `;
            document.head.appendChild(styleElement);
            document.body.appendChild(box);
            document.body.appendChild(tooltip);

            document.addEventListener('mousemove', event => {
                box.style.left = event.pageX + 'px';
                box.style.top = event.pageY + 'px';
            }, true);
            document.addEventListener('mousedown', event => {
                box.style.background = 'rgba(255,200,0,.8)';
                box.style.transform = 'scale(0.8)';
            }, true);
            document.addEventListener('mouseup', event => {
                box.style.background = 'rgba(255,50,50,.5)';
                box.style.transform = 'scale(1)';
            }, true);
        }, false);
    });

    return page;
}

const showTooltip = async (page, text, durationMs) => {
    await page.evaluate((msg) => {
        const t = document.getElementById('puppeteer-tutorial-tooltip');
        if (t) {
            t.innerText = msg;
            t.style.opacity = '1';
        }
    }, text);
    if (durationMs) {
        await sleep(durationMs);
        await page.evaluate(() => {
            const t = document.getElementById('puppeteer-tutorial-tooltip');
            if (t) t.style.opacity = '0';
        });
        await sleep(500);
    }
};

const clickByXpath = async (page, xpath) => {
    try {
        const els = await page.$$('::-p-xpath(' + xpath + ')');
        for (let el of els) {
            await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), el);
            await sleep(500);
            const bb = await el.boundingBox();
            if (bb && bb.width > 0 && bb.height > 0) {
                const x = bb.x + bb.width / 2;
                const y = bb.y + bb.height / 2;
                await page.mouse.move(x, y, { steps: 10 });
                await sleep(200);
                await page.mouse.click(x, y);
                return true;
            }
        }
    } catch (e) { }
    return false;
};

const typeRobust = async (page, index, text) => {
    const inputs = await page.$$('input');
    if (inputs[index]) {
        await page.evaluate(el => el.scrollIntoView({ block: 'center' }), inputs[index]);
        await sleep(300);
        const bb = await inputs[index].boundingBox();
        if (bb) {
            await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 5 });
            await page.mouse.click(bb.x + 10, bb.y + 10, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.keyboard.type(text, { delay: 30 });
        }
    }
}

let frameCount = 0;
let isRecording = false;

const startRecordingLoop = async (page, folderName) => {
    const framesDir = path.join(OUTPUT_DIR, folderName);
    if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir);

    frameCount = 0;
    isRecording = true;

    (async () => {
        while (isRecording) {
            const start = Date.now();
            try {
                const filename = path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
                await page.screenshot({ path: filename, type: 'jpeg', quality: 90 });
                frameCount++;
            } catch (e) { }
            const elapsed = Date.now() - start;
            const waitTime = Math.max(0, 100 - elapsed);
            await sleep(waitTime); // 10 fps
        }
    })();
    return framesDir;
};

const compileVideo = (framesDir, outputName) => {
    console.log(`Compiling ${outputName} from ${frameCount} frames...`);
    const videoPath = path.join(OUTPUT_DIR, outputName);
    try {
        execSync(`ffmpeg -y -framerate 10 -i "${framesDir}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`, { stdio: 'inherit' });
        console.log('Saved ' + videoPath);
    } catch (err) {
        console.error('Error compiling:', err);
    }
};

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ----------------------------------------------------------------------
    // PARTE 1: Autenticazione (ri-fatta perfettameente)
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 1: AUTHENTICATION (FIXED)");
        const page = await setupPage(browser);
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
        const framesDir = await startRecordingLoop(page, 'frames_part1');
        await sleep(1000);

        await showTooltip(page, "PARTE 1 — Autenticazione: Schermata di Login con email e password", 4000);

        // ADMIN
        await showTooltip(page, "Login come Admin (admin@bugboard.com / admin123)", 2000);
        await typeRobust(page, 0, 'admin@bugboard.com');
        await typeRobust(page, 1, 'admin123');
        await clickByXpath(page, '//button[@type="submit"]');
        await sleep(3500);

        await showTooltip(page, "Dashboard Admin aperta! Ora procediamo al Logout dal profilo.", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(2500);
        await clickByXpath(page, '//button[contains(., "Esci")]');
        await sleep(3000);

        // USER
        await showTooltip(page, "Login come User normale (user@bugboard.com / user123)", 2000);
        await typeRobust(page, 0, 'user@bugboard.com');
        await typeRobust(page, 1, 'user123');
        await clickByXpath(page, '//button[@type="submit"]');
        await sleep(3500);

        await showTooltip(page, "Login come User effettuato. Eseguiamo Logout.", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(2500);
        await clickByXpath(page, '//button[contains(., "Esci")]');
        await sleep(3000);

        // READONLY
        await showTooltip(page, "Infine Login come ReadOnly (readonly@bugboard.com)", 2000);
        await typeRobust(page, 0, 'readonly@bugboard.com');
        await typeRobust(page, 1, 'readonly123');
        await clickByXpath(page, '//button[@type="submit"]');
        await sleep(3500);

        await showTooltip(page, "In ReadOnly non si può creare nulla (manca il bottone Nuovo Bug).", 4000);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(3000);

        await showTooltip(page, "Né inserire commenti nei bug esistenti.", 4000);
        await clickByXpath(page, '(//div[contains(@class, "cursor-pointer")])[1]');
        await sleep(2000);
        await page.evaluate(() => { window.scrollBy(0, 1000); });
        await sleep(4000);

        await showTooltip(page, "Profilo Readonly.", 2000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(3000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_1_Auth.mp4');
        await page.close();
    }

    await browser.close();
    console.log("SCENARIO 1 RE-GENERATO.");
})();
