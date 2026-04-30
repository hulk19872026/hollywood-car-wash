import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import InspectionScreen from './screens/InspectionScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <InspectionScreen />
    </SafeAreaProvider>
  );
}
