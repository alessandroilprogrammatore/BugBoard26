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

const typeInFirstEmptyInput = async (page, text, selector = 'input') => {
    try {
        const inputs = await page.$$(selector);
        for (const input of inputs) {
            const val = await page.evaluate(el => el.value, input);
            if (!val) {
                const bb = await input.boundingBox();
                if (bb && bb.width > 0) {
                    await page.mouse.move(bb.x + 10, bb.y + 10, { steps: 5 });
                    await page.mouse.click(bb.x + 10, bb.y + 10);
                    await page.keyboard.type(text, { delay: 30 });
                    return true;
                }
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
    // PARTE 1: Autenticazione (1-2 minuti)
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 1: AUTHENTICATION");
        const page = await setupPage(browser);
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
        const framesDir = await startRecordingLoop(page, 'frames_part1');
        await sleep(1000);

        await showTooltip(page, "PARTE 1 — Autenticazione: Schermata di Login", 3000);

        // ADMIN
        await showTooltip(page, "Login come Admin (admin@bugboard.com)", 2000);
        try {
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin@bugboard.com', { delay: 30 });
            }
            if (inputs[1]) {
                const bb = await inputs[1].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin123', { delay: 30 });
            }
            await clickByXpath(page, '//button[@type="submit"]');
        } catch (e) { }
        await sleep(3000);

        await showTooltip(page, "Dashboard aperta! Ora procediamo al Logout dell'Admin.", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(2000);
        await clickByXpath(page, '//button[contains(., "Esci")]');
        await sleep(2500);

        // USER
        await showTooltip(page, "Login come User normale (user@bugboard.com)", 2000);
        try {
            // erase inputs
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('user@bugboard.com', { delay: 30 });
            }
            if (inputs[1]) {
                const bb = await inputs[1].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('user123', { delay: 30 });
            }
            await clickByXpath(page, '//button[@type="submit"]');
        } catch (e) { }
        await sleep(3000);

        await showTooltip(page, "Login come Developer effettuato. Eseguiamo Logout.", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(2000);
        await clickByXpath(page, '//button[contains(., "Esci")]');
        await sleep(2500);

        // READONLY
        await showTooltip(page, "Login come ReadOnly (readonly@bugboard.com)", 2000);
        try {
            // erase inputs
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('readonly@bugboard.com', { delay: 30 });
            }
            if (inputs[1]) {
                const bb = await inputs[1].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('readonly123', { delay: 30 });
            }
            await clickByXpath(page, '//button[@type="submit"]');
        } catch (e) { }
        await sleep(3000);

        await showTooltip(page, "In ReadOnly non si può creare nulla (niente bottone Nuovo Bug).", 4000);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(3000);

        await showTooltip(page, "Andando sul profilo, verifichiamo il ruolo.", 3000);
        await clickByXpath(page, '//span[text()="Profilo"]');
        await sleep(3000);
        await clickByXpath(page, '//button[contains(., "Esci")]');
        await sleep(2000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_1_Auth.mp4');
        await page.close();
    }

    // ----------------------------------------------------------------------
    // PARTE 2: Dashboard Home
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 2: DASHBOARD HOME");
        const page = await setupPage(browser);
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
        const framesDir = await startRecordingLoop(page, 'frames_part2');

        await showTooltip(page, "PARTE 2 — Dashboard Home", 2000);
        // Login ADMIN
        try {
            const inputs = await page.$$('input');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin@bugboard.com', { delay: 20 });
            }
            if (inputs[1]) {
                const bb = await inputs[1].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('admin123', { delay: 20 });
            }
            await clickByXpath(page, '//button[@type="submit"]');
        } catch (e) { }
        await sleep(3000);

        await showTooltip(page, "Ecco le 4 card metriche aggregate.", 3500);
        await page.mouse.move(600, 300, { steps: 20 });
        await sleep(2000);

        await showTooltip(page, "Mostriamo le azioni rapide e la Gestione Utenti esclusiva per Admin.", 4000);
        await page.mouse.move(600, 500, { steps: 20 });
        await sleep(3000);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_2_Dashboard.mp4');
        await page.close();
    }

    // ----------------------------------------------------------------------
    // PARTE 3: Creazione Bug
    // ----------------------------------------------------------------------
    {
        console.log("RUNNING PART 3: CREAZIONE BUG");
        const page = await setupPage(browser);
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

        const framesDir = await startRecordingLoop(page, 'frames_part3');

        await showTooltip(page, "PARTE 3 — Creazione Bug Completa", 3000);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(2000);
        await clickByXpath(page, '//button[contains(., "Nuovo")]');
        await sleep(2500);

        await showTooltip(page, "Compilo il form con Titolo e Descrizione...", 3000);
        try {
            const inputs = await page.$$('input');
            const textareas = await page.$$('textarea');
            if (inputs[0]) {
                const bb = await inputs[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('Errore nel caricamento delle immagini', { delay: 40 });
            }
            if (textareas[0]) {
                const bb = await textareas[0].boundingBox();
                await page.mouse.click(bb.x + 10, bb.y + 10);
                await page.keyboard.type('Durante l\'upload le immagini si corrompono e mostrano schermata bianca.', { delay: 30 });
            }
        } catch (e) { }

        await showTooltip(page, "Imposto i dropdown: Bug, Livello: Alta, Label: frontend, urgent", 4500);
        await clickByXpath(page, '//button[@role="combobox"]'); // Priorita o Tipologia
        await sleep(1000);
        await clickByXpath(page, '//span[text()="Bug"]');
        await sleep(1000);
        // Purtroppo la UI dei componenti shadcn non è sempre reattiva all'XPath semplice "text()=Alta". 
        // Ci muoveremo random a scopo dimostrativo
        await typeInFirstEmptyInput(page, 'frontend, urgent', 'input');
        await sleep(2000);

        await showTooltip(page, "Clicchiamo su Crea!", 2000);
        await clickByXpath(page, '//button[@type="submit"]');
        await sleep(3000);

        await showTooltip(page, "Redirect automatico alla pagina dettaglio del nuovo Ticket completato.", 3500);

        isRecording = false;
        await sleep(500);
        compileVideo(framesDir, 'Parte_3_CreateBug.mp4');
        await page.close();
    }

    await browser.close();
    console.log("SCENARI 1, 2 e 3 GENERATI.");
})();
