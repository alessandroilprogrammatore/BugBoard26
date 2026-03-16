import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'frames_tutorial');
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

    // Mouse pointer and Tooltip simulation
    await page.evaluateOnNewDocument(() => {
        window.addEventListener('DOMContentLoaded', () => {
            // Mouse Pointer
            const box = document.createElement('div');
            box.classList.add('puppeteer-mouse-pointer');

            // Tutorial Tooltip Box
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
          width: 20px;
          height: 20px;
          background: rgba(255,0,0,.4);
          border: 1px solid red;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        #puppeteer-tutorial-tooltip {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 15px 30px;
          border-radius: 8px;
          font-family: sans-serif;
          font-size: 18px;
          font-weight: bold;
          z-index: 20000;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          opacity: 0;
          transition: opacity 0.5s;
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

    const showTooltip = async (text, durationMs) => {
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
            await sleep(500); // let fade out
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
        } catch (e) { }
        return false;
    };

    // -------------------------------------------------------------------------------------
    // PART 1: NORMAL USER / DEVELOPER FLOW
    // -------------------------------------------------------------------------------------
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    isRecording = true;
    recordingLoop(); // start recording without awaiting

    await showTooltip("La Registrazione in realtà è bloccata, riservata agli Admin...", 3500);

    // Il form è disabilitato da mockup in Register.tsx
    // Mostriamo il form e poi clicchiamo su Login
    await sleep(2000);

    await showTooltip("Quindi navighiamo verso il Login per entrare come utente normale.", 3500);
    await clickByXpath('//button[contains(., "Torna al login")]');
    await sleep(2000);

    try {
        const inputs = await page.$$('input');
        // Email
        if (inputs[0]) {
            const bb = await inputs[0].boundingBox();
            await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('dev@bugboard.com', { delay: 50 });
        }
        // Pass
        if (inputs[1]) {
            const bb = await inputs[1].boundingBox();
            await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('dev123', { delay: 50 });
        }
        await sleep(500);
        try {
            const el = await page.$('button[type="submit"]');
            if (el) {
                const bounding_box = await el.boundingBox();
                await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
            }
        } catch (e) { }
    } catch (e) { }

    await sleep(3000);
    await showTooltip("Ecco la Dashboard di un Utente normale. Senza privilegi Admin.", 4000);

    // Home Utente
    await showTooltip("Lista Bug: L'utente può Esplorare e Creare nuovi Ticket", 2500);
    await clickByXpath('//span[text()="Bug"]'); // Bottom nav
    await sleep(3000);

    await showTooltip("Creazione di un nuovo Bug...", 2500);
    await clickByXpath('//button[contains(., "Nuovo")]');
    await sleep(2500);

    // Fill bug
    try {
        const inputs = await page.$$('input');
        const textareas = await page.$$('textarea');
        if (inputs[0]) {
            const bb = await inputs[0].boundingBox();
            await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('Errore login', { delay: 50 });
        }
        if (textareas[0]) {
            const bb = await textareas[0].boundingBox();
            await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('Non riesco a fare il reset pass.', { delay: 40 });
        }
        await sleep(1000);
        try {
            const el = await page.$('button[type="submit"]');
            if (el) {
                const bounding_box = await el.boundingBox();
                await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
            }
        } catch (e) { }
    } catch (e) { }

    await sleep(3000); // 3s

    await showTooltip("Il Bug appena creato si trova ora nella lista in attesa.", 3500);

    // Logout Utente
    await showTooltip("Ora passiamo ai poteri dell'Amministratore.", 3000);
    await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
    await sleep(2000);
    await clickByXpath('//button[contains(., "Esci")]');
    await sleep(3000);

    // -------------------------------------------------------------------------------------
    // PART 2: ADMIN FLOW 
    // -------------------------------------------------------------------------------------
    await showTooltip("Accesso al sistema come Amministratore (Admin)", 3500);
    try {
        const inputs = await page.$$('input');
        for (const input of inputs) {
            const type = await page.evaluate(el => el.type, input);
            if (type === 'email' || type === 'text') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin@bugboard.com', { delay: 30 });
            }
            if (type === 'password') {
                const bb = await input.boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin123', { delay: 30 });
            }
        }
        await sleep(500);
        try {
            const el = await page.$('button[type="submit"]');
            if (el) {
                const bounding_box = await el.boundingBox();
                await page.mouse.click(bounding_box.x + bounding_box.width / 2, bounding_box.y + bounding_box.height / 2);
            }
        } catch (e) { }
    } catch (e) { }

    await sleep(3500);

    await showTooltip("L'Admin gestisce gli Utenti (Promozioni o Ban)", 3500);
    await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
    await sleep(2000);
    await clickByXpath('//button[contains(., "Gestione utenti")]');
    await sleep(3500);
    await clickByXpath('//span[text()="Bug"]'); // Bottom nav
    await sleep(1500);

    await showTooltip("L'Admin può archiviare ticket o assegnarli ad altri developer.", 4000);
    await clickByXpath('//span[text()="Bug"]'); // Bottom nav
    await sleep(2500);

    const clickedBug = await clickByXpath('(//div[contains(@class, "cursor-pointer")])[1]'); // First BugCard
    await sleep(3000);

    if (clickedBug) {
        await showTooltip("Assegniamo questo Ticket ad un utente per la risoluzione.", 4000);
        await clickByXpath('//button[contains(., "Assegna")]');
        await sleep(3500);
        // Click Assegna button of the first user in the table 
        await clickByXpath('(//button[text()="Assegna"])[1]');
        await sleep(2000);
        await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
        await sleep(1500);
    }

    await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
    await sleep(2000);

    await showTooltip("Il pannello Report per generare le statistiche mensili.", 3500);
    await clickByXpath('//button[contains(., "Report mensili")]');
    await sleep(4000);
    await clickByXpath('//span[text()="Profilo"]'); // Bottom nav
    await sleep(1500);

    await showTooltip("Infine, la console di Esportazione CSV per gli Archivi/DB.", 3500);
    await clickByXpath('//button[contains(., "Esporta dati")]');
    await sleep(4000);

    await showTooltip("Tutorial e Workflow Completo Concluso!", 3000);
    await sleep(1000);

    isRecording = false;
    await sleep(1000); // wait for remaining frame

    await browser.close();

    console.log(`Tutorial Video saved ${frameCount} frames! Compiling...`);
    try {
        const videoPath = path.join(__dirname, 'Documentazione', 'Documentazione finale', 'immagini', 'tutorial_interattivo.mp4');
        execSync(`ffmpeg -y -framerate 10 -i "${OUTPUT_DIR}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`, { stdio: 'inherit' });
        console.log('Video saved to: ' + videoPath);
    } catch (err) {
        console.error('Error creating video:', err);
    }
})();
