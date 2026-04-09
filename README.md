# Herr Tech Video Editor

KI-gestützter lokaler Video-Editor — Whisper transkribiert, Claude analysiert Szenen und schlägt Schnitte vor, Remotion rendert das Ergebnis.

## Stack

| Tool | Zweck |
|---|---|
| Next.js 14 | Web-Framework (App Router) |
| OpenAI Whisper | Audio-Transkription |
| Anthropic Claude | Szenenanalyse & Schnittplan |
| Remotion | Video-Rendering |
| ffmpeg | Audio-Extraktion aus Video |
| Tailwind CSS | UI-Styling |

## Voraussetzungen

- **Node.js** ≥ 18
- **ffmpeg** installiert und im PATH:
  ```bash
  brew install ffmpeg        # macOS
  sudo apt install ffmpeg    # Ubuntu/Debian
  ```

## Setup

```bash
# 1. In den Projektordner wechseln
cd herr-tech-video-editor

# 2. Dependencies installieren
npm install

# 3. API-Keys prüfen (bereits befüllt in .env.local)
cat .env.local

# 4. Dev-Server starten
npm run dev
```

Danach die App unter **http://localhost:3000** öffnen.

## Workflow

```
Video hochladen
    ↓
ffmpeg extrahiert Audio (MP3)
    ↓
OpenAI Whisper → Transkript mit Zeitstempeln
    ↓
Anthropic Claude → Szenenanalyse & Schnittplan
    ↓
Ergebnisse im Browser anzeigen
    ↓
Optional: Remotion rendert geschnittenes Video
```

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx              # Hauptseite (Upload → Transkription → Analyse)
│   ├── layout.tsx            # App-Shell
│   └── api/
│       ├── upload/route.ts   # Datei-Upload & Metadaten
│       ├── transcribe/route.ts  # ffmpeg + Whisper
│       ├── analyze/route.ts     # Claude-Analyse
│       └── render/route.ts      # Remotion-Rendering
├── components/
│   ├── VideoUpload.tsx       # Drag & Drop Upload
│   ├── TranscriptionView.tsx # Transkript-Anzeige
│   └── SceneAnalysis.tsx     # Szenenplan + Empfehlungen
├── lib/
│   ├── ffmpeg.ts             # Audio-Extraktion, Metadaten
│   ├── whisper.ts            # OpenAI Whisper API
│   └── claude.ts             # Anthropic Claude API
└── remotion/
    ├── index.ts              # Remotion Entry Point
    ├── Root.tsx              # Kompositions-Registry
    └── VideoComposition.tsx  # Video-Schnitt-Logik
uploads/                      # Hochgeladene Videos (gitignored)
out/                          # Gerenderte Videos (gitignored)
```

## Remotion Studio (optional)

```bash
npm run remotion:studio
```

Öffnet das Remotion Studio unter http://localhost:3001 zum visuellen Bearbeiten der Komposition.

## Unterstützte Video-Formate

MP4, MOV, AVI, WebM

## Hinweise

- `.env.local` ist in `.gitignore` — API-Keys werden nicht ins Git committed.
- Hochgeladene Videos liegen lokal im `uploads/`-Ordner.
- Keine Cloud-Datenbank, keine externe Infrastruktur — alles läuft lokal.
