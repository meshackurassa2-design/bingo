import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CategoryScreen({ route, navigation }: any) {
  const { filter } = route.params; // 'Series', 'Films', or 'New & Hot', or a Genre
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const visibleMovies = movies;

  // For the hero carousel in category
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

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      let filtered = data;
      if (filter === 'Series') {
        filtered = data.filter(m => m.is_series);
      } else if (filter === 'Films') {
        filtered = data.filter(m => !m.is_series);
      } else if (filter === 'New & Hot') {
        filtered = data.slice(0, 15);
      }
      setMovies(filtered);
    }
    setLoading(false);
  };

  const HERO_MOVIE = visibleMovies.length > 0 ? visibleMovies[0] : null;

  const anime = movies.filter(m => m.genre === 'Anime');
  const completelyCaptivating = movies.filter(m => m.genre === 'Drama' || m.genre === 'Thriller');
  const romantic = movies.filter(m => m.genre === 'Romance');
  const actionPack = movies.filter(m => m.genre === 'Action');

  const renderMovieItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate('MovieDetail', { movie: item })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
    </TouchableOpacity>
  );

  const renderRow = (title: string, data: any[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.row}>
        <Text style={styles.rowTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
          {data.map((item, index) => <React.Fragment key={index}>{renderMovieItem({ item })}</React.Fragment>)}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sub-page Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>{filter}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* All Categories Pill */}
      <View style={styles.pillsContainer}>
        <TouchableOpacity style={styles.pill} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.pillText}>All Categories <Ionicons name="caret-down" size={12} color="#fff" /></Text>
        </TouchableOpacity>
      </View>

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
                    navigation.replace('CategoryScreen', { filter: g });
                  }}
                >
                  <Text style={styles.modalGenreText}>{g}</Text>
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
                        <Text style={styles.heroSubtitle}>#{index + 1} in {filter} Today</Text>
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

          {renderRow(`Trending ${filter}`, trendingMovies)}
          {renderRow('Action Packed', actionPack)}
          {renderRow('Completely Captivating', completelyCaptivating)}
          {renderRow('Romantic', romantic)}
          {renderRow('Anime', anime)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 20 },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'flex-start',
    paddingTop: 4,
    marginBottom: 10,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#4d4d4d',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginRight: 8,
  },
  pillText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  heroContainer: {
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: 'hidden',
    height: 450,
    marginBottom: 30,
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '40%', justifyContent: 'flex-end', padding: 15,
  },
  heroSubtitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  heroButtonsRow: { flexDirection: 'row', justifyContent: 'center' },
  playButton: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 4, flex: 1, marginRight: 10,
  },
  playButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  myListButton: {
    backgroundColor: '#333', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 4, flex: 1,
  },
  myListButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  row: { marginBottom: 25 },
  rowTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginHorizontal: 15, marginBottom: 10 },
  rowScroll: { paddingHorizontal: 15 },
  movieItem: { marginRight: 10 },
  thumbnail: { width: 110, height: 160, borderRadius: 6, backgroundColor: '#222' },
});
