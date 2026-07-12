import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface NoNetworkScreenProps {
  onRetry: () => void;
  onGoToDownloads: () => void;
}

export default function NoNetworkScreen({ onRetry, onGoToDownloads }: NoNetworkScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Signal / WiFi off icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="wifi-outline" size={80} color="#555" />
          <View style={styles.crossLine} />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          BongoFlix needs internet to load content.{'\n'}
          Try again or watch your downloads.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.downloadsButton} onPress={onGoToDownloads}>
          <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.downloadsText}>See Downloads</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  crossLine: {
    position: 'absolute',
    width: 90,
    height: 3,
    backgroundColor: '#E50914',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    color: '#8c8c8c',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 4,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b2b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 4,
    width: '100%',
    justifyContent: 'center',
  },
  downloadsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
