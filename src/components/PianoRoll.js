import React, { useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Animated } from 'react-native';
import { trackColors, colors } from '../theme';

const NOTE_HEIGHT = 14;
const BEAT_WIDTH = 40;
const TRACK_GAP = 4;

function midiToNoteName(midi) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

export default function PianoRoll({ arrangement, currentBeat = 0, isPlaying = false }) {
  const scrollRef = useRef(null);
  const playheadAnim = useRef(new Animated.Value(0)).current;

  if (!arrangement) return null;

  const { tracks = [], totalBeats = 32, tempo = 120 } = arrangement;
  const totalWidth = totalBeats * BEAT_WIDTH;

  useEffect(() => {
    if (isPlaying) {
      const totalMs = (totalBeats / tempo) * 60 * 1000;
      Animated.timing(playheadAnim, {
        toValue: totalBeats * BEAT_WIDTH,
        duration: totalMs,
        useNativeDriver: true,
      }).start();
    } else {
      playheadAnim.stopAnimation();
      playheadAnim.setValue(currentBeat * BEAT_WIDTH);
    }
  }, [isPlaying, totalBeats, tempo]);

  // Compute pitch range across all tracks
  let minPitch = 127, maxPitch = 0;
  tracks.forEach(track => {
    track.notes?.forEach(note => {
      if (note.pitch < minPitch) minPitch = note.pitch;
      if (note.pitch > maxPitch) maxPitch = note.pitch;
    });
  });
  minPitch = Math.max(0, minPitch - 4);
  maxPitch = Math.min(127, maxPitch + 4);
  const pitchRange = maxPitch - minPitch || 24;
  const rollHeight = pitchRange * NOTE_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Track labels */}
      <View style={styles.trackLabels}>
        {tracks.map((track, i) => (
          <View key={i} style={[styles.trackLabel, { borderLeftColor: trackColors[i % trackColors.length] }]}>
            <Text style={[styles.trackName, { color: trackColors[i % trackColors.length] }]} numberOfLines={1}>
              {track.name || track.instrument || 'Track ' + (i + 1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Piano roll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={scrollRef} style={styles.scroll}>
        <View style={{ width: totalWidth, position: 'relative' }}>
          {/* Beat lines */}
          {Array.from({ length: Math.ceil(totalBeats) + 1 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.beatLine,
                { left: i * BEAT_WIDTH, height: rollHeight + tracks.length * (NOTE_HEIGHT + TRACK_GAP) },
                i % (arrangement.timeSignature?.[0] || 4) === 0 && styles.barLine,
              ]}
            />
          ))}

          {/* Tracks */}
          {tracks.map((track, ti) => {
            const trackColor = trackColors[ti % trackColors.length];
            return (
              <View key={ti} style={styles.trackRow}>
                {(track.notes || []).map((note, ni) => {
                  const left = note.start * BEAT_WIDTH;
                  const width = Math.max(4, note.duration * BEAT_WIDTH - 2);
                  const pitchPos = (maxPitch - note.pitch) / pitchRange;
                  const top = Math.floor(pitchPos * rollHeight);
                  return (
                    <View
                      key={ni}
                      style={[
                        styles.noteBlock,
                        {
                          left,
                          top,
                          width,
                          height: NOTE_HEIGHT - 2,
                          backgroundColor: trackColor,
                          opacity: (note.velocity || 80) / 127,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            );
          })}

          {/* Playhead */}
          <Animated.View
            style={[
              styles.playhead,
              {
                height: rollHeight + tracks.length * (NOTE_HEIGHT + TRACK_GAP),
                transform: [{ translateX: playheadAnim }],
              },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0d0800',
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackLabels: {
    width: 90,
    backgroundColor: '#150d00',
    borderRightWidth: 1,
    borderRightColor: colors.goldDim,
  },
  trackLabel: {
    height: NOTE_HEIGHT + TRACK_GAP + 10,
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1000',
  },
  trackName: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  beatLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#2a1a00',
    top: 0,
  },
  barLine: {
    backgroundColor: '#3a2800',
    width: 1,
  },
  trackRow: {
    height: NOTE_HEIGHT + TRACK_GAP + 10,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1000',
  },
  noteBlock: {
    position: 'absolute',
    borderRadius: 2,
    shadowColor: '#c9a84c',
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: '#ffdd44',
    opacity: 0.9,
    shadowColor: '#ffdd44',
    shadowOpacity: 1,
    shadowRadius: 6,
  },
});
