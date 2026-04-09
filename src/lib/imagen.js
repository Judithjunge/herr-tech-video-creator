require('./load-env');
const fs = require('fs');
const path = require('path');

// Standard model for text-to-image (best quality)
const IMAGEN_MODEL = 'imagen-4.0-ultra-generate-001';
// Capability model required for controlled generation (RAW / STYLE / BGSWAP reference images)
const IMAGEN_CAPABILITY_MODEL = 'imagen-3.0-capability-001';
// Gemini image editing models — support multiple reference images natively
// Primary: Pro model (best quality), Fallback: Flash model
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_IMAGE_MODEL_FALLBACK = 'gemini-2.5-flash-image';

/** Detect actual image media type from file magic bytes */
function detectMediaType(filePath) {
  try {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
    if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57) return 'image/webp';
    return 'image/jpeg';
  } catch { return 'image/jpeg'; }
}

/** Get Google Cloud access token via Application Default Credentials */
async function getAccessToken() {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return auth.getAccessToken();
}

/** Cache whether ADC is available on this machine (null = not yet checked) */
let _adcAvailable = null;
async function isADCAvailable() {
  if (_adcAvailable !== null) return _adcAvailable;
  try {
    await getAccessToken();
    _adcAvailable = true;
  } catch {
    _adcAvailable = false;
    console.warn('[imagen] Google ADC not available — Vertex AI disabled, using Gemini/AI Studio');
  }
  return _adcAvailable;
}

/**
 * Generates an image via Vertex AI Imagen REST API.
 *
 * Edit modes:
 *  - null / 'instruct':  REFERENCE_TYPE_RAW scene anchor + text description of changes
 *                        Best for: character swaps, style changes, lighting adjustments
 *  - 'bgswap':           EDIT_MODE_BGSWAP + MASK_MODE_BACKGROUND (auto-detected background)
 *                        Best for: background/environment replacement
 *                        Officially supported by Google, reliably preserves foreground characters
 *
 * Character replacement uses text description only (SUBJECT+RAW causes empty predictions).
 * Style overlay uses REFERENCE_TYPE_STYLE.
 *
 * @param {string} prompt
 * @param {{
 *   format: '9:16'|'16:9',
 *   outputDir: string,
 *   filename: string,
 *   screenshotRefPath?: string,
 *   styleImagePath?: string,
 *   editMode?: 'bgswap' | null,
 * }} options
 */
async function generateImage(prompt, { format = '9:16', outputDir, filename, screenshotRefPath, styleImagePath, editMode = null, subjectImagePaths = [], adjustmentImageBase64 = null, adjustmentImageMime = 'image/jpeg' }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

  // Always use Gemini first — it supports reference images natively.
  // Vertex AI is unreliable with reference images and requires ADC credentials.
  if (apiKey) {
    return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey,
      onFail: () => generateImageAIStudio(prompt, { format, outputDir, filename }),
    });
  }

  // No API key — try Vertex AI with ADC (legacy fallback)
  if (project) {
    return generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode, project, location, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime });
  }

  throw new Error('GOOGLE_API_KEY fehlt in .env.local');
}

/**
 * Gemini image editing — passes multiple reference images natively.
 * This is the correct approach for character swaps: source scene + character reference.
 * Gemini understands "keep the background, replace [X] with the character from image 2".
 */
async function generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries = 0, _model = GEMINI_IMAGE_MODEL }) {
  console.log(`[imagen] Gemini image editing — model: ${_model}`);

  const parts = [];

  // Add source scene (screenshot) as first image
  if (screenshotRefPath && fs.existsSync(screenshotRefPath)) {
    const b64 = fs.readFileSync(screenshotRefPath).toString('base64');
    const mimeType = detectMediaType(screenshotRefPath);
    parts.push({ inlineData: { mimeType, data: b64 } });
    console.log(`[imagen] Gemini + scene: ${path.basename(screenshotRefPath)}`);
  }

  // Add character reference images
  for (const subjectPath of subjectImagePaths) {
    if (subjectPath && fs.existsSync(subjectPath)) {
      const b64 = fs.readFileSync(subjectPath).toString('base64');
      const mimeType = detectMediaType(subjectPath);
      parts.push({ inlineData: { mimeType, data: b64 } });
      console.log(`[imagen] Gemini + character: ${path.basename(subjectPath)}`);
    }
  }

  // Add adjustment image if present
  if (adjustmentImageBase64) {
    parts.push({ inlineData: { mimeType: adjustmentImageMime || 'image/jpeg', data: adjustmentImageBase64 } });
    console.log(`[imagen] Gemini + adjustment image`);
  }

  // Add the text prompt last
  parts.push({ text: prompt });

  const aspectRatio = format === '9:16' ? '9:16' : '16:9';

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      // Gemini doesn't have aspectRatio in the same way — we describe it in the prompt
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${_model}:generateContent?key=${apiKey}`;
  console.log(`[imagen] Gemini POST → ${parts.length - 1} images + prompt: "${prompt.slice(0, 80)}..."`);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[imagen] Gemini network error: ${err.message}`);
    if (_model !== GEMINI_IMAGE_MODEL_FALLBACK) {
      console.warn(`[imagen] Retrying with fallback model: ${GEMINI_IMAGE_MODEL_FALLBACK}`);
      return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries: 0, _model: GEMINI_IMAGE_MODEL_FALLBACK });
    }
    return onFail();
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[imagen] Gemini error (${response.status}): ${errText.slice(0, 400)}`);
    if ((response.status === 500 || response.status === 503) && _retries < 2) {
      const wait = (_retries + 1) * 8000;
      console.warn(`[imagen] Gemini retry ${_retries + 1}/2 in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries: _retries + 1, _model });
    }
    // 404/400: model not found or unsupported — try fallback model
    if ((response.status === 404 || response.status === 400) && _model !== GEMINI_IMAGE_MODEL_FALLBACK) {
      console.warn(`[imagen] ${_model} not available — switching to fallback: ${GEMINI_IMAGE_MODEL_FALLBACK}`);
      return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries: 0, _model: GEMINI_IMAGE_MODEL_FALLBACK });
    }
    console.warn('[imagen] Gemini failed — falling back to Vertex AI');
    return onFail();
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(p => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.warn(`[imagen] Gemini returned no image. Response: ${JSON.stringify(data).slice(0, 300)}`);
    if (_retries < 2) {
      await new Promise(r => setTimeout(r, (_retries + 1) * 6000));
      return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries: _retries + 1, _model });
    }
    if (_model !== GEMINI_IMAGE_MODEL_FALLBACK) {
      console.warn(`[imagen] No image from ${_model} — trying fallback model`);
      return generateImageGemini(prompt, { format, outputDir, filename, screenshotRefPath, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, apiKey, onFail, _retries: 0, _model: GEMINI_IMAGE_MODEL_FALLBACK });
    }
    console.warn('[imagen] Gemini no image after retries — falling back');
    return onFail();
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
  fs.writeFileSync(filePath, Buffer.from(imagePart.inlineData.data, 'base64'));
  console.log(`[imagen] Gemini saved: ${filename} (${format}) ✓ model: ${GEMINI_IMAGE_MODEL}`);
  return { filePath, mimeType };
}

/** Vertex AI: direct REST API call */
async function generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode, project, location, subjectImagePaths = [], adjustmentImageBase64 = null, adjustmentImageMime = 'image/jpeg', _retries = 0, _noImageRetries = 0 }) {
  console.log(`[imagen] Vertex AI REST API — project: ${project}, editMode: ${editMode ?? 'instruct'}`);

  const token = await getAccessToken();
  const aspectRatio = format === '9:16' ? '9:16' : '16:9';

  // ── BGSWAP mode: replace background, auto-preserve foreground ──────────────
  if (editMode === 'bgswap' && screenshotRefPath && fs.existsSync(screenshotRefPath)) {
    return generateImageBgSwap(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, project, location, token, aspectRatio, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, _retries, _noImageRetries });
  }

  // ── INSTRUCT mode: RAW scene anchor only ──
  const referenceImages = [];
  let refId = 1;
  let promptSuffix = '';

  // [1] Screenshot → REFERENCE_TYPE_RAW (scene spatial anchor)
  if (screenshotRefPath && fs.existsSync(screenshotRefPath)) {
    const b64 = fs.readFileSync(screenshotRefPath).toString('base64');
    const rawId = refId;
    referenceImages.push({
      referenceType: 'REFERENCE_TYPE_RAW',
      referenceId: rawId,
      referenceImage: { bytesBase64Encoded: b64 },
    });
    if (!prompt.includes(`[${rawId}]`)) {
      promptSuffix += ` Keep background, composition, and camera angle from [${rawId}].`;
    }
    console.log(`[imagen] + RAW ref [${rawId}]: ${path.basename(screenshotRefPath)}`);
    refId++;
  }

  // Adjustment image → REFERENCE_TYPE_SUBJECT (only when no RAW, or when no char swap)
  if (adjustmentImageBase64 && !hasSubjects) {
    const adjId = refId;
    referenceImages.push({
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: adjId,
      referenceImage: { bytesBase64Encoded: adjustmentImageBase64 },
      subjectImageConfig: { subjectType: 'SUBJECT_TYPE_DEFAULT' },
    });
    console.log(`[imagen] + SUBJECT ref [${adjId}]: adjustment image (base64)`);
    refId++;
  }

  // Style image → REFERENCE_TYPE_STYLE (always last)
  if (styleImagePath && fs.existsSync(styleImagePath)) {
    const b64 = fs.readFileSync(styleImagePath).toString('base64');
    const styleId = refId;
    referenceImages.push({
      referenceType: 'REFERENCE_TYPE_STYLE',
      referenceId: styleId,
      referenceImage: { bytesBase64Encoded: b64 },
      styleImageConfig: { styleDescription: 'artistic visual style reference' },
    });
    if (!prompt.includes(`[${styleId}]`)) {
      promptSuffix += ` Match art style of [${styleId}].`;
    }
    console.log(`[imagen] + STYLE ref [${styleId}]: ${path.basename(styleImagePath)}`);
    refId++;
  }

  const finalPrompt = promptSuffix ? `${prompt}${promptSuffix}` : prompt;
  const modelToUse = referenceImages.length > 0 ? IMAGEN_CAPABILITY_MODEL : IMAGEN_MODEL;

  const body = {
    instances: [{
      prompt: finalPrompt,
      ...(referenceImages.length > 0 ? { referenceImages } : {}),
    }],
    parameters: {
      aspectRatio,
      outputMimeType: 'image/jpeg',
      sampleCount: 1,
      // baseSteps 30: low enough to stay close to [1], high enough to execute the edit
      ...(referenceImages.length > 0 ? { editConfig: { baseSteps: 30 } } : {}),
    },
  };

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelToUse}:predict`;
  console.log(`[imagen] POST → model: ${modelToUse}, refs: ${referenceImages.length}, prompt: "${finalPrompt.slice(0, 80)}..."`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if ((response.status === 500 || response.status === 503) && _retries < 3) {
      const wait = (_retries + 1) * 10000;
      console.warn(`[imagen] ${response.status} — retry ${_retries + 1}/3 in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      return generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode, project, location, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, _retries: _retries + 1, _noImageRetries });
    }
    if (referenceImages.length > 0 && (response.status === 400 || response.status === 422)) {
      console.error(`[imagen] Reference rejected (${response.status}): ${errText.slice(0, 300)}`);
      console.warn(`[imagen] Retrying text-only...`);
      return generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath: null, styleImagePath: null, editMode: null, project, location, subjectImagePaths: [], adjustmentImageBase64: null });
    }
    throw new Error(`Vertex AI Imagen error ${response.status}: ${errText.slice(0, 500)}`);
  }

  return saveImageFromResponse(await response.json(), { outputDir, filename, format, referenceImages, modelToUse,
    onRetry: (noImageRetries) => generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode, project, location, subjectImagePaths, adjustmentImageBase64, adjustmentImageMime, _retries, _noImageRetries: noImageRetries }),
    onFallback: () => generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath: null, styleImagePath: null, editMode: null, project, location, subjectImagePaths: [], adjustmentImageBase64: null }),
    _noImageRetries,
  });
}

/**
 * BGSWAP mode: replaces background using EDIT_MODE_BGSWAP + MASK_MODE_BACKGROUND.
 * Imagen auto-detects and masks the foreground — no manual mask needed.
 * maskDilation: 0.0 prevents the mask from bleeding into foreground characters.
 */
async function generateImageBgSwap(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, project, location, token, aspectRatio, _retries, _noImageRetries }) {
  const b64Raw = fs.readFileSync(screenshotRefPath).toString('base64');
  const referenceImages = [
    {
      referenceType: 'REFERENCE_TYPE_RAW',
      referenceId: 1,
      referenceImage: { bytesBase64Encoded: b64Raw },
    },
    {
      // MASK_MODE_BACKGROUND: auto-detects background pixels (no mask image needed)
      referenceType: 'REFERENCE_TYPE_MASK',
      referenceId: 2,
      maskImageConfig: {
        maskMode: 'MASK_MODE_BACKGROUND',
        maskDilation: 0.0,  // 0 = no bleed into foreground characters
      },
    },
  ];

  // Optional style reference
  if (styleImagePath && fs.existsSync(styleImagePath)) {
    const b64Style = fs.readFileSync(styleImagePath).toString('base64');
    referenceImages.push({
      referenceType: 'REFERENCE_TYPE_STYLE',
      referenceId: 3,
      referenceImage: { bytesBase64Encoded: b64Style },
      styleImageConfig: { styleDescription: 'artistic visual style reference' },
    });
  }

  const body = {
    instances: [{
      prompt,
      referenceImages,
    }],
    parameters: {
      editMode: 'EDIT_MODE_BGSWAP',
      aspectRatio,
      outputMimeType: 'image/jpeg',
      sampleCount: 1,
      editConfig: { baseSteps: 60 },  // lower = less character drift (Google recommended)
    },
  };

  const modelToUse = IMAGEN_CAPABILITY_MODEL;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelToUse}:predict`;
  console.log(`[imagen] BGSWAP POST → "${prompt.slice(0, 80)}..."`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[imagen] BGSWAP error (${response.status}): ${errText.slice(0, 300)}`);
    // Fall back to regular instruct mode
    console.warn('[imagen] BGSWAP failed — falling back to instruct mode');
    return generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode: null, project, location });
  }

  return saveImageFromResponse(await response.json(), {
    outputDir, filename, format, referenceImages, modelToUse,
    onRetry: (n) => generateImageBgSwap(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, project, location, token, aspectRatio, _retries, _noImageRetries: n }),
    onFallback: () => generateImageVertexAI(prompt, { format, outputDir, filename, screenshotRefPath, styleImagePath, editMode: null, project, location }),
    _noImageRetries,
  });
}

/** Extract, save, and return the generated image — handles retries and fallback */
async function saveImageFromResponse(data, { outputDir, filename, format, referenceImages, modelToUse, onRetry, onFallback, _noImageRetries }) {
  // Pick the first prediction that actually has image bytes (sampleCount may be 2)
  const predictions = data.predictions ?? [];
  const prediction = predictions.find(p => p?.bytesBase64Encoded) ?? predictions[0];
  const b64Image = prediction?.bytesBase64Encoded;

  if (!b64Image) {
    const filterReason = prediction?.raiFilteredReason ?? prediction?.filterReason ?? null;
    if (filterReason) console.warn(`[imagen] Safety filter: ${filterReason}`);
    console.warn(`[imagen] No image (attempt ${_noImageRetries + 1}). Predictions: ${JSON.stringify(predictions).slice(0, 200)}`);

    if (_noImageRetries < 2) {
      const wait = (_noImageRetries + 1) * 6000;
      console.warn(`[imagen] Retrying in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      return onRetry(_noImageRetries + 1);
    }
    if (referenceImages.length > 0) {
      console.warn('[imagen] Dropping all refs — retrying text-only');
      return onFallback();
    }
    throw new Error(`Imagen returned no image after retries.${filterReason ? ` Safety: ${filterReason}` : ''}`);
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, Buffer.from(b64Image, 'base64'));
  console.log(`[imagen] Saved: ${filename} (${format}) ✓ model: ${modelToUse}`);
  return { filePath, mimeType: 'image/jpeg' };
}

/** AI Studio fallback (no reference image support) */
async function generateImageAIStudio(prompt, { format, outputDir, filename }) {
  const { GoogleGenAI } = require('@google/genai');
  console.log('[imagen] AI Studio (text-only, no reference images)');
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const aspectRatio = format === '9:16' ? '9:16' : '16:9';

  const response = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: { numberOfImages: 1, aspectRatio, outputMimeType: 'image/jpeg' },
  });

  const image = response.generatedImages?.[0];
  if (!image?.image?.imageBytes) throw new Error('Imagen returned no image.');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, Buffer.from(image.image.imageBytes, 'base64'));
  console.log(`[imagen] Saved: ${filename} (${format}) — AI Studio text-only`);
  return { filePath, mimeType: 'image/jpeg' };
}

module.exports = { generateImage, IMAGEN_MODEL };
