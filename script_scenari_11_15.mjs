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
    await page.evaluateOnNewDocument(() => {
        window.addEventListener('DOMContentLoaded', () => {
            const box = document.createElement('div');
            box.classList.add('puppeteer-mouse-pointer');
            const tooltip = document.createElement('div');
            tooltip.id = 'puppeteer-tutorial-tooltip';
            const styleElement = document.createElement('style');
            styleElement.innerHTML = `
        .puppeteer-mouse-pointer {
          pointer-events: none; position: absolute; top: 0; z-index: 10000; left: 0;
          width: 30px; height: 30px; background: rgba(255,50,50,.5); border: 2px solid red;
          border-radius: 15px; margin: -15px 0 0 -15px; padding: 0;
          transition: background .2s, border-radius .2s, transform .2s;
        }
        #puppeteer-tutorial-tooltip {
          position: fixed; top: 20px; left: 20px; background: rgba(0, 0, 0, 0.85);
          color: white; padding: 10px 20px; border-radius: 6px; font-family: sans-serif;
          font-size: 16px; font-weight: bold; z-index: 20000; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
      `;
            document.head.appendChild(styleElement);
            document.body.appendChild(box);
            document.body.appendChild(tooltip);
            document.addEventListener('mousemove', event => {
                box.style.left = event.pageX + 'px'; box.style.top = event.pageY + 'px';
            }, true);
            document.addEventListener('mousedown', event => {
                box.style.background = 'rgba(255,200,0,.8)'; box.style.transform = 'scale(0.8)';
            }, true);
            document.addEventListener('mouseup', event => {
                box.style.background = 'rgba(255,50,50,.5)'; box.style.transform = 'scale(1)';
            }, true);
        }, false);
    });
    return page;
}

const showTooltip = async (page, text, durationMs) => {
    await page.evaluate((msg) => {
        const t = document.getElementById('puppeteer-tutorial-tooltip');
        if (t) { t.innerText = msg; t.style.opacity = '1'; }
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
            await sleep(waitTime);
        }
    })();
    return framesDir;
};

const compileVideo = (framesDir, outputName) => {
    console.log(`Compiling ${outputName}...`);
    const videoPath = path.join(OUTPUT_DIR, outputName);
    try {
        execSync(`ffmpeg -y -framerate 10 -i "${framesDir}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoPath}"`, { stdio: 'inherit' });
        console.log('Saved ' + videoPath);
    } catch (err) { console.error('Error compiling:', err); }
};

const loginAdmin = async (page) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    try {
        const inputs = await page.$$('input');
        if (inputs[0]) {
            const bb = await inputs[0].boundingBox();
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('admin@bugboard.com', { delay: 10 });
        }
        if (inputs[1]) {
            const bb = await inputs[1].boundingBox();
            await page.mouse.click(bb.x + 10, bb.y + 10);
            await page.keyboard.type('admin123', { delay: 10 });
        }
        await clickByXpath(page, '//button[@type="submit"]');
    } catch (e) { }
    await sleep(2500);
};

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
        // per test download automatico puppeteer
    });

    // ----------------------------------------------------------------------
    // PARTE 11: Gestione Utenti Admin
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 11: UTENTI");
        const page = await setupPage(browser);
        await loginAdmin(page);
        const framesDir = await startRecordingLoop(page, 'frames_part11');

        await showTooltip(page, "PARTE 11 — Gestione Utenti Admin", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(1500);
        await clickByXpath(page, '//button[contains(., "Gestione utenti")]');
        await sleep(2000);

        await showTooltip(page, "Qui Admin può visualizzare la lista globale o crearne di nuovi (es. Promozioni).", 4000);
        await page.mouse.move(500, 300, { steps: 10 });
        await sleep(1000);

        await clickByXpath(page, '//button[contains(., "Nuovo")]');
        await sleep(2000);

        await showTooltip(page, "Creo il nuovo collega: Mario Rossi", 3000);
        try {
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('Mario Rossi', { delay: 30 });
            }
            if (inputs[1]) {
                const bb = await inputs[1].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type(`mario.${Date.now()}@bugboard.com`, { delay: 20 });
            }
            if (inputs[2]) {
                const bb = await inputs[2].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('password123', { delay: 20 });
            }
        } catch (e) { }
        await sleep(1000);
        await clickByXpath(page, '//button[contains(., "Crea utente")]');
        await sleep(3500);

        await showTooltip(page, "Il nuovo utente appare immediatamente in lista.", 3500);
        await page.evaluate(() => { window.scrollBy(0, 500); });
        await sleep(2000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_11_Gestione_Utenti.mp4');
        await page.close();
    }

    // ----------------------------------------------------------------------
    // PARTE 12, 13, 14, 15: Analytics, Profilo e Differenze
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 12-15");
        const page = await setupPage(browser);

        // Imposto percorso download automatico a dummy
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path.resolve(__dirname, 'Documentazione', 'Documentazione finale', 'immagini')
        });

        await loginAdmin(page);
        const framesDir = await startRecordingLoop(page, 'frames_part12_15');

        await showTooltip(page, "PARTE 12 — Report e Analytics (Admin Only)", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(1500);
        await clickByXpath(page, '//button[contains(., "Report mensili")]');
        await sleep(2500);

        await showTooltip(page, "Grafico dei Bug Per Tipo (A torta) e i Dati di Risoluzione Media", 3500);
        await page.evaluate(() => { window.scrollBy(0, 300); });
        await sleep(2000);

        await showTooltip(page, "PARTE 13 — Esportazione Dati (CSV e PDF/Excel)", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]'); // Bottom nav
        await sleep(1500);
        await clickByXpath(page, '//button[contains(., "Esporta dati")]');
        await sleep(2500);

        await showTooltip(page, "Scarichiamo una copia CSV delle transazioni passate.", 3000);
        await clickByXpath(page, '//button[contains(., "CSV")]');
        await sleep(3000);

        await showTooltip(page, "PARTE 14 — Dettaglio Profilo Utente Globale", 3500);
        await clickByXpath(page, '//span[text()="Profilo"]'); // Bottom nav
        await sleep(2500);

        await showTooltip(page, "Tutte le funzioni sono comodamente raggiungibili in Dashboard o in Profilo.", 4500);

        await showTooltip(page, "PARTE 15 — Differenza Visiva Rapida", 3500);
        await showTooltip(page, "Gli Admin vedono queste righe: Gestione, Report, Archivi...", 3500);

        await showTooltip(page, "Invece l'Utente Standard e il ReadOnly hanno quest'area completamente NASCOSTA.", 4500);
        await page.mouse.move(600, 400, { steps: 20 });
        await sleep(3500);

        await showTooltip(page, "La Presentazione Universale BugBoard è Conclusa. Alla prossima!", 4000);
        await sleep(2000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_12_13_14_15_Fine.mp4');
        await page.close();
    }

    await browser.close();
    console.log("ALL SCENARIOS DONE.");
})();
