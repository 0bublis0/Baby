import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import AudioEngine from '../components/AudioEngine';
import PianoRoll from '../components/PianoRoll';
import MedievalButton from '../components/MedievalButton';
import { colors, trackColors } from '../theme';

export default function PlayScreen({ navigation, route }) {
  const { arrangement } = route.params;
  const engineRef = useRef(null);

  const [toneReady, setToneReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDone, setPlaybackDone] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [status, setStatus] = useState('Loading audio engine...');

  useEffect(() => {
    // Load Tone.js when screen mounts
    const timer = setTimeout(() => {
      engineRef.current?.loadTone();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleEngineMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'TONE_READY':
        setToneReady(true);
        setStatus('Ready to play');
        break;
      case 'PLAYBACK_STARTED':
        setIsPlaying(true);
        setPlaybackDone(false);
        setStatus('Playing...');
        break;
      case 'PLAYBACK_DONE':
        setIsPlaying(false);
        setPlaybackDone(true);
        setStatus('Finished');
        setCurrentBeat(0);
        break;
      case 'ERROR':
        setIsPlaying(false);
        setStatus('Error: ' + msg.message);
        Alert.alert('Audio Error', msg.message);
        break;
    }
  }, []);

  const handlePlay = () => {
    if (!toneReady) return;
    if (isPlaying) {
      engineRef.current?.stop();
      setIsPlaying(false);
      setStatus('Stopped');
      return;
    }
    setCurrentBeat(0);
    engineRef.current?.play(arrangement);
  };

  const minsecs = (beats, bpm) => {
    const secs = Math.round((beats / bpm) * 60);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  const totalDuration = minsecs(arrangement.totalBeats || 32, arrangement.tempo || 120);

  return (
    <SafeAreaView style={styles.screen}>
      <AudioEngine ref={engineRef} onMessage={handleEngineMessage} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Song header */}
        <View style={styles.songHeader}>
          <Text style={styles.ornament}>&#9670; &#9670; &#9670;</Text>
          <Text style={styles.songTitle}>{arrangement.title || 'Untitled Song'}</Text>
          <Text style={styles.ornament}>&#9670; &#9670; &#9670;</Text>
          <View style={styles.metaRow}>
            <MetaBadge label="KEY" value={arrangement.key || '?'} />
            <MetaBadge label="BPM" value={String(arrangement.tempo || 120)} />
            <MetaBadge label="TIME" value={(arrangement.timeSignature || [4,4]).join('/')} />
            <MetaBadge label="LEN" value={totalDuration} />
          </View>
        </View>

        {/* Tracks list */}
        <View style={styles.trackList}>
          <Text style={styles.sectionTitle}>INSTRUMENTS</Text>
          {(arrangement.tracks || []).map((track, i) => (
            <View key={i} style={styles.trackItem}>
              <View style={[styles.trackColorBar, { backgroundColor: trackColors[i % trackColors.length] }]} />
              <Text style={styles.trackItemName}>{track.name || track.instrument || 'Track ' + (i + 1)}</Text>
              <Text style={styles.trackNoteCount}>{(track.notes || []).length} notes</Text>
            </View>
          ))}
        </View>

        {/* Piano roll */}
        <View style={styles.rollSection}>
          <Text style={styles.sectionTitle}>SEQUENCER</Text>
          <PianoRoll
            arrangement={arrangement}
            currentBeat={currentBeat}
            isPlaying={isPlaying}
          />
        </View>

        {/* Play controls */}
        <View style={styles.controls}>
          <Text style={styles.statusText}>{status}</Text>

          <TouchableOpacity
            style={[styles.playButton, !toneReady && styles.playButtonDisabled, isPlaying && styles.playButtonActive]}
            onPress={handlePlay}
            disabled={!toneReady}
            activeOpacity={0.8}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏹' : '▶'}</Text>
            <Text style={styles.playLabel}>{isPlaying ? 'STOP' : 'PLAY'}</Text>
          </TouchableOpacity>

          {!toneReady && (
            <Text style={styles.loadingHint}>Loading audio... (requires internet)</Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <MedievalButton
            title="New Song"
            onPress={() => navigation.popToTop()}
            style={styles.halfBtn}
          />
          <MedievalButton
            title="Re-describe"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.halfBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaBadge({ label, value }) {
  return (
    <View style={metaStyles.badge}>
      <Text style={metaStyles.label}>{label}</Text>
      <Text style={metaStyles.value}>{value}</Text>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  badge: { alignItems: 'center', backgroundColor: '#1a1000', borderWidth: 1, borderColor: colors.goldDim, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 6 },
  label: { color: colors.textDim, fontSize: 9, letterSpacing: 1 },
  value: { color: colors.gold, fontSize: 14, fontWeight: 'bold', marginTop: 2 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: 20, paddingTop: 12 },

  songHeader: { alignItems: 'center', marginBottom: 20 },
  ornament: { color: colors.goldDim, fontSize: 14, letterSpacing: 6, marginVertical: 4 },
  songTitle: { color: colors.gold, fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 2, marginVertical: 8, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },

  sectionTitle: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: 'bold', marginBottom: 10 },

  trackList: { marginBottom: 20 },
  trackItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1000' },
  trackColorBar: { width: 4, height: 22, borderRadius: 2, marginRight: 12 },
  trackItemName: { color: colors.text, fontSize: 14, flex: 1 },
  trackNoteCount: { color: colors.textDim, fontSize: 12 },

  rollSection: { marginBottom: 24 },

  controls: { alignItems: 'center', marginBottom: 20 },
  statusText: { color: colors.textDim, fontSize: 13, marginBottom: 16, letterSpacing: 1 },
  playButton: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  playButtonDisabled: { borderColor: colors.goldDim, opacity: 0.5 },
  playButtonActive: { borderColor: colors.danger, backgroundColor: '#2a0505' },
  playIcon: { fontSize: 36, color: colors.gold, marginBottom: 4 },
  playLabel: { color: colors.gold, fontSize: 11, letterSpacing: 3, fontWeight: 'bold' },
  loadingHint: { color: colors.textDim, fontSize: 12, marginTop: 12, textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 12 },
  halfBtn: { flex: 1 },
});
