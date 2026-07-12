import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, ActivityIndicator, BackHandler, Modal, Alert , SafeAreaView} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from '../types';
import { supabase } from '../lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useSubscription } from '../hooks/useSubscription';

export default function VideoPlayerScreen({ route, navigation }: any) {
  useKeepAwake();
  usePreventScreenCapture();
  const { movie, initialTime } = route.params as { movie: Movie, initialTime?: number };
  const [nextEpisode, setNextEpisode] = useState<Movie | null>(null);
  
  const { isSubscribed } = useSubscription();
  
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'HD' | 'SD'>(movie.downloadQuality || 'HD');

  const player = useVideoPlayer(movie.videoUrl, (player) => {
    player.play();
  });

  const changeQuality = (quality: 'HD' | 'SD') => {
    if (quality === selectedQuality) {
      setShowQualityModal(false);
      return;
    }
    const currentTime = player.currentTime;
    setSelectedQuality(quality);
    const newUrl = quality === 'SD' && movie.videoUrl_sd ? movie.videoUrl_sd : movie.videoUrl;
    player.replace(newUrl);
    player.seekBy(currentTime);
    setShowQualityModal(false);
    player.play();
    setIsPlaying(true);
  };

  useEffect(() => {
    // Force landscape immediately
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Increment View Count
    const incrementViews = async () => {
      const { data } = await supabase.from('movies').select('views').eq('id', movie.id).single();
      const currentViews = data?.views || 0;
      await supabase.from('movies').update({ views: currentViews + 1 }).eq('id', movie.id);
    };
    incrementViews();
  }, []);

  // FORCE SAVE FOR DEBUGGING
  useEffect(() => {
    const forceSave = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const stored = await AsyncStorage.getItem(`bongoflix_continue_watching_${session.user.id}`);
        let progressDict = stored ? JSON.parse(stored) : {};
        
        progressDict[movie.id] = {
          progress: 10,
          duration: 100,
          movieData: movie,
          timestamp: Date.now()
        };
        
        await AsyncStorage.setItem(`bongoflix_continue_watching_${session.user.id}`, JSON.stringify(progressDict));
        Alert.alert("Debug Save", "Successfully saved dummy progress!");
      } catch(e: any) {
        Alert.alert("Debug Save Error", e.message || String(e));
      }
    };
    forceSave();
  }, [movie.id]);
  const saveProgress = async () => {
    try {
      if (!player) return;
      const current = player.currentTime;
      const total = player.duration;
      if (total <= 0) return;
      
      const percent = current / total;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const stored = await AsyncStorage.getItem(`bongoflix_continue_watching_${session.user.id}`);
      let progressDict = stored ? JSON.parse(stored) : {};
      
      // Always save for now to make it easy to see
      progressDict[movie.id] = {
        progress: current,
        duration: total,
        movieData: movie,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(`bongoflix_continue_watching_${session.user.id}`, JSON.stringify(progressDict));
    } catch (e: any) {
      console.log('Error saving progress', e);
      Alert.alert('Save Error', e.message || String(e));
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      saveProgress();
    });
    return unsubscribe;
  }, [navigation, player]);

  // Helper: lock portrait FIRST, then navigate. Solves the stuck-in-landscape bug.
  const goBackToPortrait = async () => {
    try {
      player.pause();
      await saveProgress();
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (e) {
      console.log("Error locking portrait", e);
    } finally {
      navigation.goBack();
    }
  };

  // Intercept Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackToPortrait();
      return true; // prevent default behaviour
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (movie.is_series && movie.series_name && movie.episode_number) {
      findNextEpisode();
    }
    resetControlsTimer();
  }, [movie]);

  const findNextEpisode = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('series_name', movie.series_name)
      .eq('episode_number', (movie.episode_number || 0) + 1)
      .single();

    if (!error && data) {
      setNextEpisode(data as Movie);
    }
  };

  useEffect(() => {
    // Ensure we seek to the correct time once it's ready, and guarantee it plays.
    let hasSeeked = false;
    const statusSub = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        setIsBuffering(false);
        if (initialTime && initialTime > 0) {
          player.currentTime = initialTime;
        }
        player.play();
      } else if (payload.status === 'loading') {
        setIsBuffering(true);
      }
    });

    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(payload.isPlaying);
    });

    const endSub = player.addListener('playToEnd', () => {
      if (nextEpisode) {
        navigation.replace('VideoPlayer', { movie: nextEpisode });
      } else {
        goBackToPortrait();
      }
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      endSub.remove();
    };
  }, [player, nextEpisode, initialTime]);

  const toggleControls = () => {
    if (showControls) {
      hideControls();
    } else {
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      resetControlsTimer();
    }
  };

  const hideControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowControls(false));
  };

  const resetControlsTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      hideControls();
    }, 4000);
  };

  const handlePlayPause = () => {
    resetControlsTimer();
    if (player.playing) {
      player.pause();
      setIsPlaying(false); // update icon immediately, don't wait for event
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const skipForward = () => {
    resetControlsTimer();
    player.seekBy(10);
  };

  const skipBackward = () => {
    resetControlsTimer();
    player.seekBy(-10);
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
          {isBuffering && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {showControls && (
        <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={goBackToPortrait}>
              <Ionicons name="arrow-back" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {movie.is_series ? `Ep. ${movie.episode_number} - ${movie.title}` : movie.title}
            </Text>
            {movie.videoUrl_sd ? (
              <TouchableOpacity style={styles.settingsButton} onPress={() => { player.pause(); setShowQualityModal(true); }}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>

          {/* Center Play/Pause & Skip */}
          <View style={styles.centerControls}>
              <TouchableOpacity style={styles.skipButton} onPress={skipBackward}>
                <MaterialIcons name="replay-10" size={45} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                {!isBuffering && (
                  <Ionicons name={isPlaying ? "pause" : "play"} size={55} color="#fff" style={{ marginLeft: isPlaying ? 0 : 5 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={skipForward}>
                <MaterialIcons name="forward-10" size={45} color="#fff" />
              </TouchableOpacity>
            </View>

          {/* Bottom Bar (Next Episode) */}
          <View style={styles.bottomBar}>
            <View style={{ flex: 1 }} />
            
            {nextEpisode && (
              <TouchableOpacity 
                style={styles.nextEpisodeBtn}
                onPress={() => {
                  resetControlsTimer();
                  navigation.replace('VideoPlayer', { movie: nextEpisode });
                }}
              >
                <Text style={styles.nextEpisodeText}>Next Ep</Text>
                <Ionicons name="play-skip-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      )}

      {/* Quality Selection Modal */}
      <Modal
        visible={showQualityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <TouchableOpacity style={styles.qualityModalOverlay} activeOpacity={1} onPress={() => setShowQualityModal(false)}>
          <View style={styles.qualityModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.qualityModalTitle}>Video Quality</Text>
            
            <TouchableOpacity 
              style={[styles.qualityOption, selectedQuality === 'HD' && styles.qualityOptionActive]}
              onPress={() => changeQuality('HD')}
            >
              <Text style={styles.qualityOptionText}>High Quality (HD)</Text>
              {selectedQuality === 'HD' && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.qualityOption, selectedQuality === 'SD' && styles.qualityOptionActive]}
              onPress={() => changeQuality('SD')}
            >
              <Text style={styles.qualityOptionText}>Standard Quality (Data Saver)</Text>
              {selectedQuality === 'SD' && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 30, // Account for landscape safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  playButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 50,
  },
  skipButton: {
    padding: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  nextEpisodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50,50,50,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  nextEpisodeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipIntroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50,50,50,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E50914',
  },
  skipIntroText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qualityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityModalContent: {
    backgroundColor: '#222',
    width: 300,
    borderRadius: 8,
    padding: 20,
  },
  qualityModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  qualityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  qualityOptionActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  qualityOptionText: {
    color: '#ccc',
    fontSize: 16,
  },
});
