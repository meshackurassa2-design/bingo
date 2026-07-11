import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, TouchableWithoutFeedback, Animated, Modal, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Movie } from '../types';
import { supabase } from '../lib/supabase';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../hooks/useSubscription';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Network from 'expo-network';

export default function MovieDetailScreen({ route, navigation }: any) {
  usePreventScreenCapture();
  const { movie } = route.params as { movie: Movie };
  const [episodes, setEpisodes] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'episodes'|'moreLikeThis'|'trailers'>(movie.is_series ? 'episodes' : 'moreLikeThis');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
  const [isInMyList, setIsInMyList] = useState(false);
  const [userRating, setUserRating] = useState<'dislike' | 'like' | 'love' | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  
  // Video Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [ageRatingModalVisible, setAgeRatingModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }, [])
  );

  const localVideoUriRef = useRef(localVideoUri);
  localVideoUriRef.current = localVideoUri;

  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  const player = useVideoPlayer(movie.videoUrl, (player) => {
    player.loop = true;
    player.muted = true;
    player.timeUpdateEventInterval = 0.25;
    // Don't auto-play if not subscribed
    if (isSubscribed) {
      player.play();
    }
  });

  useEffect(() => {
    const canPlay = isSubscribed || movie.is_free;

    if (canPlay && !player.playing) {
      player.play();
    } else if (!canPlay && player.playing) {
      player.pause();
    }
  }, [isSubscribed, player, movie]);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        setIsBuffering(false);
      } else if (payload.status === 'loading') {
        setIsBuffering(true);
      }
    });

    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(payload.isPlaying);
    });

    const timeSub = player.addListener('timeUpdate', (payload) => {
      if (player.duration > 0) {
        setProgress((payload.currentTime / player.duration) * 100);
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      setHasEnded(true);
      setProgress(100);
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [player]);

  useEffect(() => {
    checkAdmin();
    checkIfDownloaded();
    checkIfInMyList();
    loadRating();
    if (movie.is_series && movie.series_name) {
      fetchEpisodes();
    }
  }, [movie, hasEnded]);

  const checkIfDownloaded = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const stored = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
      let found = false;
      if (stored) {
        const downloads: Movie[] = JSON.parse(stored);
        const movieFound = downloads.find((m: Movie) => m.id === movie.id);
        if (movieFound) {
          found = true;
          setIsDownloaded(true);
          setLocalVideoUri(movieFound.videoUrl); // Offline local URI
          player.replace(movieFound.videoUrl); // Force player to use the local file immediately
        }
      }
      
      // Apply Save Data mode if streaming off Wi-Fi
      if (!found && movie.videoUrl_sd) {
        const saveSetting = await AsyncStorage.getItem('bongoflix_save_data');
        if (saveSetting === 'true') {
          const netState = await Network.getNetworkStateAsync();
          if (netState.type === Network.NetworkStateType.CELLULAR) {
            player.replace(movie.videoUrl_sd);
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleDownload = async () => {
    if (!isSubscribed && !movie.is_free) {
      navigation.navigate('Subscription');
      return;
    }

    if (isDownloaded) {
      Alert.alert('Already Downloaded', 'You have already downloaded this movie.');
      return;
    }
    
    // Check Wi-Fi Only setting
    const wifiSetting = await AsyncStorage.getItem('bongoflix_wifi_only');
    const isWifiOnly = wifiSetting !== null ? JSON.parse(wifiSetting) : true;
    
    if (isWifiOnly) {
      const netState = await Network.getNetworkStateAsync();
      if (netState.type !== Network.NetworkStateType.WIFI) {
        Alert.alert('Wi-Fi Required', 'Your settings require Wi-Fi to download movies. Connect to Wi-Fi or change this in App Settings.');
        return;
      }
    }

    // --- 2GB Hard Limit Check ---
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const stored = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
      if (stored) {
        const downloads: Movie[] = JSON.parse(stored);
        let totalBytes = 0;
        for (const m of downloads) {
          if (m.videoUrl.startsWith('file://')) {
            const info = await FileSystem.getInfoAsync(m.videoUrl);
            if (info.exists) {
              totalBytes += info.size || 0;
            }
          }
        }
        
        // 2GB in bytes
        const TWO_GB = 2 * 1024 * 1024 * 1024;
        if (totalBytes >= TWO_GB) {
          Alert.alert(
            'Storage Limit Reached', 
            'BongoFlix is limited to 2GB of downloads to protect your phone storage. Please delete some older movies to download new ones.'
          );
          return;
        }
      }
    } catch (e) {
      console.log('Error checking storage limit', e);
    }
    // -----------------------------
    
    if (!movie.videoUrl_sd) {
      startDownload(movie.videoUrl, 'HD');
      return;
    }

    // Check Global Quality Setting
    const qualitySetting = await AsyncStorage.getItem('bongoflix_download_quality');
    if (qualitySetting === 'Standard') {
      startDownload(movie.videoUrl_sd, 'SD');
      return;
    } else if (qualitySetting === 'High') {
      startDownload(movie.videoUrl, 'HD');
      return;
    }
    
    Alert.alert(
      'Download Quality',
      'Choose the video quality for your download:',
      [
        { text: 'Standard Quality (Data Saver)', onPress: () => startDownload(movie.videoUrl_sd!, 'SD') },
        { text: 'High Quality (HD)', onPress: () => startDownload(movie.videoUrl, 'HD') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const startDownload = async (urlToDownload: string, quality: 'HD' | 'SD') => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const fileName = `${movie.id}_${quality}.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        urlToDownload,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(Math.floor(progress * 100));
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // Save to offline storage
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const stored = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
        let downloads: Movie[] = stored ? JSON.parse(stored) : [];
        
        const offlineMovie = { ...movie, videoUrl: result.uri, downloadQuality: quality };
        downloads.push(offlineMovie);
        
        await AsyncStorage.setItem(`bongoflix_downloads_${session.user.id}`, JSON.stringify(downloads));
        
        setIsDownloaded(true);
        setLocalVideoUri(result.uri);
        Alert.alert('Download Complete', 'You can now watch this movie offline.');
      }
    } catch (e: any) {
      Alert.alert('Download Failed', e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'meshackurassa2@gmail.com') {
      setIsAdmin(true);
    }
  };

  const checkIfInMyList = async () => {
    const stored = await AsyncStorage.getItem('bongoflix_mylist');
    const list: Movie[] = stored ? JSON.parse(stored) : [];
    setIsInMyList(list.some(m => m.id === movie.id));
  };

  const loadRating = async () => {
    const stored = await AsyncStorage.getItem(`bongoflix_rating_${movie.id}`);
    if (stored) setUserRating(stored as any);
  };

  const saveRating = async (rating: 'dislike' | 'like' | 'love') => {
    const isUndo = userRating === rating;
    setShowRatingModal(false);

    if (isUndo) {
      setUserRating(null);
      await AsyncStorage.removeItem(`bongoflix_rating_${movie.id}`);
      showToast('Rating removed');
      return;
    }

    setUserRating(rating);
    await AsyncStorage.setItem(`bongoflix_rating_${movie.id}`, rating);

    if (rating === 'dislike') {
      // Hide this movie from home screen
      const stored = await AsyncStorage.getItem('bongoflix_hidden');
      const hidden: string[] = stored ? JSON.parse(stored) : [];
      if (!hidden.includes(movie.id)) {
        hidden.push(movie.id);
        await AsyncStorage.setItem('bongoflix_hidden', JSON.stringify(hidden));
      }
      showToast('We\'ll show you less like this');
      // Go back after a short delay so user sees it
      setTimeout(() => navigation.goBack(), 1500);
    } else if (rating === 'like') {
      showToast('Great! We\'ll recommend more like this');
    } else if (rating === 'love') {
      // Auto-add to My List if not already there
      if (!isInMyList) {
        const stored = await AsyncStorage.getItem('bongoflix_mylist');
        let list: Movie[] = stored ? JSON.parse(stored) : [];
        list.push(movie);
        await AsyncStorage.setItem('bongoflix_mylist', JSON.stringify(list));
        setIsInMyList(true);
        showToast('Added to My List ❤️');
      } else {
        showToast('You love it! ❤️');
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const toggleMyList = async () => {
    const stored = await AsyncStorage.getItem('bongoflix_mylist');
    let list: Movie[] = stored ? JSON.parse(stored) : [];
    if (isInMyList) {
      list = list.filter(m => m.id !== movie.id);
      setIsInMyList(false);
    } else {
      list.push(movie);
      setIsInMyList(true);
    }
    await AsyncStorage.setItem('bongoflix_mylist', JSON.stringify(list));
  };

  const fetchEpisodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('series_name', movie.series_name)
      .order('episode_number', { ascending: true });

    if (!error && data) {
      setEpisodes(data as Movie[]);
    }
    setLoading(false);
  };

  const toggleMute = () => {
    player.muted = !player.muted;
    setIsMuted(player.muted);
  };

  const replayVideo = () => {
    setHasEnded(false);
    player.seekBy(-9999); // reset to start
    player.play();
  };
  
  const togglePlayPause = () => {
    if (!isSubscribed && !movie.is_free) {
      navigation.navigate('Subscription');
      return;
    }
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const saveProgress = async () => {
    try {
      if (!player) return;
      const current = player.currentTime;
      const total = player.duration;
      
      // Only save if they watched at least 2 seconds
      if (total <= 0 || current < 2) return;
      
      const percent = current / total;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const stored = await AsyncStorage.getItem(`bongoflix_continue_watching_${session.user.id}`);
      let progressDict = stored ? JSON.parse(stored) : {};
      
      if (percent > 0.95) {
        delete progressDict[movie.id];
        
        // --- Smart Downloads Engine ---
        if (isDownloaded) {
          const smartVal = await AsyncStorage.getItem('bongoflix_smart_downloads');
          const isSmart = smartVal !== null ? JSON.parse(smartVal) : true;
          
          if (isSmart) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const storedDls = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
            if (storedDls) {
              const downloads: Movie[] = JSON.parse(storedDls);
              const found = downloads.find(m => m.id === movie.id);
              if (found && found.videoUrl.startsWith('file://')) {
                await FileSystem.deleteAsync(found.videoUrl, { idempotent: true });
                const updated = downloads.filter(m => m.id !== movie.id);
                await AsyncStorage.setItem(`bongoflix_downloads_${session.user.id}`, JSON.stringify(updated));
                console.log('Smart Downloads: Auto-deleted watched movie.');
              }
            }
          }
        }
      } else {
        progressDict[movie.id] = {
          progress: current,
          duration: total,
          movieData: movie,
          timestamp: Date.now()
        };
      }
      
      await AsyncStorage.setItem(`bongoflix_continue_watching_${session.user.id}`, JSON.stringify(progressDict));
    } catch (e) {
      console.log('Error saving progress', e);
    }
  };

  const handleGoBack = async () => {
    player.pause();
    await saveProgress();
    navigation.goBack();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      saveProgress();
    });
    return unsubscribe;
  }, [navigation, player]);

  // --- Data for UI ---
  const displayYear = movie.release_year || "2024";
  const displayRating = movie.age_rating || (movie.is_series ? "18+" : "16+");
  const displayDuration = movie.duration || (movie.is_series ? `${episodes.length || 1} Episodes` : "2h 14m");
  const displayCast = movie.cast_names || "Unknown Cast";
  const displayDirector = movie.director_name || "Unknown Director";

  const renderEpisodeItem = ({ item }: { item: Movie }) => {
    const isCurrent = item.id === movie.id;
    return (
      <TouchableOpacity 
        style={styles.episodeRow}
        onPress={() => navigation.replace('MovieDetail', { movie: item })}
      >
        <Image source={{ uri: item.thumbnailUrl }} style={styles.episodeThumbnail} />
        <View style={styles.episodeInfo}>
          <Text style={[styles.episodeTitle, isCurrent && styles.episodeTitleActive]}>
            {item.episode_number ? `${item.episode_number}. Episode ${item.episode_number}` : item.title}
          </Text>
          <Text style={styles.episodeDuration}>45m</Text>
        </View>
        <Ionicons name="download-outline" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Top Embedded Video Player */}
      <TouchableWithoutFeedback onPress={() => setShowControls(!showControls)}>
        <View style={styles.videoContainer}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
          
          {/* Top Left Back Button */}
          {showControls && (
            <TouchableOpacity style={styles.topBackButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          
          {/* Buffering Indicator */}
          {isBuffering && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          )}

          {/* Conditional Center Overlay */}
          {hasEnded ? (
            <TouchableOpacity style={styles.centerAction} onPress={replayVideo}>
              <Ionicons name="refresh" size={50} color="#fff" />
              <Text style={styles.centerActionText}>Replay</Text>
            </TouchableOpacity>
          ) : (!isBuffering && showControls) ? (
            <TouchableOpacity style={styles.centerAction} onPress={togglePlayPause}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={50} color="#fff" />
            </TouchableOpacity>
          ) : null}

          {/* Bottom Right Mute & Fullscreen Buttons */}
          {(!hasEnded && showControls) && (
            <View style={styles.bottomRightControls}>
              <TouchableOpacity style={styles.controlCircle} onPress={toggleMute}>
                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlCircle} 
                onPress={() => {
                  if (!isSubscribed && !movie.is_free) {
                    navigation.navigate('Subscription');
                    return;
                  }
                  player.pause();
                  navigation.navigate('VideoPlayer', { 
                    movie: { ...movie, videoUrl: localVideoUri || movie.videoUrl }, 
                    initialTime: player.currentTime,
                  });
                }}
              >
                <Ionicons name="expand" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Mock Red Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </TouchableWithoutFeedback>

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.netflixBadge}>BONGOFLIX</Text>
        <Text style={styles.title}>{movie.title}</Text>
        
        {/* Metadata Row */}
        <View style={styles.metadataRow}>
          <Text style={styles.metaText}>{displayYear}</Text>
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{displayRating}</Text>
          </View>
          <Text style={styles.metaText}>{displayDuration}</Text>
          {movie.is_hd !== false && (
            <View style={styles.hdBadge}>
              <Text style={styles.hdBadgeText}>HD</Text>
            </View>
          )}
          {movie.has_subtitles !== false && (
            <MaterialIcons name="subtitles" size={20} color="#8c8c8c" style={{ marginLeft: 5 }} />
          )}
        </View>

        {/* Big Play Button (Navigates to full screen player) */}
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => {
            if (!isSubscribed && !movie.is_free) {
              navigation.navigate('Subscription');
              return;
            }
            player.pause();
            navigation.navigate('VideoPlayer', { movie: { ...movie, videoUrl: localVideoUri || movie.videoUrl }, initialTime: player.currentTime });
          }}
        >
          {subscriptionLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (!isSubscribed && !movie.is_free) ? (
            <>
              <Ionicons name="lock-closed" size={20} color="#000" style={{ marginRight: 5 }} />
              <Text style={styles.playButtonText}>Subscribe to Play</Text>
            </>
          ) : (
            <>
              <Ionicons name="play" size={24} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Download Button */}
        <TouchableOpacity 
          style={[styles.downloadButton, isDownloaded && { backgroundColor: '#111' }]} 
          onPress={handleDownload}
          disabled={isDownloading || isDownloaded}
        >
          {isDownloading ? (
            <Text style={styles.downloadButtonText}>Downloading... {downloadProgress}%</Text>
          ) : isDownloaded ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Downloaded</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Download</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.description}>
          {movie.description || 'When a powerful enemy threatens to destroy their world, a group of unlikely heroes must band together to stop them.'}
        </Text>

        <Text style={styles.castText}>
          <Text style={{ color: '#8c8c8c' }}>Cast: </Text>
          {displayCast}
        </Text>
        <Text style={styles.castText}>
          <Text style={{ color: '#8c8c8c' }}>Director: </Text>
          {displayDirector}
        </Text>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={toggleMyList}>
            <Ionicons 
              name={isInMyList ? "checkmark" : "add"} 
              size={28} 
              color={isInMyList ? "#E50914" : "#fff"} 
            />
            <Text style={[styles.actionText, isInMyList && { color: '#E50914' }]}>My List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowRatingModal(true)}>
            <Ionicons 
              name={
                userRating === 'love' ? 'heart' :
                userRating === 'like' ? 'thumbs-up' :
                userRating === 'dislike' ? 'thumbs-down' :
                'thumbs-up-outline'
              } 
              size={24} 
              color={userRating ? '#E50914' : '#fff'} 
            />
            <Text style={[styles.actionText, userRating && { color: '#E50914' }]}>Rate</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('AdminUpload', { editMovie: movie })}
            >
              <Ionicons name="create-outline" size={24} color="#E50914" />
              <Text style={[styles.actionText, { color: '#E50914' }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {movie.is_series && (
            <TouchableOpacity onPress={() => setActiveTab('episodes')}>
              <Text style={[styles.tabText, activeTab === 'episodes' && styles.tabTextActive]}>Episodes</Text>
              {activeTab === 'episodes' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setActiveTab('moreLikeThis')}>
            <Text style={[styles.tabText, activeTab === 'moreLikeThis' && styles.tabTextActive]}>More Like This</Text>
            {activeTab === 'moreLikeThis' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('trailers')}>
            <Text style={[styles.tabText, activeTab === 'trailers' && styles.tabTextActive]}>Trailers & More</Text>
            {activeTab === 'trailers' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'episodes' && movie.is_series && (
          <View style={styles.episodesContainer}>
            <View style={styles.episodesHeaderRow}>
              <Text style={styles.seasonText}>{movie.title}</Text>
              <TouchableOpacity onPress={() => setAgeRatingModalVisible(true)}>
                <Ionicons name="information-circle-outline" size={24} color="#8c8c8c" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <ActivityIndicator color="#E50914" style={{ marginTop: 20 }} />
            ) : (
              <FlatList 
                data={episodes}
                renderItem={renderEpisodeItem}
                keyExtractor={item => item.id}
                scrollEnabled={false} 
              />
            )}
          </View>
        )}

        {(activeTab === 'moreLikeThis' || activeTab === 'trailers') && (
          <View style={styles.emptyTab}>
            <Text style={styles.emptyTabText}>Nothing here yet.</Text>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowRatingModal(false)}>
          <View style={styles.ratingOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.ratingSheet}>
                <Text style={styles.ratingTitle}>Rate This Title</Text>
                <View style={styles.ratingButtons}>
                  <TouchableOpacity style={styles.ratingOption} onPress={() => saveRating('dislike')}>
                    <View style={[styles.ratingCircle, userRating === 'dislike' && styles.ratingCircleActive]}>
                      <Ionicons name="thumbs-down" size={32} color={userRating === 'dislike' ? '#fff' : '#ccc'} />
                    </View>
                    <Text style={styles.ratingLabel}>Not for me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.ratingOption} onPress={() => saveRating('like')}>
                    <View style={[styles.ratingCircle, userRating === 'like' && styles.ratingCircleActive]}>
                      <Ionicons name="thumbs-up" size={32} color={userRating === 'like' ? '#fff' : '#ccc'} />
                    </View>
                    <Text style={styles.ratingLabel}>I like this</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.ratingOption} onPress={() => saveRating('love')}>
                    <View style={[styles.ratingCircle, userRating === 'love' && styles.ratingCircleActive]}>
                      <Text style={{ fontSize: 30 }}>💯</Text>
                    </View>
                    <Text style={styles.ratingLabel}>Love it!</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Toast Notification */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* Age Rating Modal */}
      <Modal
        visible={ageRatingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAgeRatingModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setAgeRatingModalVisible(false)}
        >
          <View style={styles.ageRatingModalContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity 
              style={styles.ageRatingCloseButton}
              onPress={() => setAgeRatingModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <Text style={styles.ageRatingTitle}>{movie.is_series ? 'Limited Series' : 'Movie'}</Text>
            <Text style={styles.ageRatingSubtitle}>Age Rating</Text>
            
            <View style={styles.ageRatingBadge}>
              <Text style={styles.ageRatingBadgeText}>{movie.age_rating || '16+'}</Text>
            </View>
            
            <Text style={styles.ageRatingWarnings}>
              {movie.content_warnings || 'violence, substances, suicide'}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: 230,
    backgroundColor: '#000',
    position: 'relative',
  },
  topBackButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  topRightActions: {
    position: 'absolute',
    top: 40,
    right: 15,
    flexDirection: 'row',
  },
  iconCircle: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  centerAction: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -35 }, { translateY: -35 }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bottomRightControls: {
    position: 'absolute',
    bottom: 20,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlCircle: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  scrollContent: {
    flex: 1,
  },
  netflixBadge: {
    color: '#E50914',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 12,
    marginTop: 10,
    marginLeft: 15,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 5,
    marginLeft: 15,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 15,
    marginBottom: 15,
  },
  metaText: {
    color: '#8c8c8c',
    fontSize: 14,
    marginRight: 10,
  },
  ageBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 10,
  },
  ageBadgeText: {
    color: '#8c8c8c',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hdBadge: {
    borderWidth: 1,
    borderColor: '#8c8c8c',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 10,
  },
  hdBadgeText: {
    color: '#8c8c8c',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  downloadButton: {
    backgroundColor: '#2b2b2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  castText: {
    color: '#8c8c8c',
    fontSize: 13,
    marginHorizontal: 15,
    marginBottom: 3,
  },
  castSubtext: {
    color: '#b3b3b3',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    marginRight: 40,
  },
  actionText: {
    color: '#8c8c8c',
    fontSize: 12,
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 15,
    paddingTop: 15,
    marginBottom: 15,
  },
  tabText: {
    color: '#8c8c8c',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 25,
    paddingBottom: 10,
  },
  tabTextActive: {
    color: '#fff',
  },
  activeTabIndicator: {
    height: 4,
    backgroundColor: '#E50914',
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 25,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  episodesContainer: {
    paddingHorizontal: 15,
  },
  episodesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  seasonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  ageRatingModalContent: {
    backgroundColor: '#2b2b2b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  ageRatingCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageRatingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  ageRatingSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  ageRatingBadge: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 24,
  },
  ageRatingBadgeText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ageRatingWarnings: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  episodeThumbnail: {
    width: 130,
    height: 75,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  episodeInfo: {
    flex: 1,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  episodeTitleActive: {
    color: '#fff',
  },
  episodeDuration: {
    color: '#8c8c8c',
    fontSize: 13,
  },
  emptyTab: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTabText: {
    color: '#8c8c8c',
    fontSize: 16,
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  ratingSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  ratingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  ratingOption: {
    alignItems: 'center',
    gap: 10,
  },
  ratingCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingCircleActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  ratingLabel: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

