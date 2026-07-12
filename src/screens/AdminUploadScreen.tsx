import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Switch, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const GENRES = [
  'Action', 'Anime', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Documentary', 'Animation'
];

export default function AdminUploadScreen({ route, navigation }: any) {
  const editMovie = route.params?.editMovie as any;
  
  const [title, setTitle] = useState(editMovie?.title || '');
  const [genre, setGenre] = useState(editMovie?.genre || GENRES[0]);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(editMovie?.thumbnailUrl || null);
  const [videoUri, setVideoUri] = useState<string | null>(editMovie?.videoUrl || null);
  
  const [useExternalVideo, setUseExternalVideo] = useState(false);
  const [externalVideoUrl, setExternalVideoUrl] = useState('');

  const [isFree, setIsFree] = useState(editMovie?.is_free ?? false);

  const [isSeries, setIsSeries] = useState(editMovie?.is_series || false);
  const [seriesName, setSeriesName] = useState(editMovie?.series_name || '');
  const [episodeNumber, setEpisodeNumber] = useState(editMovie?.episode_number?.toString() || '1');
  
  const [description, setDescription] = useState(editMovie?.description || '');
  const [ageRating, setAgeRating] = useState(editMovie?.age_rating || '13+');
  const [isHD, setIsHD] = useState(editMovie?.is_hd ?? true);
  const [hasSubtitles, setHasSubtitles] = useState(editMovie?.has_subtitles ?? false);
  const [castNames, setCastNames] = useState(editMovie?.cast_names || '');
  const [directorName, setDirectorName] = useState(editMovie?.director_name || '');
  const [releaseYear, setReleaseYear] = useState(editMovie?.release_year || '2024');
  const [duration, setDuration] = useState(editMovie?.duration || '');

  const [uploading, setUploading] = useState(false);
  
  // Request Inbox State
  const [showInbox, setShowInbox] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    const { data, error } = await supabase
      .from('movie_requests')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setRequests(data);
    } else if (error) {
      console.log('Error fetching requests', error);
    }
    setLoadingRequests(false);
  };
  
  useEffect(() => {
    if (showInbox) {
      fetchRequests();
    }
  }, [showInbox]);

  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setThumbnailUri(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const uploadFile = async (bucket: string, path: string, uri: string, contentType: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // FileSystem.uploadAsync natively streams the file over the network, avoiding OOMs and 0-byte blobs!
    const response = await FileSystem.uploadAsync(
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
      uri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Upload failed with status ${response.status}: ${response.body}`);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
      
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!title || !genre || !thumbnailUri) {
      Alert.alert('Missing Fields', 'Please provide a title, genre, and thumbnail.');
      return;
    }
    
    if (useExternalVideo && !externalVideoUrl) {
      Alert.alert('Missing Fields', 'Please paste the external video URL.');
      return;
    }
    
    if (!useExternalVideo && !videoUri) {
      Alert.alert('Missing Fields', 'Please select a video file to upload.');
      return;
    }

    if (isSeries && (!seriesName || !episodeNumber)) {
      Alert.alert('Missing Fields', 'Please provide a Series Name and Episode Number.');
      return;
    }

    setUploading(true);

    try {
      const fileName = `${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}`;
      
      // Upload Thumbnail only if it changed (is a local URI)
      let thumbUrl = thumbnailUri;
      if (thumbnailUri && thumbnailUri.startsWith('file://')) {
        thumbUrl = await uploadFile('thumbnails', `${fileName}.jpg`, thumbnailUri, 'image/jpeg');
      }
      
      // Upload Video only if it changed and not using external URL
      let vidUrl = videoUri;
      if (useExternalVideo) {
        vidUrl = externalVideoUrl;
      } else if (videoUri && videoUri.startsWith('file://')) {
        vidUrl = await uploadFile('videos', `${fileName}.mp4`, videoUri, 'video/mp4');
      }

      const movieData = {
        title,
        genre,
        description,
        thumbnailUrl: thumbUrl,
        videoUrl: vidUrl,
        is_series: isSeries,
        series_name: isSeries ? seriesName : null,
        episode_number: isSeries ? parseInt(episodeNumber) : null,
        age_rating: ageRating,
        is_hd: isHD,
        has_subtitles: hasSubtitles,
        cast_names: castNames,
        director_name: directorName,
        release_year: releaseYear,
        duration: duration,
        is_free: isFree,
      };

      if (editMovie) {
        // Update existing record
        const { error } = await supabase
          .from('movies')
          .update(movieData)
          .eq('id', editMovie.id);
        if (error) throw error;
        Alert.alert('Success', 'Movie updated successfully!');
      } else {
        // Insert new record
        const { error } = await supabase
          .from('movies')
          .insert(movieData);
        if (error) throw error;
        Alert.alert('Success', 'Movie published successfully!');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editMovie ? 'Update Movie' : 'Upload Movie'}</Text>
        <TouchableOpacity onPress={() => setShowInbox(true)} style={styles.inboxBtn}>
          <Ionicons name="mail" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Avatar: The Last Airbender" 
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description (About)</Text>
        <TextInput 
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder="Enter movie description..." 
          placeholderTextColor="#666"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Release Year</Text>
            <TextInput 
              style={styles.input} 
              placeholder="2024" 
              placeholderTextColor="#666"
              value={releaseYear}
              onChangeText={setReleaseYear}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Age Rating</Text>
            <View style={[styles.pickerContainer, { marginBottom: 0 }]}>
              <Picker
                selectedValue={ageRating}
                style={styles.picker}
                itemStyle={{ color: '#fff' }}
                dropdownIconColor="#fff"
                onValueChange={(itemValue) => setAgeRating(itemValue)}
              >
                <Picker.Item label="18+" value="18+" />
                <Picker.Item label="16+" value="16+" />
                <Picker.Item label="13+" value="13+" />
                <Picker.Item label="PG" value="PG" />
                <Picker.Item label="G" value="G" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Cast Names</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Will Smith, Tom Cruise" 
          placeholderTextColor="#666"
          value={castNames}
          onChangeText={setCastNames}
        />

        {/* Director */}
        <Text style={styles.label}>Director</Text>
        <TextInput
          style={styles.input}
          value={directorName}
          onChangeText={setDirectorName}
          placeholder="e.g. Christopher Nolan"
          placeholderTextColor="#999"
        />

        {/* Duration */}
        <Text style={styles.label}>Movie Length (Duration)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="e.g. 2h 14m, 25m, 1h"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Genre</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={genre}
            style={styles.picker}
            itemStyle={{ color: '#fff' }}
            dropdownIconColor="#fff"
            onValueChange={(itemValue) => setGenre(itemValue)}
          >
            {GENRES.map((g) => (
              <Picker.Item key={g} label={g} value={g} />
            ))}
          </Picker>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>HD Available?</Text>
          <Switch
            value={isHD}
            onValueChange={setIsHD}
            trackColor={{ false: '#4d4d4d', true: '#E50914' }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Subtitles Available?</Text>
          <Switch
            value={hasSubtitles}
            onValueChange={setHasSubtitles}
            trackColor={{ false: '#4d4d4d', true: '#E50914' }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Is this a TV Series?</Text>
          <Switch
            value={isSeries}
            onValueChange={setIsSeries}
            trackColor={{ false: '#4d4d4d', true: '#E50914' }}
          />
        </View>

        {isSeries && (
          <View style={styles.seriesContainer}>
            <Text style={styles.label}>Series Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Boys Over Flowers" 
              placeholderTextColor="#666"
              value={seriesName}
              onChangeText={setSeriesName}
            />

            <Text style={styles.label}>Episode Number</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 1" 
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={episodeNumber}
              onChangeText={setEpisodeNumber}
            />
          </View>
        )}

        <Text style={styles.label}>Thumbnail</Text>
        <TouchableOpacity style={styles.mediaPicker} onPress={pickThumbnail}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.mediaPlaceholder}>Tap to select Thumbnail (Image)</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Use External Video URL</Text>
          <Switch 
            value={useExternalVideo}
            onValueChange={setUseExternalVideo}
            trackColor={{ false: '#767577', true: '#E50914' }}
            thumbColor={useExternalVideo ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Set as Free Movie of the Day</Text>
          <Switch 
            value={isFree}
            onValueChange={setIsFree}
            trackColor={{ false: '#767577', true: '#E50914' }}
            thumbColor={isFree ? '#fff' : '#f4f3f4'}
          />
        </View>

        {useExternalVideo ? (
          <View>
            <Text style={styles.label}>External Video URL (.mp4)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. https://archive.org/download/.../movie.mp4" 
              placeholderTextColor="#666"
              value={externalVideoUrl}
              onChangeText={setExternalVideoUrl}
            />
            <Text style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 20 }}>
              This will not consume any of your Supabase storage!
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Video File</Text>
            <TouchableOpacity style={styles.mediaPicker} onPress={pickVideo}>
              {videoUri ? (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoPreviewText}>Video Selected!</Text>
                </View>
              ) : (
                <Text style={styles.mediaPlaceholder}>Tap to select Movie (Video)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.publishBtn, uploading && styles.publishBtnDisabled]} 
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.publishText}>{editMovie ? 'Updating...' : 'Uploading...'}</Text>
            </View>
          ) : (
            <Text style={styles.publishText}>{editMovie ? 'Update Movie' : 'Publish Movie'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* INBOX MODAL */}
      <Modal visible={showInbox} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Movie Requests Inbox</Text>
            <TouchableOpacity onPress={() => setShowInbox(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {loadingRequests ? (
            <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 15 }}
              ListEmptyComponent={<Text style={{ color: '#8c8c8c', textAlign: 'center', marginTop: 50 }}>No requests yet.</Text>}
              renderItem={({ item }) => (
                <View style={styles.requestCard}>
                  <Text style={styles.requestMovieTitle}>{item.title}</Text>
                  <Text style={styles.requestEmail}>Requested by: {item.user_email}</Text>
                  <Text style={styles.requestDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  inboxBtn: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  pickerContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    // Removed fixed height so iOS wheel doesn't get cut off
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  seriesContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  mediaPicker: {
    backgroundColor: '#222',
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  mediaPlaceholder: {
    color: '#666',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  publishBtn: {
    backgroundColor: '#E50914',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestCard: {
    backgroundColor: '#141414',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestMovieTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  requestEmail: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  requestDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  }
});
