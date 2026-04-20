import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radius } from '../components/theme';
import { analyzeImage } from '../services/api';
import { addHistory } from '../services/storage';

export default function PreviewScreen({ route, navigation }) {
  const { uri } = route.params || {};
  const [loading, setLoading] = useState(false);

  const onAnalyze = async () => {
    if (!uri) return;
    setLoading(true);
    try {
      const result = await analyzeImage(uri);
      await addHistory({ uri, ...result });
      navigation.replace('Results', { uri, result });
    } catch (err) {
      console.warn('Analyze error', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err.message ||
        'Failed to analyze image.';
      Alert.alert('Analysis failed', String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card title="Preview">
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={styles.empty}>No image selected.</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.info}>
            Tap <Text style={styles.bold}>Analyze Image</Text> to send this photo to the AI for
            description, OCR, and object detection.
          </Text>
        </Card>

        <View style={{ height: spacing.sm }} />
        <PrimaryButton
          title={loading ? 'Analyzing…' : 'Analyze Image'}
          icon="✨"
          onPress={onAnalyze}
          loading={loading}
          disabled={!uri || loading}
        />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton
          title="Choose a different image"
          variant="ghost"
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: '#eee' },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.lg },
  info: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '700' },
});
