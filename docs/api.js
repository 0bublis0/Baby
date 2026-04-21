// Claude API integration
const API = (() => {
  const URL = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-sonnet-4-6';

  function buildPrompt(melody, style) {
    const melodyStr = melody
      .map(n => `  {pitch:${n.pitch}, start:${n.start.toFixed(2)}, duration:${n.duration.toFixed(2)}}`)
      .join(',\n');

    return `You are an expert MIDI music composer AI spanning all of music history.

The user has hummed a melody. Detected notes (MIDI pitch, timings in seconds):
[
${melodyStr}
]

Style request: "${style}"

Create a complete MIDI song arrangement faithful to the requested style and era. Rules:
1. Convert melody times from seconds to beats using a tempo appropriate for the style.
2. Include the melody in one track, transposed to a fitting key if needed.
3. Add 2-4 accompaniment tracks appropriate to the era: harmony, bass, rhythm/percussion.
4. Extend/repeat for 8-16 bars total so the piece feels complete.
5. Choose instruments, tempo, time signature, and harmonic language that authentically match the era.
6. All note times are in quarter-note beats. Tempo is BPM.

Available instruments by era:
  Ancient/Medieval: lute, harp, flute, horn, drum, organ, strings, choir
  Baroque/Classical: harpsichord, piano, oboe, violin, cello, bassoon, trumpet, timpani
  Romantic/Orchestral: piano, violin, cello, strings, brass, clarinet, oboe, harp, choir
  Jazz/Blues: piano, bass, drums, trumpet, saxophone, guitar
  Rock/Pop: guitar, electric guitar, bass, drums, piano, synth
  Electronic/Modern: synth, bass, drums, pad, lead, arp

Respond with ONLY valid JSON, no explanation:
{
  "title": "creative song title",
  "tempo": 90,
  "timeSignature": [4, 4],
  "key": "D minor",
  "totalBeats": 32,
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

  async function compose(apiKey, melody, style) {
    if (!apiKey) throw new Error('No API key set. Tap the gear icon to add your Anthropic API key.');
    if (!melody || melody.length === 0) throw new Error('No melody recorded. Please record a melody first.');

    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(melody, style) }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Unexpected response from AI. Please try again.');

    const arr = JSON.parse(match[0]);
    if (!arr.tracks || arr.tracks.length === 0) throw new Error('AI returned an empty arrangement. Try a different style.');
    return arr;
  }

  return { compose };
})();
