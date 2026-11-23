import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildProjectZipBuffer } from './scripts/export-project.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface AiChatRequestBody {
  message?: string;
  language?: 'en' | 'ar';
  history?: ChatHistoryItem[];
  calculationContext?: {
    mode?: string;
    taxType?: string;
    taxName?: string;
    rate?: number;
    amountHT?: number;
    taxAmount?: number;
    amountTTC?: number;
    transactionDate?: string;
    effectiveDate?: string;
  } | null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'TaxCollect' });
  });

  app.get('/api/export-project', async (_req, res) => {
    try {
      const buffer = await buildProjectZipBuffer();
      const dateStr = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="TaxCollect_Project_${dateStr}.zip"`);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bundle project';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const body = (req.body || {}) as AiChatRequestBody;
      const userMessage = typeof body.message === 'string' ? body.message.trim() : '';

      if (!userMessage) {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            body.language === 'ar'
              ? 'خدمة المساعد الذكي غير مفعّلة حالياً لأن مفتاح Gemini API غير مضبوط في إعدادات البيئة.'
              : 'AI Assistant is unavailable because GEMINI_API_KEY is not configured in environment secrets.',
        });
        return;
      }

      const lang = body.language === 'ar' ? 'ar' : 'en';
      const systemInstruction = `You are the AI Tax Assistant for "TaxCollect", a smart accounting and tax management application designed primarily for the Algerian tax system.

Your role:
- Help individuals, university accounting/finance students, accountants, and businesses understand Algerian taxation, accounting principles, and tax calculation results.
- Explain concepts clearly in simple, structured language (using short headings, bullet points, and clear numerical examples in Algerian Dinars - DZD).
- Cover key Algerian tax terminology accurately: TVA (Taxe sur la Valeur Ajoutée / الرسم على القيمة المضافة), IBS (Impôt sur les Bénéfices des Sociétés / الضريبة على أرباح الشركات), IRG (Impôt sur le Revenu Global / الضريبة على الدخل الإجمالي), IFU (Impôt Forfaitaire Unique / الضريبة الجزافية الوحيدة), HT (Hors Taxes / خارج الرسم), TTC (Toutes Taxes Comprises / متضمن كل الرسوم), G50 (monthly tax declaration / التصريح الشهري G50), NIF (Numéro d'Identification Fiscale / رقم التعريف الجبائي), and historical context of TAP reforms under recent Algerian Finance Laws.
- Language rule: Respond primarily in ${lang === 'ar' ? 'Arabic (العربية الفصحى المحاسبية الواضحة)' : 'English'}, unless the user explicitly writes in the other language or asks for bilingual terminology. Include key Algerian French/Arabic statutory acronyms (e.g., TVA, IBS, IRG, IFU, HT, TTC) when helpful for students and accountants.
- Accuracy & Legal Verification rule: NEVER invent unverified tax rates, thresholds, or statutory articles. Always note when a tax rate or rule depends on the applicable Finance Law (Loi de Finances / قانون المالية) or activity sector and clearly recommend verifying with the Algerian Directorate General of Taxes (DGI / المديرية العامة للضرائب) or a certified accountant (Expert-Comptable / Commissaire aux Comptes) prior to official tax filing.
- Keep responses concise, practical, and educational (ideally 150–350 words unless a detailed breakdown is requested).`;

      let enrichedPrompt = userMessage;
      if (body.calculationContext) {
        const ctx = body.calculationContext;
        enrichedPrompt = `[Attached TaxCollect Calculation Context]
- Mode: ${ctx.mode ?? 'N/A'}
- Tax Category: ${ctx.taxName ?? ctx.taxType ?? 'N/A'} (${ctx.taxType ?? ''})
- Applied Rate: ${ctx.rate ?? 0}%
- Amount Excluding Tax (HT): ${ctx.amountHT ?? 0} DZD
- Calculated Tax Amount: ${ctx.taxAmount ?? 0} DZD
- Total Amount Including Tax (TTC): ${ctx.amountTTC ?? 0} DZD
- Transaction Date: ${ctx.transactionDate ?? 'N/A'}
- Rule Effective Date: ${ctx.effectiveDate ?? 'N/A'}

User Question: ${userMessage}`;
      }

      const historyContents = Array.isArray(body.history)
        ? body.history.slice(-10).map((item) => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.text }],
          }))
        : [];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          ...historyContents,
          { role: 'user', parts: [{ text: enrichedPrompt }] },
        ],
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const replyText = response.text;
      if (!replyText) {
        res.status(502).json({
          error:
            lang === 'ar'
              ? 'لم يتم استلام رد من المساعد الذكي. يرجى المحاولة مرة أخرى.'
              : 'No response was returned by the AI service. Please try again.',
        });
        return;
      }

      res.json({ reply: replyText });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      console.error('[TaxCollect AI Error]', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaxCollect server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TaxCollect server:', err);
  process.exit(1);
});
