import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radius } from '../components/theme';
import { sendEmail } from '../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResultsScreen({ route, navigation }) {
  const { uri, result } = route.params || {};
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { description, text, objects = [], id } = result || {};

  const onSend = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      await sendEmail({
        email: trimmed,
        description,
        text,
        objects,
        historyId: id, // server will attach the stored image
      });
      setSent(true);
      Alert.alert('Email sent ✅', `Results sent to ${trimmed}.`);
    } catch (err) {
      console.warn('Email error', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err.message ||
        'Failed to send email.';
      Alert.alert('Send failed', String(msg));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {uri ? (
            <Card title="Image">
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            </Card>
          ) : null}

          <Card title="Description">
            <Text style={styles.body}>{description || <Text style={styles.muted}>None.</Text>}</Text>
          </Card>

          <Card title="Extracted Text">
            {text ? (
              <Text style={styles.mono}>{text}</Text>
            ) : (
              <Text style={styles.muted}>No text detected.</Text>
            )}
          </Card>

          <Card title="Detected Objects">
            {objects.length === 0 ? (
              <Text style={styles.muted}>No objects detected.</Text>
            ) : (
              <View style={styles.chipRow}>
                {objects.map((o, i) => (
                  <View key={`${o}-${i}`} style={styles.chip}>
                    <Text style={styles.chipText}>{o}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card title="Send by Email">
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (sent) setSent(false);
              }}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              editable={!sending}
            />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title={sending ? 'Sending…' : sent ? 'Re-send Email' : 'Send Email'}
              icon="📧"
              onPress={onSend}
              loading={sending}
              disabled={sending || !email.trim()}
            />
          </Card>

          <PrimaryButton
            title="Analyze another image"
            variant="ghost"
            onPress={() => navigation.popToTop()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: '#eee' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  mono: {
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  muted: { color: colors.textMuted, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: { color: colors.chipText, fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
  },
});
