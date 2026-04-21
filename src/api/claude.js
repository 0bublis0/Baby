const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function buildPrompt(melody, styleDescription) {
  const melodyStr = melody
    .map(n => `  {pitch:${n.pitch}, start:${n.start.toFixed(2)}, duration:${n.duration.toFixed(2)}}`)
    .join(',\n');

  return `You are a medieval MIDI music composer AI.

The user has hummed a melody. These are the detected notes (MIDI pitch numbers, timings in seconds):
[
${melodyStr}
]

Style request: "${styleDescription}"

Create a complete MIDI song arrangement. Rules:
1. Convert the melody times from seconds to beats using the tempo you choose (e.g. 90 BPM).
2. Include the melody in one track, possibly transposed to fit the key.
3. Add 2-4 accompaniment tracks: harmony, bass, and optionally rhythm/percussion.
4. Extend/repeat for 8-16 bars total, making it feel complete.
5. Honor the style description for instruments, tempo, and mood.
6. All note times are in quarter-note beats. Tempo is BPM.

Available instruments: lute, harp, flute, horn, drum, bass, organ, strings, choir

Respond with ONLY a valid JSON object, no explanation:
{
  "title": "creative song title",
  "tempo": 90,
  "timeSignature": [3, 4],
  "key": "D minor",
  "totalBeats": 24,
  "tracks": [
    {
      "name": "Melody Lute",
      "instrument": "lute",
      "volume": 100,
      "notes": [
        {"pitch": 62, "start": 0.0, "duration": 1.0, "velocity": 85}
      ]
    }
  ]
}`;
}

export async function generateArrangement(apiKey, melody, styleDescription) {
  if (!apiKey) throw new Error('No API key set. Please add your Anthropic API key in Settings.');
  if (!melody || melody.length === 0) throw new Error('No melody detected. Please record a melody first.');

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: buildPrompt(melody, styleDescription),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('The bard returned an unreadable scroll. Try again.');

  const arrangement = JSON.parse(jsonMatch[0]);

  // Validate
  if (!arrangement.tracks || arrangement.tracks.length === 0) {
    throw new Error('The bard composed an empty song. Try a different style.');
  }

  return arrangement;
}
