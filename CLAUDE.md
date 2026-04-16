# Herr Tech Video Creator

AI-gestütztes Video-Erstellungs-Tool (Next.js 14). Automatisiert die Produktion von illustrierten/animierten Videoinhalten aus Rohmaterial oder Text-Prompts.

## Stack

- **Frontend:** Next.js 14 (React 18) + Tailwind CSS (Dark Theme, Akzentfarbe `#B598E2`)
- **Backend:** Next.js API Routes (Node.js)
- **Video-Rendering:** Remotion 4
- **Audio/Video-Verarbeitung:** FFmpeg (lokal installiert)
- **Projektdaten:** JSON-Dateien in `tmp/projects/{id}/project.json` (kein DB)
- **Uploads:** `uploads/` — Transkripte: `transcripts/`

## AI-Modelle

| Aufgabe | Modell | Kosten |
|---|---|---|
| Transkription | OpenAI Whisper (`whisper-1`) | $0,006/min |
| Szenen-Erkennung, Übersetzung | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1/$5 pro 1M Tokens |
| Screenshot-Analyse, Bild-Prompts | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | $3/$15 pro 1M Tokens |
| Video-Konzept aus Text-Prompt | Claude Opus 4.6 (`claude-opus-4-6`) | $5/$25 pro 1M Tokens |
| Bildgenerierung (primär) | Gemini 3 Pro Image Preview (`gemini-3-pro-image-preview`) | ~$0,04/Bild |
| Bildgenerierung (Fallback) | Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) | ~$0,04/Bild |
| Bildgenerierung (Legacy/Vertex AI) | Imagen 4 Ultra / Imagen 3 Capability | $0,06/$0,04 pro Bild |
| Videogenerierung (Kling) | FAL.ai Kling v3 Standard (`fal-ai/kling-video/v3/standard/image-to-video`) | $0,084/sek (ohne Sound) |
| Videogenerierung (Veo) | FAL.ai Veo 3.1 Lite (`fal-ai/veo3.1/lite/image-to-video`) | $0,03–0,08/sek |

## Pipeline

```
Upload / URL / Text-Prompt
  → Transkription (Whisper)
  → Szenen-Erkennung (Claude Haiku)
  → Screenshot-Extraktion (FFmpeg, 25%/50%/75% pro Szene)
  → Visuelle Analyse (Claude Vision)
  → Bildgenerierung (Gemini / Imagen Fallback)
  → Videogenerierung (FAL: Kling v3 Standard / Veo 3.1 Lite)
  → Export (Remotion → MP4)
```

Für lange Operationen: **SSE (Server-Sent Events)** für Echtzeit-Fortschritt nutzen — nicht polling.

## Vertex AI Imagen API — Wichtige Eigenheiten

### Endpunkt
```
https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:predict
```

### Referenzbilder — korrekte Struktur
```json
{
  "referenceType": "REFERENCE_TYPE_RAW|REFERENCE_TYPE_STYLE|REFERENCE_TYPE_SUBJECT",
  "referenceId": 1,
  "referenceImage": { "bytesBase64Encoded": "..." },
  "styleImageConfig": { "styleDescription": "..." },
  "subjectImageConfig": { "subjectType": "SUBJECT_TYPE_PERSON", "subjectDescription": "..." }
}
```

**Kritische Regeln:**
- `mimeType` darf NICHT in `referenceImage` stehen — nur `bytesBase64Encoded`
- Im Prompt immer Bracket-Notation verwenden wenn Referenzbilder vorhanden: `[1]`, `[2]` etc.
- Max. 4 Referenzbilder pro Request
- `screenshotRefPath` muss explizit als `REFERENCE_TYPE_RAW` in `referenceImages` eingefügt werden

## Projektstruktur (Wichtiges)

```
src/
  pages/          # Next.js Pages Router
    api/          # ~50 API-Endpunkte
      projects/[id]/scenes/[sceneId]/  # Szenen-Operationen
  lib/            # Business-Logik (claude.ts, imagen.js, scenes.js, ...)
  remotion/       # Video-Komposition (VideoComposition.tsx, IllustrationSlide.tsx)
  components/     # React-Komponenten
tmp/projects/     # Projektdaten (gitignored)
uploads/          # Hochgeladene Videos (gitignored)
```

## Entwicklung

```bash
npm run dev              # Next.js Dev-Server :3000
npm run remotion:studio  # Remotion Visual Editor :3001
npm run remotion:render  # CLI Render
```

## Konventionen

- UI-Sprache: **Deutsch**
- Styling: Inline-Styles + Tailwind, kein separates CSS
- Keine Authentifizierung — reine Dev/Demo-Umgebung
- User-Sessions via Cookie (kein echtes Auth)
- Fehler-Handling: SSE-Stream mit `type: 'error'` Events
