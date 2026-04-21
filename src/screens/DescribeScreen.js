import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  ScrollView, Animated, Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { generateArrangement } from '../api/claude';
import MedievalButton from '../components/MedievalButton';
import { colors } from '../theme';

const STYLE_PRESETS = [
  'Medieval ballad with lute and flute, slow waltz in 3/4',
  'Epic fantasy battle march with horns and drums',
  'Celtic tavern jig, fast and lively',
  'Dark dungeon ambience with organ and strings',
  'Royal fanfare with brass and percussion',
  'Peaceful elven forest with harp and flute',
];

export default function DescribeScreen({ navigation, route }) {
  const { apiKey, melody } = route.params;
  const [styleText, setStyleText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  const startSpin = () => {
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    spinLoop.current.start();
  };

  const stopSpin = () => {
    spinLoop.current?.stop();
    spinAnim.setValue(0);
  };

  const handleGenerate = async () => {
    if (!styleText.trim()) {
      Alert.alert('Describe the Style', 'Tell the Bard what kind of song you want.');
      return;
    }

    setLoading(true);
    startSpin();
    setLoadingStep('Summoning the Bard...');

    try {
      setLoadingStep('Transcribing your melody...');
      await new Promise(r => setTimeout(r, 400));
      setLoadingStep('Composing arrangement...');

      const arrangement = await generateArrangement(apiKey, melody, styleText.trim());

      setLoadingStep('Preparing the instruments...');
      await new Promise(r => setTimeout(r, 300));

      stopSpin();
      setLoading(false);
      navigation.navigate('Play', { arrangement, melody });
    } catch (err) {
      stopSpin();
      setLoading(false);
      Alert.alert('The Bard Stumbled', err.message || 'Something went wrong. Try again.');
    }
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingRune, { transform: [{ rotate: spin }] }]}>
            &#9775;
          </Animated.Text>
          <Text style={styles.loadingTitle}>COMPOSING</Text>
          <Text style={styles.loadingStep}>{loadingStep}</Text>
          <View style={styles.melodySummary}>
            <Text style={styles.melodySummaryLabel}>Your melody: {melody.length} notes</Text>
            <Text style={styles.melodySummaryStyle}>&ldquo;{styleText}&rdquo;</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>DESCRIBE YOUR SONG</Text>
          <Text style={styles.subtitle}>Tell the Bard what style, instruments, and mood you want</Text>

          {/* Melody summary */}
          <View style={styles.melodyBadge}>
            <Text style={styles.melodyBadgeText}>♪ {melody.length} notes recorded</Text>
          </View>

          {/* Style input */}
          <View style={styles.inputPanel}>
            <Text style={styles.inputLabel}>STYLE DESCRIPTION</Text>
            <TextInput
              style={styles.textInput}
              value={styleText}
              onChangeText={setStyleText}
              placeholder="e.g. Medieval ballad with lute and flute, slow and melancholic, in 3/4 waltz time..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={4}
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{styleText.length}/300</Text>
          </View>

          {/* Preset styles */}
          <View style={styles.presetsPanel}>
            <Text style={styles.presetsTitle}>QUICK STYLES</Text>
            {STYLE_PRESETS.map((preset, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.preset, styleText === preset && styles.presetActive]}
                onPress={() => setStyleText(preset)}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, styleText === preset && styles.presetTextActive]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <MedievalButton
            title="Summon the Bard"
            size="large"
            onPress={handleGenerate}
            disabled={!styleText.trim()}
            style={styles.generateBtn}
          />
          <MedievalButton title="Back" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: 24, paddingTop: 16 },

  title: { color: colors.gold, fontSize: 22, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },

  melodyBadge: { alignSelf: 'center', backgroundColor: '#1a1000', borderWidth: 1, borderColor: colors.goldDim, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 20 },
  melodyBadgeText: { color: colors.gold, fontSize: 13 },

  inputPanel: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.goldDim, borderRadius: 4, padding: 16, marginBottom: 16 },
  inputLabel: { color: colors.gold, fontSize: 12, letterSpacing: 2, fontWeight: 'bold', marginBottom: 10 },
  textInput: { backgroundColor: '#0d0800', borderWidth: 1, borderColor: colors.goldDim, borderRadius: 3, padding: 12, color: colors.text, fontSize: 14, minHeight: 100, lineHeight: 22 },
  charCount: { color: colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 6 },

  presetsPanel: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.goldDim, borderRadius: 4, padding: 16, marginBottom: 20 },
  presetsTitle: { color: colors.gold, fontSize: 12, letterSpacing: 2, fontWeight: 'bold', marginBottom: 12 },
  preset: { padding: 10, borderWidth: 1, borderColor: '#2a1a00', borderRadius: 3, marginBottom: 8 },
  presetActive: { borderColor: colors.gold, backgroundColor: '#2a1a00' },
  presetText: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  presetTextActive: { color: colors.gold },

  generateBtn: { marginBottom: 8 },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingRune: { fontSize: 72, color: colors.gold, marginBottom: 24 },
  loadingTitle: { color: colors.gold, fontSize: 22, fontWeight: 'bold', letterSpacing: 6, marginBottom: 12 },
  loadingStep: { color: colors.text, fontSize: 15, marginBottom: 32, textAlign: 'center' },
  melodySummary: { alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.goldDim, borderRadius: 4, padding: 16, width: '100%' },
  melodySummaryLabel: { color: colors.textDim, fontSize: 13, marginBottom: 8 },
  melodySummaryStyle: { color: colors.text, fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
});
