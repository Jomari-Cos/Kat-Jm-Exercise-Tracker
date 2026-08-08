import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Supabase credentials for the client. The server has the real env vars
  // injected at runtime (from .env / .env.local in dev, or the AI Studio
  // environment/Secrets panel in production), so we hand them to the browser
  // here rather than relying on Vite build-time vars that never reach the
  // AI Studio cloud build.
  app.get('/api/supabase-config', (req, res) => {
    res.json({
      url: process.env.VITE_SUPABASE_URL || '',
      key: process.env.VITE_SUPABASE_ANON_KEY || ''
    });
  });

  // Gemini AI Fitness Cheer & Analysis Endpoint
  app.post('/api/ai-motivation', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          success: false,
          message: 'GEMINI_API_KEY not configured.',
          feedback: 'Great job completing your workout today! Stay consistent and keep pushing!'
        });
      }

      const { user, exerciseType, durationMins, notes, steps, distanceMeters, imageBase64 } = req.body;

      const ai = new GoogleGenAI({ apiKey });
      
      const contents: any[] = [];

      let promptText = `Provide a fun, highly energetic, and personalized workout congratulatory message for ${user || 'the user'}.
      Workout details:
      - Type: ${exerciseType || 'Exercise'}
      - Duration: ${durationMins || 30} minutes${steps ? `\n      - Steps: ${steps} steps` : ''}${distanceMeters ? `\n      - Distance: ${distanceMeters} meters` : ''}
      - User notes: ${notes || 'No extra notes'}
      
      Keep it under 3 concise sentences. Include 1 fun fitness tip or positive streak encouragement. Be super supportive!`;

      if (imageBase64 && imageBase64.includes('base64,')) {
        const base64Data = imageBase64.split('base64,')[1];
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

        promptText += ` Also, look at the uploaded workout proof image and give a quick, fun 1-sentence comment on the proof photo (e.g., complimenting their sweaty gym selfie, watch tracker screen, shoes, or workout spot).`;

        contents.push(
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        );
      }

      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });

      const feedback = response.text || 'Awesome work on getting your movement in today!';
      return res.json({ success: true, feedback });
    } catch (error: any) {
      console.error('Error generating AI motivation:', error);
      return res.json({
        success: false,
        error: error?.message || 'Failed to generate AI feedback',
        feedback: 'Fantastic effort today! Every minute counts towards your goal!'
      });
    }
  });

  // Vite middleware or Static files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
