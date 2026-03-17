from __future__ import annotations

import math
import shutil
import subprocess
import textwrap
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
SCREEN_DIR = ROOT / "tutorial_screenshots"
DOC_IMG_DIR = ROOT / "Documentazione" / "Documentazione finale" / "immagini"
TEMP_DIR = ROOT / "dist" / "tutorial_video_frames"
OUTPUT = ROOT / "dist" / "bugboard26_tutorial_local.mp4"

WIDTH = 1920
HEIGHT = 1080
FPS = 10


@dataclass
class Point:
    t: float
    x: float
    y: float
    click: bool = False


@dataclass
class Scene:
    title: str
    subtitle: str
    duration: float
    image: Path | None = None
    bullets: list[str] = field(default_factory=list)
    cursor: list[Point] = field(default_factory=list)
    zoom_start: float = 1.0
    zoom_end: float = 1.03
    image_pan_x: float = 0.0
    image_pan_y: float = 0.0
    mode: str = "image"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_TITLE = load_font(48, bold=True)
FONT_SUBTITLE = load_font(28, bold=False)
FONT_BODY = load_font(30, bold=False)
FONT_SMALL = load_font(24, bold=False)
FONT_ROLE = load_font(34, bold=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def ensure_clean_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def build_background() -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), "#07111d")
    px = img.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            dx = (x - WIDTH * 0.5) / WIDTH
            dy = (y - HEIGHT * 0.4) / HEIGHT
            glow = max(0.0, 1.0 - math.sqrt(dx * dx * 2.5 + dy * dy * 4.0) * 3.2)
            r = int(7 + glow * 16)
            g = int(17 + glow * 34)
            b = int(29 + glow * 54)
            px[x, y] = (r, g, b)
    return img


BACKGROUND_BASE = build_background().convert("RGBA")


def fit_image(img: Image.Image, progress: float, zoom_start: float, zoom_end: float, pan_x: float, pan_y: float) -> tuple[Image.Image, tuple[int, int]]:
    max_w = 900
    max_h = 920
    ratio = min(max_w / img.width, max_h / img.height)
    base_w = int(img.width * ratio)
    base_h = int(img.height * ratio)
    zoom = lerp(zoom_start, zoom_end, ease(progress))
    scaled_w = max(base_w, int(base_w * zoom))
    scaled_h = max(base_h, int(base_h * zoom))
    scaled = img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

    crop_x = int(max(0, (scaled_w - base_w) * 0.5 + pan_x * (scaled_w - base_w) * 0.5))
    crop_y = int(max(0, (scaled_h - base_h) * 0.5 + pan_y * (scaled_h - base_h) * 0.5))
    crop_x = min(crop_x, max(0, scaled_w - base_w))
    crop_y = min(crop_y, max(0, scaled_h - base_h))
    cropped = scaled.crop((crop_x, crop_y, crop_x + base_w, crop_y + base_h))
    pos = (WIDTH // 2 - base_w // 2 + 250, HEIGHT // 2 - base_h // 2 + 30)
    return cropped, pos


def draw_card_shadow(canvas: Image.Image, pos: tuple[int, int], size: tuple[int, int]) -> None:
    shadow = Image.new("RGBA", (size[0] + 80, size[1] + 80), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle((40, 40, size[0] + 40, size[1] + 40), radius=36, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(shadow, (pos[0] - 40, pos[1] - 30))


def draw_header(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    draw.rounded_rectangle((52, 42, 760, 170), radius=28, fill=(6, 14, 24, 210), outline=(47, 122, 219, 140), width=2)
    draw.text((86, 68), title, fill="white", font=FONT_TITLE)
    draw.text((88, 124), subtitle, fill=(183, 212, 242), font=FONT_SUBTITLE)


def draw_bullets(draw: ImageDraw.ImageDraw, bullets: list[str]) -> None:
    if not bullets:
        return
    box = (56, 210, 820, 980)
    draw.rounded_rectangle(box, radius=28, fill=(9, 19, 32, 228), outline=(56, 81, 115, 180), width=2)
    y = 248
    for bullet in bullets:
        wrapped = textwrap.wrap(bullet, width=36)
        draw.ellipse((92, y + 10, 108, y + 26), fill=(95, 177, 255))
        draw.text((126, y), wrapped[0], fill="white", font=FONT_BODY)
        y += 42
        for extra in wrapped[1:]:
            draw.text((126, y), extra, fill=(218, 228, 241), font=FONT_BODY)
            y += 38
        y += 18


def interpolate_cursor(points: list[Point], progress: float) -> tuple[float, float, float]:
    if not points:
        return 0.75, 0.8, 0.0
    if progress <= points[0].t:
        pulse = 1.0 if points[0].click and progress < points[0].t + 0.04 else 0.0
        return points[0].x, points[0].y, pulse
    for idx in range(len(points) - 1):
        start = points[idx]
        end = points[idx + 1]
        if start.t <= progress <= end.t:
            local = 0.0 if end.t == start.t else ease((progress - start.t) / (end.t - start.t))
            x = lerp(start.x, end.x, local)
            y = lerp(start.y, end.y, local)
            pulse = 1.0 if start.click and progress - start.t < 0.06 else 0.0
            return x, y, pulse
    last = points[-1]
    pulse = 1.0 if last.click and progress - last.t < 0.06 else 0.0
    return last.x, last.y, pulse


def draw_cursor(canvas: Image.Image, image_pos: tuple[int, int], image_size: tuple[int, int], points: list[Point], progress: float) -> None:
    x_norm, y_norm, pulse = interpolate_cursor(points, progress)
    x = int(image_pos[0] + x_norm * image_size[0])
    y = int(image_pos[1] + y_norm * image_size[1])

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    radius = 18
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 255, 255, 230), outline=(12, 25, 40, 255), width=3)
    draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(17, 24, 39, 220))

    if pulse > 0:
        pulse_radius = int(34 + 26 * pulse)
        alpha = int(160 * (1.0 - min(1.0, pulse)))
        draw.ellipse((x - pulse_radius, y - pulse_radius, x + pulse_radius, y + pulse_radius), outline=(87, 195, 255, alpha), width=5)

    canvas.alpha_composite(overlay)


def scene_alpha(progress: float) -> float:
    fade = 0.08
    if progress < fade:
        return progress / fade
    if progress > 1.0 - fade:
        return (1.0 - progress) / fade
    return 1.0


def render_image_scene(scene: Scene, progress: float) -> Image.Image:
    canvas = BACKGROUND_BASE.copy()
    draw = ImageDraw.Draw(canvas)
    draw_header(draw, scene.title, scene.subtitle)
    draw_bullets(draw, scene.bullets)

    if scene.image is not None:
        source = Image.open(scene.image).convert("RGB")
        frame_img, pos = fit_image(source, progress, scene.zoom_start, scene.zoom_end, scene.image_pan_x, scene.image_pan_y)
        draw_card_shadow(canvas, pos, frame_img.size)
        frame_card = Image.new("RGBA", frame_img.size, (255, 255, 255, 255))
        frame_card.paste(frame_img, (0, 0))
        canvas.alpha_composite(frame_card, pos)
        draw_cursor(canvas, pos, frame_img.size, scene.cursor, progress)

    alpha = scene_alpha(progress)
    if alpha < 1.0:
        veil = Image.new("RGBA", (WIDTH, HEIGHT), (3, 8, 14, int((1.0 - alpha) * 255)))
        canvas.alpha_composite(veil)
    return canvas.convert("RGB")


def render_roles_scene(scene: Scene, progress: float) -> Image.Image:
    canvas = BACKGROUND_BASE.copy()
    draw = ImageDraw.Draw(canvas)
    draw_header(draw, scene.title, scene.subtitle)

    columns = [
        ("ADMIN", (203, 68, 52), ["Assegna bug", "Archivia e gestisce duplicati", "Accede a report e utenti", "Crea e modifica tutto"]),
        ("USER", (235, 149, 50), ["Crea bug", "Commenta e aggiorna", "Riceve notifiche", "Nessuna gestione utenti"]),
        ("READONLY", (52, 152, 219), ["Solo consultazione", "Nessun bottone Nuovo", "Nessun commento", "Nessuna azione di scrittura"]),
    ]

    card_w = 500
    card_h = 520
    gap = 46
    start_x = 164
    base_y = 300
    rise = int((1.0 - ease(progress)) * 50)

    for idx, (role, color, bullets) in enumerate(columns):
        x = start_x + idx * (card_w + gap)
        y = base_y + rise
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=34, fill=(10, 19, 30, 230), outline=color + (255,), width=4)
        draw.rounded_rectangle((x + 24, y + 24, x + 210, y + 88), radius=18, fill=color + (255,))
        draw.text((x + 52, y + 36), role, fill="white", font=FONT_ROLE)
        line_y = y + 132
        for bullet in bullets:
            wrapped = textwrap.wrap(bullet, width=24)
            draw.ellipse((x + 36, line_y + 10, x + 52, line_y + 26), fill=color + (255,))
            draw.text((x + 68, line_y), wrapped[0], fill="white", font=FONT_BODY)
            line_y += 40
            for extra in wrapped[1:]:
                draw.text((x + 68, line_y), extra, fill=(217, 226, 236), font=FONT_BODY)
                line_y += 34
            line_y += 24

    footer = "Developed for Software Engineering Course - 2026"
    footer_w = draw.textbbox((0, 0), footer, font=FONT_SMALL)[2]
    draw.text(((WIDTH - footer_w) // 2, 970), footer, fill=(192, 214, 236), font=FONT_SMALL)

    alpha = scene_alpha(progress)
    if alpha < 1.0:
        veil = Image.new("RGBA", (WIDTH, HEIGHT), (3, 8, 14, int((1.0 - alpha) * 255)))
        canvas.alpha_composite(veil)
    return canvas.convert("RGB")


def make_scenes() -> list[Scene]:
    s = SCREEN_DIR
    d = DOC_IMG_DIR
    return [
        Scene(
            title="BugBoard26 Tutorial",
            subtitle="Panoramica guidata dell'app web per issue tracking",
            duration=5,
            image=d / "utilizzo_app_fluido.webp",
            bullets=[
                "Demo visuale costruita dai tuoi screenshot reali e dai mockup del progetto.",
                "Formato video: 1920x1080 MP4, stile screen recording simulato.",
                "Focus: dashboard, creazione bug, filtri, dettaglio, amministrazione e report.",
            ],
            cursor=[Point(0.0, 0.2, 0.85), Point(1.0, 0.72, 0.78)],
            zoom_start=1.0,
            zoom_end=1.05,
        ),
        Scene(
            title="PARTE 2 - Dashboard Home",
            subtitle="Vista iniziale dell'amministratore",
            duration=12,
            image=s / "02_dashboard_admin.png",
            bullets=[
                "L'admin arriva sulla dashboard con metriche rapide in evidenza.",
                "Le card mostrano bug aperti, assegnazioni, risolti e scadenze vicine.",
                "Le azioni rapide portano a lista bug, creazione nuovo ticket e gestione utenti.",
            ],
            cursor=[
                Point(0.05, 0.26, 0.24),
                Point(0.22, 0.72, 0.24),
                Point(0.40, 0.26, 0.43),
                Point(0.58, 0.72, 0.43),
                Point(0.82, 0.49, 0.66, click=True),
            ],
            zoom_end=1.04,
        ),
        Scene(
            title="PARTE 3 - Creazione Bug",
            subtitle="Apertura del form Nuovo Bug",
            duration=8,
            image=s / "03_form_creazione_vuoto.png",
            bullets=[
                "Si apre il form con titolo, descrizione, tipo, priorita, scadenza ed etichette.",
                "Il layout e mobile-first ma leggibile anche in una composizione video desktop.",
            ],
            cursor=[
                Point(0.12, 0.27, 0.13, click=True),
                Point(0.34, 0.34, 0.22),
                Point(0.62, 0.35, 0.35),
                Point(0.90, 0.70, 0.86),
            ],
            zoom_end=1.03,
        ),
        Scene(
            title="PARTE 3 - Creazione Bug",
            subtitle="Compilazione dei campi principali",
            duration=12,
            image=s / "04_form_creazione_compilato.png",
            bullets=[
                "Titolo e descrizione vengono inseriti con testo realistico da caso d'uso.",
                "Il bug riguarda il caricamento di immagini PNG oltre 2MB in Docker.",
                "Il cursore accompagna l'attenzione sui campi obbligatori.",
            ],
            cursor=[
                Point(0.08, 0.35, 0.23, click=True),
                Point(0.34, 0.39, 0.41),
                Point(0.68, 0.39, 0.58),
                Point(0.88, 0.50, 0.74),
            ],
        ),
        Scene(
            title="PARTE 3 - Creazione Bug",
            subtitle="Priorita, data e labels",
            duration=10,
            image=s / "06_form_compilato_finale.png",
            bullets=[
                "La priorita viene portata su Alta e viene selezionata una scadenza.",
                "Le etichette frontend e urgent aiutano filtraggio e triage rapido.",
                "Il bottone Crea bug chiude il flusso con feedback di successo.",
            ],
            cursor=[
                Point(0.10, 0.42, 0.55, click=True),
                Point(0.36, 0.46, 0.67),
                Point(0.62, 0.64, 0.80),
                Point(0.86, 0.49, 0.91, click=True),
            ],
        ),
        Scene(
            title="PARTE 4 - Lista Bug",
            subtitle="Ricerca, tab e panoramica dei ticket",
            duration=12,
            image=s / "07_lista_bug.png",
            bullets=[
                "La lista mostra i ticket creati con badge per tipo, priorita e stato.",
                "Sono visibili tab Tutti, Assegnati a me e Archiviati.",
                "La barra di ricerca e i filtri permettono una navigazione rapida dei bug.",
            ],
            cursor=[
                Point(0.08, 0.82, 0.12),
                Point(0.28, 0.28, 0.24),
                Point(0.54, 0.50, 0.24),
                Point(0.78, 0.36, 0.40),
            ],
            zoom_end=1.04,
        ),
        Scene(
            title="PARTE 4 - Filtri",
            subtitle="Riduzione del risultato per priorita alta",
            duration=8,
            image=s / "08_filtro_priorita_alta.png",
            bullets=[
                "Applicando il filtro per priorita Alta la lista si restringe ai casi urgenti.",
                "Lo stesso schema supporta combinazioni con tipo, stato e ricerca testuale.",
            ],
            cursor=[
                Point(0.15, 0.51, 0.23, click=True),
                Point(0.42, 0.57, 0.29),
                Point(0.76, 0.60, 0.56),
            ],
        ),
        Scene(
            title="PARTE 5 - Dettaglio Bug",
            subtitle="Informazioni estese, cronologia e commenti",
            duration=12,
            image=s / "09_dettaglio_bug.png",
            bullets=[
                "La vista di dettaglio raccoglie dati, etichette, stato e pulsanti di azione.",
                "La sezione commenti documenta il lavoro del team sul ticket.",
                "La cronologia tiene traccia di modifiche, assegnazioni e aggiornamenti di stato.",
            ],
            cursor=[
                Point(0.08, 0.44, 0.17),
                Point(0.32, 0.62, 0.18),
                Point(0.58, 0.34, 0.64, click=True),
                Point(0.86, 0.42, 0.82),
            ],
        ),
        Scene(
            title="PARTE 6 - Modifica e Stato",
            subtitle="Aggiornamento del bug e progressione del workflow",
            duration=10,
            image=d / "mockup_05_dettaglio_bug.png",
            bullets=[
                "Dalla pagina di dettaglio l'admin puo modificare il bug e salvarne le variazioni.",
                "La priorita puo passare da Alta a Urgente e lo stato da TODO a IN PROGRESS a RESOLVED.",
            ],
            cursor=[
                Point(0.10, 0.67, 0.14, click=True),
                Point(0.42, 0.78, 0.38),
                Point(0.74, 0.74, 0.56),
            ],
            zoom_end=1.05,
        ),
        Scene(
            title="PARTE 7 - Assegnazione",
            subtitle="Suggerimento automatico dell'utente consigliato",
            duration=10,
            image=d / "mockup_07_assegnazione_bug.png",
            bullets=[
                "L'interfaccia evidenzia l'utente con carico minore come consigliato.",
                "Questo accelera il triage e distribuisce meglio il lavoro nel team.",
            ],
            cursor=[
                Point(0.12, 0.62, 0.36),
                Point(0.44, 0.45, 0.53, click=True),
                Point(0.84, 0.52, 0.87, click=True),
            ],
        ),
        Scene(
            title="PARTE 8 - Notifiche",
            subtitle="Aggiornamenti letti e non letti",
            duration=8,
            image=d / "mockup_08_notifiche.png",
            bullets=[
                "Le notifiche informano su assegnazioni, risoluzioni e altri eventi chiave.",
                "La vista supporta lettura puntuale o marcatura massiva come lette.",
            ],
            cursor=[
                Point(0.15, 0.46, 0.26, click=True),
                Point(0.60, 0.52, 0.72),
            ],
        ),
        Scene(
            title="PARTE 9 - Duplicati",
            subtitle="Collegamento di ticket ridondanti",
            duration=8,
            image=d / "diagramma_bug_management.png",
            bullets=[
                "Un bug puo essere marcato come duplicato di un ticket gia esistente.",
                "Il flusso evita dispersione, centralizza la discussione e semplifica l'archiviazione.",
            ],
            cursor=[
                Point(0.10, 0.37, 0.40),
                Point(0.42, 0.72, 0.39, click=True),
                Point(0.80, 0.74, 0.66),
            ],
            zoom_start=1.0,
            zoom_end=1.06,
        ),
        Scene(
            title="PARTE 10 - Archiviazione",
            subtitle="Conferma del passaggio in archivio",
            duration=8,
            image=d / "mockup_12_archivio.png",
            bullets=[
                "I ticket chiusi o duplicati possono essere archiviati e recuperati dalla tab dedicata.",
                "La separazione tra attivi e archiviati rende piu pulita la lista operativa.",
            ],
            cursor=[
                Point(0.16, 0.40, 0.22, click=True),
                Point(0.54, 0.30, 0.78),
            ],
        ),
        Scene(
            title="PARTE 11 - Gestione Utenti",
            subtitle="Funzioni amministrative su ruoli e account",
            duration=10,
            image=d / "mockup_11_admin_utenti.png",
            bullets=[
                "L'admin puo vedere gli utenti, creare nuovi account e distinguere i ruoli.",
                "Questa area governa permessi, onboarding e operativita del team.",
            ],
            cursor=[
                Point(0.08, 0.60, 0.19),
                Point(0.36, 0.78, 0.14, click=True),
                Point(0.78, 0.48, 0.54),
            ],
        ),
        Scene(
            title="PARTE 12 - Report",
            subtitle="Analytics e metriche aggregate",
            duration=10,
            image=d / "mockup_10_report_mensile.png",
            bullets=[
                "La pagina report sintetizza totale bug, risolti, tasso di chiusura e tempi medi.",
                "Le sezioni per utente aiutano a valutare carico e performance del gruppo.",
            ],
            cursor=[
                Point(0.10, 0.31, 0.22),
                Point(0.38, 0.62, 0.39),
                Point(0.72, 0.47, 0.73),
            ],
        ),
        Scene(
            title="PARTE 13 - Export",
            subtitle="Scarico dati in CSV o Excel",
            duration=8,
            image=d / "mockup_13_export.png",
            bullets=[
                "I dati possono essere esportati in CSV o XLSX per audit e analisi esterne.",
                "La funzione e utile per condivisione, backup e reporting accademico.",
            ],
            cursor=[
                Point(0.14, 0.42, 0.47, click=True),
                Point(0.58, 0.43, 0.63, click=True),
            ],
        ),
        Scene(
            title="PARTE 14 - Profilo",
            subtitle="Dati utente e scorciatoie rapide",
            duration=8,
            image=d / "mockup_09_profilo.png",
            bullets=[
                "Il profilo riassume identita, ruolo, email e accessi rapidi alle sezioni chiave.",
                "Da qui l'admin puo saltare a report, archivio, export e gestione utenti.",
            ],
            cursor=[
                Point(0.12, 0.49, 0.18),
                Point(0.44, 0.48, 0.43),
                Point(0.76, 0.49, 0.72),
            ],
        ),
        Scene(
            title="PARTE 15 - Differenze tra Ruoli",
            subtitle="Confronto finale tra Admin, User e Readonly",
            duration=10,
            mode="roles",
        ),
    ]


def render_scene(scene: Scene, frame_index: int, frame_total: int) -> Image.Image:
    progress = 0.0 if frame_total <= 1 else frame_index / (frame_total - 1)
    if scene.mode == "roles":
        return render_roles_scene(scene, progress)
    return render_image_scene(scene, progress)


def compile_video() -> None:
    command = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(TEMP_DIR / "frame_%05d.jpg"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(OUTPUT),
    ]
    subprocess.run(command, check=True)


def main() -> None:
    ensure_clean_dir(TEMP_DIR)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    scenes = make_scenes()
    frame_no = 0

    for scene in scenes:
        frame_total = max(1, int(scene.duration * FPS))
        for idx in range(frame_total):
            frame = render_scene(scene, idx, frame_total)
            frame.save(TEMP_DIR / f"frame_{frame_no:05d}.jpg", quality=92)
            frame_no += 1

    compile_video()
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
