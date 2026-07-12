import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, SafeAreaView } from 'react-native';
import { Movie } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const loadContinueWatching = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          
          const stored = await AsyncStorage.getItem(`bongoflix_continue_watching_${session.user.id}`);
          if (stored) {
            const dict = JSON.parse(stored);
            const arr = Object.values(dict).sort((a: any, b: any) => b.timestamp - a.timestamp);
            setContinueWatching(arr);
          } else {
            setContinueWatching([]);
          }
        } catch (e: any) {
          console.log('Error loading continue watching', e);
        }
      };
      loadContinueWatching();
    }, [])
  );

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const visibleMovies = hiddenIds.length > 0
    ? movies.filter(m => !hiddenIds.includes(m.id))
    : movies;

  // Sorted by views for Top 10 / Trending
  const trendingMovies = [...visibleMovies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

  useEffect(() => {
    const heroCount = trendingMovies.length;
    if (heroCount <= 1) return;
    
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= heroCount) nextIndex = 0;
      
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000); 

    return () => clearInterval(interval);
  }, [currentIndex, trendingMovies.length]);

  const GENRES = ['Action', 'Anime', 'Comedy', 'Drama', 'Romance', 'Thriller'];

  useFocusEffect(
    React.useCallback(() => {
      fetchMovies();
      loadHiddenIds();
    }, [])
  );

  const loadHiddenIds = async () => {
    const stored = await AsyncStorage.getItem('bongoflix_hidden');
    setHiddenIds(stored ? JSON.parse(stored) : []);
  };

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setMovies(data as Movie[]);
    }
    setLoading(false);
  };

  const HERO_MOVIE = visibleMovies.length > 0 ? visibleMovies[0] : null;

  // Curated Categories
  const freeToWatch = visibleMovies.filter(m => m.is_free);
  const anime = visibleMovies.filter(m => m.genre === 'Anime');
  const completelyCaptivating = visibleMovies.filter(m => m.genre === 'Drama' || m.genre === 'Thriller');
  const romanticSeries = visibleMovies.filter(m => m.genre === 'Romance' && m.is_series);
  const dramaSeries = visibleMovies.filter(m => m.genre === 'Drama' && m.is_series);
  const comedySeries = visibleMovies.filter(m => m.genre === 'Comedy' && m.is_series);
  const cartoons = visibleMovies.filter(m => m.genre === 'Animation');
  const familiarFavorites = visibleMovies.filter(m => m.genre === 'Action' || m.genre === 'Animation' || m.genre === 'Comedy');

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate('MovieDetail', { movie: item })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
    </TouchableOpacity>
  );

  const renderContinueWatchingItem = ({ item }: { item: any }) => {
    const movie = item.movieData;
    const progressPercent = (item.progress / item.duration) * 100;
    
    return (
      <TouchableOpacity 
        style={styles.continueWatchingItem}
        onPress={() => navigation.navigate('VideoPlayer', { movie, initialTime: item.progress })}
      >
        <View style={styles.cwThumbnailContainer}>
          <Image source={{ uri: movie.thumbnailUrl }} style={styles.cwThumbnail} />
          <View style={styles.cwPlayIconOverlay}>
            <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
        <View style={styles.cwProgressBarBackground}>
          <View style={[styles.cwProgressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderRow = (title: string, data: Movie[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.genreSection}>
        <Text style={styles.genreTitle}>{title}</Text>
        <FlatList
          data={data}
          renderItem={renderMovieItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.netflixN}>B</Text>
          <Text style={styles.headerTitle}>Home</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotificationsModal(true)}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>1</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={{ minHeight: 50, maxHeight: 50, marginBottom: 10 }}
        contentContainerStyle={styles.pillsContainer}
      >
        {['Series', 'Films', 'New & Hot'].map((filter) => (
          <TouchableOpacity 
            key={filter}
            style={styles.pill}
            onPress={() => navigation.navigate('CategoryScreen', { filter })}
          >
            <Text style={styles.pillText}>{filter}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.pill} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.pillText}>Categories <Ionicons name="caret-down" size={12} color="#fff" /></Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Categories Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ paddingVertical: 40, alignItems: 'center' }}>
              {GENRES.map((g) => (
                <TouchableOpacity 
                  key={g} 
                  style={styles.modalGenreItem}
                  onPress={() => {
                    setShowCategoryModal(false);
                    navigation.navigate('CategoryScreen', { filter: g });
                  }}
                >
                  <Text style={styles.modalGenreText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsContent}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {visibleMovies.slice(0, 5).map((movie) => (
                <TouchableOpacity 
                  key={movie.id} 
                  style={styles.notificationItem}
                  onPress={() => {
                    setShowNotificationsModal(false);
                    navigation.navigate('MovieDetail', { movie });
                  }}
                >
                  <Image source={{ uri: movie.thumbnailUrl }} style={styles.notificationThumbnail} />
                  <View style={styles.notificationTextContainer}>
                    <Text style={styles.notificationNew}>New Arrival</Text>
                    <Text style={styles.notificationMovieTitle}>{movie.title}</Text>
                    <Text style={styles.notificationDate}>Recently Added</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {/* Hero Section Carousel */}
          {trendingMovies.length > 0 && (
            <FlatList
              ref={flatListRef}
              data={trendingMovies}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={{ width: SCREEN_WIDTH }}>
                  <TouchableOpacity 
                    style={styles.heroContainer}
                    activeOpacity={1}
                    onPress={() => navigation.navigate('MovieDetail', { movie: item })}
                  >
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.heroImage} />
                    <View style={styles.heroOverlay}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                        <View style={{ backgroundColor: '#E50914', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>TOP 10</Text>
                        </View>
                        <Text style={styles.heroSubtitle}>#{index + 1} in Movies Today</Text>
                      </View>
                      <View style={styles.heroButtonsRow}>
                        <TouchableOpacity style={styles.playButton} onPress={() => navigation.navigate('MovieDetail', { movie: item })}>
                          <Ionicons name="play" size={20} color="#000" />
                          <Text style={styles.playButtonText}>Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.myListButton}>
                          <Ionicons name="add" size={20} color="#fff" />
                          <Text style={styles.myListButtonText}>My List</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Continue Watching */}
          {continueWatching.length > 0 && (
            <View style={styles.genreSection}>
              <Text style={styles.genreTitle}>Continue Watching for You</Text>
              <FlatList
                data={continueWatching}
                renderItem={renderContinueWatchingItem}
                keyExtractor={(item) => item.movieData.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Curated Rows */}
          {renderRow('🎁 Free Movie of the Day', freeToWatch)}
          {renderRow('Trending Now', trendingMovies)}
          {renderRow('Cartoons', cartoons)}
          {renderRow('Anime', anime)}
          {renderRow('Completely Captivating', completelyCaptivating)}
          {renderRow('Romantic Series', romanticSeries)}
          {renderRow('Drama Series', dramaSeries)}
          {renderRow('Comedy Series', comedySeries)}
          {renderRow('Familiar Favorites', familiarFavorites)}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netflixN: {
    color: '#E50914',
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 20,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E50914',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#4d4d4d',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginRight: 8,
  },
  pillClear: {
    borderWidth: 1,
    borderColor: '#4d4d4d',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  heroContainer: {
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: 'hidden',
    height: 450,
    marginBottom: 30,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '40%', justifyContent: 'flex-end', padding: 15,
  },
  heroSubtitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    position: 'relative',
  },
  closeModalButton: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: '#111',
    borderRadius: 20,
  },
  modalGenreItem: {
    paddingVertical: 20,
  },
  modalGenreText: {
    color: '#b3b3b3',
    fontSize: 24,
    fontWeight: '600',
  },
  notificationsContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationsTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  notificationThumbnail: {
    width: 100,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  notificationTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  notificationNew: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationMovieTitle: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
  },
  notificationDate: {
    color: '#8c8c8c',
    fontSize: 12,
    marginTop: 4,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  myListButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    flex: 1,
  },
  myListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  genreSection: {
    marginBottom: 25,
  },
  genreTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
  },
  listContainer: {
    paddingLeft: 15,
  },
  movieItem: {
    marginRight: 8,
  },
  thumbnail: {
    width: 105,
    height: 150,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  continueWatchingItem: {
    marginRight: 8,
    width: 105,
    backgroundColor: '#333',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cwThumbnailContainer: {
    position: 'relative',
  },
  cwThumbnail: {
    width: 105,
    height: 150,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  cwPlayIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cwProgressBarBackground: {
    height: 4,
    backgroundColor: '#555',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
  },
  cwProgressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
});
