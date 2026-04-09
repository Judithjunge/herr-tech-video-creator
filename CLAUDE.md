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

| Aufgabe | Modell |
|---|---|
| Szenenanalyse, Prompt-Generierung | Claude (claude-sonnet-4-6) |
| Bildgenerierung (ohne Referenz) | Vertex AI Imagen 4 Ultra (`imagen-4.0-ultra-generate-001`) |
| Bildgenerierung (mit Referenzbild) | Vertex AI Imagen 3 Capability (`imagen-3.0-capability-001`) |
| Videogenerierung | FAL.ai (Kling / Veo3) |
| Transkription | OpenAI Whisper |

## Pipeline

```
Upload / URL / Text-Prompt
  → Transkription (Whisper)
  → Szenen-Erkennung (Claude Haiku)
  → Screenshot-Extraktion (FFmpeg, 25%/50%/75% pro Szene)
  → Visuelle Analyse (Claude Vision)
  → Bildgenerierung (Imagen)
  → Videogenerierung (FAL)
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
