import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../types';
import { supabase } from '../lib/supabase';

export default function DownloadsScreen({ navigation }: any) {
  const [downloadedMovies, setDownloadedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDownloads();
    });
    loadDownloads();
    return unsubscribe;
  }, [navigation]);

  const loadDownloads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const stored = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
      if (stored) {
        const downloads: Movie[] = JSON.parse(stored);
        setDownloadedMovies(downloads);
        
        // Calculate storage used
        let totalBytes = 0;
        for (const m of downloads) {
          if (m.videoUrl.startsWith('file://')) {
            const info = await FileSystem.getInfoAsync(m.videoUrl);
            if (info.exists) {
              totalBytes += info.size || 0;
            }
          }
        }
        setStorageUsed(totalBytes);
      } else {
        setDownloadedMovies([]);
        setStorageUsed(0);
      }
    } catch (error) {
      console.error('Error loading downloads', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDownload = async (movie: Movie) => {
    Alert.alert(
      "Delete Download",
      `Are you sure you want to delete ${movie.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.user) return;
              
              if (movie.videoUrl.startsWith('file://')) {
                await FileSystem.deleteAsync(movie.videoUrl, { idempotent: true });
              }
              const updated = downloadedMovies.filter(m => m.id !== movie.id);
              await AsyncStorage.setItem(`bongoflix_downloads_${session.user.id}`, JSON.stringify(updated));
              setDownloadedMovies(updated);
              loadDownloads(); // Recalculate storage
            } catch (error) {
              console.error('Failed to delete', error);
            }
          }
        }
      ]
    );
  };

  const playMovie = (movie: Movie) => {
    navigation.navigate('MovieDetail', { movie });
  };

  const renderItem = ({ item }: { item: Movie }) => (
    <View style={styles.movieItem}>
      <TouchableOpacity onPress={() => playMovie(item)} style={styles.movieTouchable}>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle}>{item.title}</Text>
          <Text style={styles.movieSubtext}>{item.release_year || '2024'} • Offline</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteDownload(item)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={24} color="#e50914" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Downloads</Text>
      
      {/* Storage Dashboard */}
      <View style={styles.storageContainer}>
        <View style={styles.storageHeader}>
          <Ionicons name="phone-portrait-outline" size={16} color="#8c8c8c" />
          <Text style={styles.storageText}>BongoFlix is using {(storageUsed / (1024 * 1024)).toFixed(1)} MB</Text>
        </View>
        <View style={styles.storageBarBg}>
          <View style={[styles.storageBarFill, { width: `${Math.min(100, (storageUsed / (2 * 1024 * 1024 * 1024)) * 100)}%` }]} />
        </View>
      </View>
      
      {downloadedMovies.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="download-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Downloads</Text>
          <Text style={styles.emptySubtitle}>Movies and shows you download will appear here to watch offline.</Text>
          <TouchableOpacity style={styles.findBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={styles.findBtnText}>Find Something to Download</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={downloadedMovies}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 15,
    marginVertical: 20,
  },
  storageContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageText: {
    color: '#8c8c8c',
    fontSize: 14,
    marginLeft: 8,
  },
  storageBarBg: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6', // Blue for app storage
  },
  listContainer: {
    padding: 15,
  },
  movieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
  },
  movieTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 120,
    height: 70,
  },
  movieInfo: {
    flex: 1,
    paddingHorizontal: 15,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  movieSubtext: {
    color: '#8c8c8c',
    fontSize: 14,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtitle: {
    color: '#8c8c8c',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  findBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  findBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
