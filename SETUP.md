# BardAI - Setup Guide

## What this app does
1. Hum or sing a melody into your iPhone microphone
2. Describe the style you want ("medieval ballad with lute and flute, slow waltz")
3. Claude AI composes a full multi-track MIDI arrangement around your melody
4. Watch the sequencer and listen to your song play back with RuneScape-style MIDI sounds

---

## How to run it on your iPhone (no developer account needed)

### Step 1 — Install Expo Go on your iPhone
Search "Expo Go" in the App Store and install it (free).

### Step 2 — Install dependencies (one time)
Open a terminal, navigate to this folder, and run:
```
npm install
```

### Step 3 — Start the app
```
npx expo start
```
A QR code will appear in the terminal.

### Step 4 — Open on your iPhone
Open the **Camera** app on your iPhone and point it at the QR code.
Tap the link that appears → it will open in Expo Go.

---

## Getting an Anthropic API Key

1. Go to **console.anthropic.com**
2. Create an account and add a payment method
3. Go to **API Keys** and create a new key (starts with `sk-ant-`)
4. In the app, tap the **rune symbol** (☿) in the top right corner of the home screen
5. Paste your API key and tap Save

> Cost: generating one song arrangement costs roughly $0.01–0.03 USD.

---

## Requirements
- iPhone with iOS 14.3 or later
- Internet connection (for Tone.js audio engine + Claude API)
- Anthropic API key

---

## Project Structure
```
src/
  screens/
    HomeScreen.js     — Title screen + API key settings
    RecordScreen.js   — Microphone + pitch detection
    DescribeScreen.js — Style input + Claude API call
    PlayScreen.js     — Piano roll + MIDI playback
  components/
    AudioEngine.js    — WebView audio engine wrapper
    PianoRoll.js      — Sequencer visualization
    MedievalButton.js — Styled button component
  audio/
    engineHTML.js     — Pitch detection + Tone.js synthesis
  api/
    claude.js         — Anthropic API integration
  theme.js            — Colors and shared styles
```
