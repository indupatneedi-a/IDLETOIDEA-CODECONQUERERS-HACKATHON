import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));

// Initialize Gemini on server
let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize server-side GoogleGenAI:', err);
  }
}

// 1. Server-side proxy for 'Find My Match' (advisory only)
app.post('/api/ai/match', async (req, res) => {
  try {
    const { projectDescription, eligibleResources } = req.body ?? {};
    if (
      typeof projectDescription !== 'string' ||
      projectDescription.trim().length < 3 ||
      projectDescription.length > 1500 ||
      !Array.isArray(eligibleResources) ||
      eligibleResources.length === 0
    ) {
      return res.status(400).json({ error: 'Invalid projectDescription or candidate resources' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'Gemini API not configured on server', fallback: true });
    }

    const sanitizedPool = eligibleResources.slice(0, 50).map((r: Record<string, unknown>) => ({
      id: typeof r.id === 'string' ? r.id.slice(0, 128) : '',
      title: typeof r.title === 'string' ? r.title.slice(0, 160) : '',
      category: typeof r.category === 'string' ? r.category.slice(0, 80) : '',
      price: typeof r.price === 'number' ? r.price : 0,
      riskLevel: typeof r.riskLevel === 'string' ? r.riskLevel.slice(0, 20) : '',
      description: typeof r.description === 'string' ? r.description.slice(0, 400) : '',
      location: typeof r.location === 'string' ? r.location.slice(0, 160) : '',
    }));

    const prompt = `You are an advisory resource-matching assistant for IDLETOIDEA, a makerspace equipment and workspace sharing platform.
A maker needs equipment or workspace access for the following project:
"${projectDescription.trim()}"

Here is the list of currently active listings:
${JSON.stringify(sanitizedPool, null, 2)}

Match up to 3 best listings that directly suit this project.
Return a STRICT JSON array of objects with exactly this schema:
[
  { "resourceId": "id-from-list", "reason": "1-2 sentence plain reason why it suits the project" }
]
Use ONLY the supplied IDs. Do not invent or recommend unlisted items.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    return res.json({ results: Array.isArray(parsed) ? parsed : [], fallback: false });
  } catch (err) {
    console.error('Error in /api/ai/match:', err);
    return res.status(500).json({ error: 'Failed to generate recommendations', fallback: true });
  }
});

// 2. Server-side proxy for 'Summarise This Incident' (advisory only)
app.post('/api/ai/summarize-incident', async (req, res) => {
  try {
    const { incidentPayload } = req.body ?? {};
    if (!incidentPayload || typeof incidentPayload !== 'object' || Array.isArray(incidentPayload)) {
      return res.status(400).json({ error: 'Invalid incidentPayload' });
    }

    const serialized = JSON.stringify(incidentPayload);
    if (serialized.length > 12000) {
      return res.status(400).json({ error: 'incidentPayload exceeds allowed size' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'Gemini API not configured on server', fallback: true });
    }

    const prompt = `You are a neutral compliance summariser for IDLETOIDEA, a makerspace shared equipment management platform.
Your task is to summarize this equipment condition report without assigning blame or finding liability.

Data:
${serialized}

Produce a STRICT JSON object with this exact structure:
{
  "reportedAllegations": ["String list of claims made in the report"],
  "verifiedFacts": ["String list of facts verified strictly by system logs, timestamps, or handover checklist"],
  "missingInformation": ["String list of questions or gaps that still need human clarification"],
  "timeline": ["Chronological order of logged events"]
}
Do NOT determine fault or liability. Keep tone purely objective and factual.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({ summary: parsed, fallback: false });
  } catch (err) {
    console.error('Error in /api/ai/summarize-incident:', err);
    return res.status(500).json({ error: 'Failed to summarize incident', fallback: true });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'IDLETOIDEA', timestamp: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[IDLETOIDEA] Server running at http://localhost:${port}`);
  });
}

startServer();
