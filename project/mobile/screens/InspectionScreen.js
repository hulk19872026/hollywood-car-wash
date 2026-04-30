import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius } from '../components/theme';
import { analyze, sendReport } from '../services/api';

const PHOTO_LABELS = [
  'Registration',
  'Mileage on Dashboard',
  'Engine',
  'Undercarriage',
  'Rear Plate',
];
const TECH_KEY = 'hoc_tech_v1';
const PHOTO_COUNT = 5;
const RECIPIENT = 'david@hulkautomation.com';

function formatTimestamp(d) {
  const date = d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date}  ${time}`;
}

export default function InspectionScreen() {
  const [tech, setTech] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [photos, setPhotos] = useState(Array(PHOTO_COUNT).fill(null));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TECH_KEY);
        if (raw) {
          const t = JSON.parse(raw);
          if (t?.firstName && t?.lastName) {
            setTech(t);
            return;
          }
        }
      } catch {}
      setShowLogin(true);
    })();
  }, []);

  const filledCount = photos.filter(Boolean).length;

  const setSlot = useCallback((i, asset) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[i] = asset;
      return next;
    });
  }, []);

  const openCameraForSlot = useCallback(
    async (i) => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera permission required',
          'Allow camera access in Settings to capture inspection photos.',
        );
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
        exif: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      setSlot(i, r.assets[0]);
    },
    [setSlot],
  );

  const openLibraryForSlot = useCallback(
    async (i) => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo library permission required');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        exif: false,
      });
      if (r.canceled || !r.assets?.[0]) return;
      setSlot(i, r.assets[0]);
    },
    [setSlot],
  );

  const handleSlotPress = (i) => {
    Alert.alert(
      `Photo ${i + 1}: ${PHOTO_LABELS[i]}`,
      photos[i] ? 'Replace this photo?' : 'Add this photo',
      [
        { text: 'Take photo', onPress: () => openCameraForSlot(i) },
        { text: 'Choose from device', onPress: () => openLibraryForSlot(i) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleUpload = () => {
    const idx = photos.findIndex((p) => !p);
    openLibraryForSlot(idx === -1 ? 0 : idx);
  };

  const handleClear = () => {
    setPhotos(Array(PHOTO_COUNT).fill(null));
    setResult(null);
    setStatus({ text: '', kind: '' });
  };

  const submitLogin = async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f || !l) {
      setLoginError('Enter both first name (username) and last name (password).');
      return;
    }
    const t = { firstName: f, lastName: l };
    try {
      await AsyncStorage.setItem(TECH_KEY, JSON.stringify(t));
    } catch {}
    setTech(t);
    setShowLogin(false);
    setLoginError('');
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(TECH_KEY);
    } catch {}
    setTech(null);
    setFirstName('');
    setLastName('');
    setShowLogin(true);
  };

  const handleAnalyze = async () => {
    if (filledCount !== PHOTO_COUNT) return;
    if (!tech) {
      setShowLogin(true);
      return;
    }
    setBusy(true);
    setStatus({ text: `Analyzing ${PHOTO_COUNT} photos…`, kind: 'loading' });
    let fullSuccess = false;
    try {
      const analyzeRes = await analyze(photos);
      setResult(analyzeRes);
      setStatus({ text: 'Sending report…', kind: 'loading' });
      try {
        const sent = await sendReport({
          photos,
          technicianName: `${tech.firstName} ${tech.lastName}`,
          submittedAt: formatTimestamp(new Date()),
          description: analyzeRes.description || '',
          text: analyzeRes.text || '',
          objects: analyzeRes.objects || [],
          historyId: analyzeRes.id,
        });
        const suffix =
          typeof sent.attachmentCount === 'number'
            ? ` (PDF with ${sent.attachmentCount} photo${sent.attachmentCount === 1 ? '' : 's'} attached)`
            : '';
        setStatus({
          text: `Report sent to ${sent.recipient}.${suffix} Resetting…`,
          kind: 'ok',
        });
        fullSuccess = true;
      } catch (sendErr) {
        setStatus({
          text: 'Analysis complete, but email failed: ' + (sendErr?.message || String(sendErr)),
          kind: 'error',
        });
      }
    } catch (err) {
      setStatus({
        text: 'Error: ' + (err?.message || String(err)),
        kind: 'error',
      });
    } finally {
      setBusy(false);
      if (fullSuccess) {
        setTimeout(() => {
          setPhotos(Array(PHOTO_COUNT).fill(null));
          setResult(null);
          setStatus({ text: '', kind: '' });
        }, 2500);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Hollywood Oil Change</Text>
        <Text style={styles.subtitle}>
          Snap five photos of your vehicle for a quick AI inspection.
        </Text>

        {tech ? (
          <View style={styles.techPill}>
            <Text style={styles.techText}>
              Signed in as{' '}
              <Text style={styles.techStrong}>
                {tech.firstName} {tech.lastName}
              </Text>
            </Text>
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.captureHeader}>
            <Text style={styles.cardTitle}>Vehicle Photos</Text>
            <Text style={styles.counter}>
              <Text style={styles.counterStrong}>{filledCount}</Text> / 5 photos
            </Text>
          </View>

          <View style={styles.grid}>
            {photos.map((photo, i) => (
              <Pressable
                key={i}
                style={[styles.slot, photo && styles.slotFilled]}
                onPress={() => handleSlotPress(i)}
              >
                <View style={styles.slotIndex}>
                  <Text style={styles.slotIndexText}>{i + 1}</Text>
                </View>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.slotImage} />
                ) : (
                  <View style={styles.slotEmpty}>
                    <Text style={styles.slotIcon}>📷</Text>
                    <Text style={styles.slotLabel} numberOfLines={2}>
                      {PHOTO_LABELS[i]}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.secondaryActions}>
            <Pressable style={styles.btnGhost} onPress={handleUpload}>
              <Text style={styles.btnGhostText}>Upload from device</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={handleClear}>
              <Text style={styles.btnGhostText}>Clear all</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.btnPrimary,
              (busy || filledCount !== PHOTO_COUNT) && styles.btnDisabled,
            ]}
            disabled={busy || filledCount !== PHOTO_COUNT}
            onPress={handleAnalyze}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.btnPrimaryText}>Analyze 5 photos</Text>
            )}
          </Pressable>

          {status.text ? (
            <View style={styles.statusRow}>
              {status.kind === 'loading' ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
              <Text
                style={[
                  styles.status,
                  status.kind === 'ok' && styles.statusOk,
                  status.kind === 'error' && styles.statusError,
                ]}
              >
                {status.text}
              </Text>
            </View>
          ) : null}
        </View>

        {result ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.body}>{result.description || '(none)'}</Text>

            <Text style={[styles.cardTitle, { marginTop: spacing.md }]}>
              Extracted text
            </Text>
            <Text style={styles.pre}>{result.text || '(no text detected)'}</Text>

            <Text style={[styles.cardTitle, { marginTop: spacing.md }]}>
              Detected objects
            </Text>
            <View style={styles.chips}>
              {(Array.isArray(result.objects) && result.objects.length
                ? result.objects
                : ['no objects detected']
              ).map((o, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{o}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footerNote}>
              Reports auto-send to{' '}
              <Text style={styles.footerStrong}>{RECIPIENT}</Text> the moment
              analysis completes.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showLogin} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.loginOverlay}
        >
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Technician sign in</Text>
            <Text style={styles.loginHint}>
              Use your first name as username and last name as password.
            </Text>
            <Text style={styles.fieldLabel}>Username (first name)</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              autoComplete="name-given"
              returnKeyType="next"
              maxLength={40}
            />
            <Text style={styles.fieldLabel}>Password (last name)</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              autoComplete="name-family"
              returnKeyType="done"
              maxLength={40}
              onSubmitEditing={submitLogin}
            />
            <Pressable style={styles.btnPrimary} onPress={submitLogin}>
              <Text style={styles.btnPrimaryText}>Log in</Text>
            </Pressable>
            {loginError ? (
              <Text style={styles.statusError}>{loginError}</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  techPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    marginTop: spacing.xs,
  },
  techText: { color: colors.text, fontSize: 13 },
  techStrong: { color: colors.primary, fontWeight: '700' },
  signOut: { color: colors.danger, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,215,0,0.30)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  captureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  counter: { fontSize: 13, color: colors.textMuted },
  counterStrong: { color: colors.primary, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,215,0,0.30)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  slotIndex: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  slotIndexText: {
    color: colors.onPrimary,
    fontWeight: '800',
    fontSize: 12,
  },
  slotImage: { width: '100%', height: '100%' },
  slotEmpty: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  slotIcon: { fontSize: 28 },
  slotLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnGhost: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnGhostText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },

  btnPrimary: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  statusRow: {
    marginTop: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  status: { color: colors.text, fontSize: 14, flexShrink: 1 },
  statusOk: { color: colors.primary },
  statusError: { color: colors.danger },

  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  pre: {
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: colors.primary, fontSize: 13 },

  footerNote: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  footerStrong: { color: colors.primary, fontWeight: '700' },

  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loginCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderColor: 'rgba(255,215,0,0.30)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg + 4,
    gap: spacing.sm + 4,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  loginHint: { color: colors.textMuted, fontSize: 13 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.30)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    minHeight: 44,
  },
});
