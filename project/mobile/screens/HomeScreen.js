import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import Header from '../components/Header';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radius } from '../components/theme';
import { getHistory } from '../services/storage';
import { API_BASE_URL } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const list = await getHistory();
    setHistory(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please grant camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      navigation.navigate('Preview', { uri: result.assets[0].uri });
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please grant photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      navigation.navigate('Preview', { uri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="📸 Image Analyzer" subtitle="Snap or upload — get description, text & objects" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card title="Get Started">
          <Text style={styles.paragraph}>
            Take a photo or pick one from your gallery. We'll analyze it with AI and let you email
            the results.
          </Text>
          <View style={{ height: spacing.md }} />
          <PrimaryButton title="Take a Photo" icon="📷" onPress={pickFromCamera} />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton title="Upload from Gallery" icon="🖼️" variant="secondary" onPress={pickFromGallery} />
        </Card>

        <Card title="Recent Scans">
          {history.length === 0 ? (
            <Text style={styles.empty}>Your recent analyses will appear here.</Text>
          ) : (
            history.map((h) => (
              <Pressable
                key={h.id || h.savedAt}
                style={({ pressed }) => [styles.historyItem, pressed && { opacity: 0.7 }]}
                onPress={() =>
                  navigation.navigate('Results', {
                    uri: h.uri,
                    result: {
                      id: h.id,
                      description: h.description,
                      text: h.text,
                      objects: h.objects,
                      timestamp: h.timestamp,
                    },
                  })
                }
              >
                {h.uri ? <Image source={{ uri: h.uri }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: colors.chip }]} />}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text numberOfLines={2} style={styles.itemTitle}>
                    {h.description || '(no description)'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {new Date(h.savedAt || h.timestamp).toLocaleString()}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        <Text style={styles.apiLine}>API: {API_BASE_URL}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  paragraph: { color: colors.text, fontSize: 15, lineHeight: 22 },
  empty: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: '#ddd' },
  itemTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  itemMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  apiLine: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
