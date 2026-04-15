import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

/**
 * Generate a 768-dim embedding using gemini-embedding-001.
 * text-embedding-004 was deprecated in Feb 2026; gemini-embedding-001 is the replacement.
 * outputDimensionality: 768 keeps the existing vector(768) schema intact.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings![0].values!
}

/**
 * Generate text with a system prompt using Groq (llama-3.3-70b-versatile).
 * Groq's free tier is ~10x more generous than Gemini's for text generation.
 */
export async function generateStructured(
  systemPrompt: string,
  userContent: string,
  { jsonMode = true }: { jsonMode?: boolean } = {}
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  })
  return completion.choices[0]?.message?.content ?? ''
}
