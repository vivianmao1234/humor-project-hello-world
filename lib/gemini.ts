// Server-only: reads GEMINI_API_KEY, which must never reach the browser.

export const CAPTION_MODEL = 'gemini-2.5-flash';

export function buildCaptionPrompt(topic: string) {
  return [
    'You write short, funny captions for Columbia University students.',
    'Audience: a Columbia College junior who is chronically online, grew up in the Midwest,',
    'lives in the dorms, and explores New York City on weekends.',
    'Use specific campus and NYC details (Butler, Low Steps, John Jay, the 1 train, bodegas, etc.) when they fit.',
    'Keep each caption under 25 words. No hashtags, no emojis, nothing mean-spirited.',
    `Write 3 different captions about: "${topic}".`,
    'Return only a JSON array of 3 strings.',
  ].join('\n');
}

export async function generateCaptions(prompt: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CAPTION_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 1 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) throw new Error('Gemini returned an unexpected format');
  return parsed
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim())
    .slice(0, 3);
}
