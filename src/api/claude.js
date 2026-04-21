const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function buildPrompt(melody, styleDescription) {
  const melodyStr = melody
    .map(n => `  {pitch:${n.pitch}, start:${n.start.toFixed(2)}, duration:${n.duration.toFixed(2)}}`)
    .join(',\n');

  return `You are an expert MIDI music composer AI spanning all of music history.

The user has hummed a melody. These are the detected notes (MIDI pitch numbers, timings in seconds):
[
${melodyStr}
]

Style request: "${styleDescription}"

Create a complete MIDI song arrangement faithful to the requested style and era. Rules:
1. Convert the melody times from seconds to beats using a tempo appropriate for the style.
2. Include the melody in one track, transposed to a fitting key if needed.
3. Add 2-4 accompaniment tracks appropriate to the era and style (harmony, bass, rhythm/percussion).
4. Extend/repeat for 8-16 bars total so the piece feels complete.
5. Choose instruments, tempo, time signature, and harmonic language that authentically match the requested era.
6. All note times are in quarter-note beats. Tempo is BPM.

Available instruments (choose the most authentic ones for the style):
  Ancient/Medieval: lute, harp, flute, horn, drum, organ, strings, choir
  Baroque/Classical: harpsichord, piano, oboe, violin, cello, bassoon, trumpet, timpani
  Romantic/Orchestral: piano, violin, cello, strings, brass, clarinet, oboe, harp, choir
  Jazz/Blues: piano, bass, drums, trumpet, saxophone, guitar
  Rock/Pop: guitar, bass, drums, piano, synth
  Electronic/Modern: synth, bass, drums, pad, lead, arp

Respond with ONLY a valid JSON object, no explanation:
{
  "title": "creative song title",
  "tempo": 90,
  "timeSignature": [3, 4],
  "key": "D minor",
  "totalBeats": 24,
  "tracks": [
    {
      "name": "Melody — Piano",
      "instrument": "piano",
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
