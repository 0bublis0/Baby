import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AUDIO_ENGINE_HTML } from '../audio/engineHTML';

const AudioEngine = forwardRef(({ onMessage }, ref) => {
  const webviewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    send: (msg) => {
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: ${JSON.stringify(JSON.stringify(msg))}});true;`
      );
    },
    startRecording: () => {
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: '{"type":"START_RECORDING"}'});true;`
      );
    },
    stopRecording: () => {
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: '{"type":"STOP_RECORDING"}'});true;`
      );
    },
    loadTone: () => {
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: '{"type":"LOAD_TONE"}'});true;`
      );
    },
    play: (arrangement) => {
      const payload = JSON.stringify({ type: 'PLAY', arrangement });
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: ${JSON.stringify(payload)}});true;`
      );
    },
    stop: () => {
      webviewRef.current?.injectJavaScript(
        `handleMessage({data: '{"type":"STOP"}'});true;`
      );
    },
  }));

  const handleWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      onMessage?.(msg);
    } catch (e) {}
  };

  return (
    <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <WebView
        ref={webviewRef}
        source={{ html: AUDIO_ENGINE_HTML, baseUrl: 'http://localhost' }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        style={{ width: 1, height: 1 }}
      />
    </View>
  );
});

export default AudioEngine;
