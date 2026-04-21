import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import AudioEngine from '../components/AudioEngine';
import MedievalButton from '../components/MedievalButton';
import { colors } from '../theme';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToName(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export default function RecordScreen({ navigation, route }) {
  const { apiKey } = route.params;
  const engineRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const [phase, setPhase] = useState('idle'); // idle | recording | done
  const [currentNote, setCurrentNote] = useState(null);
  const [detectedNotes, setDetectedNotes] = useState([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Microphone Needed', 'Please grant microphone access to record your melody.');
      }
    });
  }, []);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const handleEngineMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'RECORDING_STARTED':
        setPhase('recording');
        startPulse();
        break;
      case 'PITCH':
        setCurrentNote(msg.note ? midiToName(msg.note) : null);
        break;
      case 'RECORDING_DONE':
        stopPulse();
        setCurrentNote(null);
        setDetectedNotes(msg.notes || []);
        setPhase('done');
        break;
      case 'ERROR':
        stopPulse();
        setPhase('idle');
        Alert.alert('Error', msg.message);
        break;
    }
  }, []);

  const handleRecord = () => {
    if (!permissionGranted) {
      Alert.alert('Microphone Needed', 'Please grant microphone access in your device settings.');
      return;
    }
    setDetectedNotes([]);
    setPhase('starting');
    engineRef.current?.startRecording();
  };

  const handleStop = () => {
    engineRef.current?.stopRecording();
  };

  const handleContinue = () => {
    if (detectedNotes.length === 0) {
      Alert.alert('No Melody', 'No notes were detected. Try singing closer to your device.');
      return;
    }
    navigation.navigate('Describe', { apiKey, melody: detectedNotes });
  };

  const handleRetry = () => {
    setDetectedNotes([]);
    setPhase('idle');
  };

  // Build a simple visual note list
  const uniqueNotes = detectedNotes.reduce((acc, note) => {
    if (acc.length === 0 || acc[acc.length - 1].pitch !== note.pitch) {
      acc.push(note);
    }
    return acc;
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <AudioEngine ref={engineRef} onMessage={handleEngineMessage} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>RECORD MELODY</Text>
        <Text style={styles.subtitle}>Hum or sing your melody{'\n'}as clearly as you can</Text>

        {/* Mic button */}
        <View style={styles.micArea}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: phase === 'recording' ? 0.4 : 0 }]} />
          <TouchableOpacity
            style={[styles.micButton, phase === 'recording' && styles.micActive]}
            onPressIn={phase === 'idle' ? handleRecord : undefined}
            onPress={phase === 'recording' ? handleStop : undefined}
            activeOpacity={0.8}
          >
            <Text style={styles.micIcon}>{phase === 'recording' ? '⏹' : '♪'}</Text>
            <Text style={styles.micLabel}>
              {phase === 'idle' ? 'TAP TO SING' : phase === 'starting' ? 'STARTING...' : phase === 'recording' ? 'TAP TO STOP' : 'DONE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live note display */}
        {phase === 'recording' && (
          <View style={styles.liveNote}>
            <Text style={styles.liveNoteLabel}>HEARING</Text>
            <Text style={styles.liveNoteName}>{currentNote || '—'}</Text>
          </View>
        )}

        {/* Detected notes */}
        {phase === 'done' && detectedNotes.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>MELODY CAPTURED</Text>
            <Text style={styles.noteCount}>{detectedNotes.length} notes detected</Text>
            <View style={styles.noteRow}>
              {uniqueNotes.slice(0, 20).map((note, i) => (
                <View key={i} style={styles.noteChip}>
                  <Text style={styles.noteChipText}>{midiToName(note.pitch)}</Text>
                </View>
              ))}
              {uniqueNotes.length > 20 && (
                <Text style={styles.moreNotes}>+{uniqueNotes.length - 20} more</Text>
              )}
            </View>
          </View>
        )}

        {phase === 'done' && detectedNotes.length === 0 && (
          <View style={styles.panel}>
            <Text style={styles.emptyText}>No notes detected.{'\n'}Try singing louder and closer to your device.</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {phase === 'done' && (
            <>
              <MedievalButton title="Continue to Style" onPress={handleContinue} disabled={detectedNotes.length === 0} size="large" />
              <MedievalButton title="Record Again" variant="ghost" onPress={handleRetry} />
            </>
          )}
          {(phase === 'idle' || phase === 'starting') && (
            <MedievalButton title="Back" variant="ghost" onPress={() => navigation.goBack()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 16 },
  title: { color: colors.gold, fontSize: 22, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 },
  subtitle: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  micArea: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pulseRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.danger, zIndex: 0 },
  micButton: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  micActive: { borderColor: colors.danger, backgroundColor: '#2a0505' },
  micIcon: { fontSize: 40, color: colors.gold, marginBottom: 6 },
  micLabel: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: 'bold' },

  liveNote: { alignItems: 'center', marginBottom: 24 },
  liveNoteLabel: { color: colors.textDim, fontSize: 11, letterSpacing: 2 },
  liveNoteName: { color: colors.gold, fontSize: 48, fontWeight: 'bold', marginTop: 4 },

  panel: { width: '100%', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.goldDim, borderRadius: 4, padding: 16, marginBottom: 20 },
  panelTitle: { color: colors.gold, fontSize: 12, letterSpacing: 3, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  noteCount: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  noteChip: { backgroundColor: '#2a1a00', borderWidth: 1, borderColor: colors.goldDim, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4 },
  noteChipText: { color: colors.gold, fontSize: 12, fontWeight: 'bold' },
  moreNotes: { color: colors.textDim, fontSize: 12, alignSelf: 'center' },
  emptyText: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  actions: { width: '100%', alignItems: 'center', marginTop: 8 },
});
