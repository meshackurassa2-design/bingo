import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../types';
import { useFocusEffect } from '@react-navigation/native';

export default function MyListScreen({ navigation }: any) {
  const [myList, setMyList] = React.useState<Movie[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadMyList();
    }, [])
  );

  const loadMyList = async () => {
    const stored = await AsyncStorage.getItem('bongoflix_mylist');
    setMyList(stored ? JSON.parse(stored) : []);
  };

  const removeFromList = async (movieId: string) => {
    const updated = myList.filter(m => m.id !== movieId);
    setMyList(updated);
    await AsyncStorage.setItem('bongoflix_mylist', JSON.stringify(updated));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.netflixN}>B</Text>
        <Text style={styles.headerTitle}>My List</Text>
      </View>

      {myList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color="#555" />
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add movies and shows by tapping + My List on any title
          </Text>
        </View>
      ) : (
        <FlatList
          data={myList}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.movieCard}
              onPress={() => navigation.navigate('MovieDetail', { movie: item })}
            >
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFromList(item.id)}
              >
                <Ionicons name="close-circle" size={22} color="#E50914" />
              </TouchableOpacity>
              <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    marginBottom: 15,
  },
  netflixN: {
    color: '#E50914',
    fontSize: 36,
    fontWeight: 'bold',
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    color: '#8c8c8c',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  movieCard: {
    flex: 1,
    margin: 5,
    maxWidth: '50%',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 11,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 8,
  },
});
