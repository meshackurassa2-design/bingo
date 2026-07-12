import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function SearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchMovies();
    }, [])
  );

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMovies(data as Movie[]);
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity 
      style={styles.movieRow}
      onPress={() => navigation.navigate('MovieDetail', { movie: item })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle}>{item.title}</Text>
      </View>
      <TouchableOpacity 
        style={styles.playButtonContainer}
        onPress={() => navigation.navigate('MovieDetail', { movie: item })}
      >
        <Ionicons name="play-circle-outline" size={40} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const filteredMovies = movies.filter(
    (movie) => 
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movie.genre && movie.genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#8c8c8c" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search games, series, films..."
            placeholderTextColor="#8c8c8c"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        {searchQuery.trim() === '' ? 'Recommended series & films' : 'Top Results'}
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredMovies}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#141414',
  },
  thumbnail: {
    width: 140,
    height: 80,
    resizeMode: 'cover',
  },
  movieInfo: {
    flex: 1,
    paddingHorizontal: 15,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  playButtonContainer: {
    padding: 15,
  },
});
