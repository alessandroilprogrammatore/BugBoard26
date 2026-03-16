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
    });

    // ----------------------------------------------------------------------
    // PARTE 7: ASSEGNAZIONE BUG CONSIGLIATA
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 7: ASSEGNAZIONE");
        const page = await setupPage(browser);
        await loginAdmin(page);
        const framesDir = await startRecordingLoop(page, 'frames_part7');

        await showTooltip(page, "PARTE 7 — Assegnazione Bug con Suggerimento Automatico", 3500);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(2000);

        await showTooltip(page, "1. Apriamo un ticket da assegnare", 2500);
        await clickByXpath(page, '(//div[contains(@class, "cursor-pointer")])[1]');
        await sleep(2000);

        await showTooltip(page, "2. Clicchiamo su 'Assegna' (Solo Admin)", 3000);
        await clickByXpath(page, '//button[contains(., "Assegna")]');
        await sleep(2500);

        await showTooltip(page, "3. Analizziamo i candidati tramite il Badge Consigliato", 4000);
        // Evidenziamo il Consigliato con il mouse 
        await page.waitForSelector('::-p-xpath(//span[contains(text(), "Consigliato")])', { timeout: 3000 }).catch(e => { });
        try {
            const els = await page.$$('::-p-text(Consigliato)');
            if (els[0]) {
                const bb = await els[0].boundingBox();
                await page.mouse.move(bb.x - 10, bb.y + 10, { steps: 20 });
                await sleep(2000);
            }
        } catch (e) { }

        await showTooltip(page, "4. Selezioniamo l'utente consigliato a Minor Carico Lavoro.", 3500);
        await clickByXpath(page, '(//button[text()="Assegna"])[1]');
        await sleep(3500);

        await showTooltip(page, "Verifica: L'assegnatario appare nel dettaglio Bug in modo permanente.", 4000);
        await clickByXpath(page, '(//div[contains(@class, "cursor-pointer")])[1]');
        await sleep(3500);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_7_Assegnazione.mp4');
        await page.close();
    }

    // ----------------------------------------------------------------------
    // PARTE 8: NOTIFICHE
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 8: NOTIFICHE");
        const page = await setupPage(browser);
        await loginAdmin(page); // Or user, maybe Admin
        const framesDir = await startRecordingLoop(page, 'frames_part8');

        await showTooltip(page, "PARTE 8 — Centro Notifiche e Lettura", 3500);
        await clickByXpath(page, '//span[text()="Notifiche"]');
        await sleep(2500);

        await showTooltip(page, "La lista delle notifiche Push inviate per e-mail e nel database.", 4000);
        await page.mouse.move(640, 300, { steps: 15 });
        await sleep(2000);

        await showTooltip(page, "Cliccandola viene visualizzata la relativa schermata Bug/Feature", 4000);
        await clickByXpath(page, '(//h3[contains(@class, "font-semibold")])[1]');
        await sleep(3500);
        await page.goBack();
        await sleep(2000);

        await showTooltip(page, "E con un semplice tocco si segnano TUTTE quelle arretrate come lette.", 4000);
        await clickByXpath(page, '//button[contains(., "Segna tutte come lette")]');
        await sleep(3000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_8_Notifiche.mp4');
        await page.close();
    }

    // ----------------------------------------------------------------------
    // PARTE 9 E 10: DUPLICATI E ARCHIVIAZIONE
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 9 E 10: ARCHIVIAZIONE");
        const page = await setupPage(browser);
        await loginAdmin(page);
        const framesDir = await startRecordingLoop(page, 'frames_part9_10');

        await showTooltip(page, "PARTE 9 — Gestione Duplicati Ticket", 3000);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(2000);
        await clickByXpath(page, '(//div[contains(@class, "cursor-pointer")])[1]');
        await sleep(2000);

        await showTooltip(page, "I bottoni Admin consentono di Archiviare o marcare in duplicato.", 3500);
        await page.mouse.move(700, 200, { steps: 10 });
        await sleep(1500);

        await showTooltip(page, "L'annessione dei Duplicati in un Master Bug:", 3000);
        await clickByXpath(page, '//button[contains(., "Duplicato")]');
        await sleep(2500);

        await clickByXpath(page, '(//button[contains(., "Seleziona")])[1]');
        await sleep(3000);

        await showTooltip(page, "PARTE 10 — L'archiviazione di base per la chiusura definitiva:", 3500);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(2000);
        await clickByXpath(page, '(//div[contains(@class, "cursor-pointer")])[1]');
        await sleep(2000);

        await showTooltip(page, "Clicco Archivia sul ticket isolato...", 3000);
        await clickByXpath(page, '//button[contains(., "Archivia")]');
        await sleep(3000);

        await showTooltip(page, "Navighiamo ai Registri per trovare tutti i Ticket Archiviati / Dead", 4000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(1500);
        await clickByXpath(page, '//button[contains(., "Archivio")]');
        await sleep(2500);

        await showTooltip(page, "Con tanto di filtro Ricerca globale dell'Archetipo.", 3000);
        try {
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 10 });
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('login', { delay: 40 });
            }
        } catch (e) { }
        await sleep(2500);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_9_10_Admin_Azioni.mp4');
        await page.close();
    }

    await browser.close();
    console.log("SCENARI 7, 8, 9, 10 GENERATI.");
})();
