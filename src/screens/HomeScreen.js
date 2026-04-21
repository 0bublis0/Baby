import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MedievalButton from '../components/MedievalButton';
import { colors } from '../theme';

const STORAGE_KEY = '@bardai_api_key';

export default function HomeScreen({ navigation }) {
  const [apiKey, setApiKey] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(key => {
      if (key) setApiKey(key);
    });
  }, []);

  const saveApiKey = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('Invalid Key', 'Anthropic API keys start with "sk-ant-"');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setSettingsVisible(false);
  };

  const openSettings = () => {
    setInputKey(apiKey);
    setSettingsVisible(true);
  };

  const handleBegin = () => {
    if (!apiKey) {
      Alert.alert(
        'API Key Required',
        'You need an Anthropic API key to summon the Bard AI. Tap the Rune in the top corner to add it.',
        [{ text: 'Set Key', onPress: openSettings }, { text: 'Cancel' }]
      );
      return;
    }
    navigation.navigate('Record', { apiKey });
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Settings rune */}
      <TouchableOpacity style={styles.runeButton} onPress={openSettings}>
        <Text style={styles.rune}>&#9775;</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.ornament}>- - - &#9670; - - -</Text>
          <Text style={styles.appTitle}>BARD AI</Text>
          <Text style={styles.tagline}>Sing Your Melody</Text>
          <Text style={styles.tagline}>Summon the Song</Text>
          <Text style={styles.ornament}>- - - &#9670; - - -</Text>
        </View>

        {/* Description panel */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>HOW IT WORKS</Text>
          <View style={styles.step}>
            <Text style={styles.stepNum}>I</Text>
            <Text style={styles.stepText}>Hum or sing your melody</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>II</Text>
            <Text style={styles.stepText}>Choose a style — any era, any genre</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>III</Text>
            <Text style={styles.stepText}>AI composes a full arrangement in your chosen style</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>IV</Text>
            <Text style={styles.stepText}>Watch the sequencer and listen</Text>
          </View>
        </View>

        {/* API key status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: apiKey ? colors.success : colors.danger }]} />
          <Text style={styles.statusText}>
            {apiKey ? 'Bard AI connected' : 'No API key set — tap rune above'}
          </Text>
        </View>

        <MedievalButton title="Begin Your Tale" size="large" onPress={handleBegin} style={styles.mainBtn} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>SETTINGS</Text>
            <Text style={styles.modalLabel}>ANTHROPIC API KEY</Text>
            <TextInput
              style={styles.input}
              value={inputKey}
              onChangeText={setInputKey}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              Get your key at console.anthropic.com
            </Text>
            <View style={styles.modalButtons}>
              <MedievalButton title="Save" onPress={saveApiKey} style={styles.halfBtn} />
              <MedievalButton title="Cancel" variant="ghost" onPress={() => setSettingsVisible(false)} style={styles.halfBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  runeButton: { position: 'absolute', top: 54, right: 20, zIndex: 10, padding: 10 },
  rune: { fontSize: 26, color: colors.goldDim },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  titleBlock: { alignItems: 'center', marginBottom: 32 },
  ornament: { color: colors.goldDim, fontSize: 16, letterSpacing: 4, marginVertical: 8 },
  appTitle: { fontSize: 52, fontWeight: 'bold', color: colors.gold, letterSpacing: 10, textTransform: 'uppercase', textShadowColor: colors.gold, textShadowRadius: 12 },
  tagline: { fontSize: 17, color: colors.text, letterSpacing: 3, marginTop: 2 },
  panel: { width: '100%', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.goldDim, borderRadius: 4, padding: 20, marginBottom: 20 },
  panelTitle: { color: colors.gold, fontSize: 13, letterSpacing: 3, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: { color: colors.gold, fontSize: 14, fontWeight: 'bold', width: 28 },
  stepText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: colors.textDim, fontSize: 13 },
  mainBtn: { width: '80%' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  modalPanel: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.border, borderRadius: 4, padding: 24 },
  modalTitle: { color: colors.gold, fontSize: 18, fontWeight: 'bold', letterSpacing: 3, textAlign: 'center', marginBottom: 20 },
  modalLabel: { color: colors.gold, fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#0d0800', borderWidth: 1, borderColor: colors.goldDim, borderRadius: 3, padding: 12, color: colors.text, fontSize: 14, marginBottom: 8 },
  hint: { color: colors.textDim, fontSize: 12, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  halfBtn: { flex: 1 },
});
