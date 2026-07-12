import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export default function AppSettingsScreen({ navigation }: any) {
  const [smartDownloads, setSmartDownloads] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saveData, setSaveData] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState<'Standard' | 'High'>('Standard');

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const smart = await AsyncStorage.getItem('bongoflix_smart_downloads');
      if (smart !== null) setSmartDownloads(JSON.parse(smart));

      const wifi = await AsyncStorage.getItem('bongoflix_wifi_only');
      if (wifi !== null) setWifiOnly(JSON.parse(wifi));

      const notifs = await AsyncStorage.getItem('bongoflix_notifications');
      if (notifs !== null) setNotifications(JSON.parse(notifs));

      const dataUsage = await AsyncStorage.getItem('bongoflix_save_data');
      if (dataUsage !== null) setSaveData(JSON.parse(dataUsage));

      const quality = await AsyncStorage.getItem('bongoflix_download_quality');
      if (quality !== null) setDownloadQuality(quality as 'Standard' | 'High');
    } catch (e) {}
  };

  const toggleSmartDownloads = async (val: boolean) => {
    setSmartDownloads(val);
    await AsyncStorage.setItem('bongoflix_smart_downloads', JSON.stringify(val));
  };

  const toggleWifiOnly = async (val: boolean) => {
    setWifiOnly(val);
    await AsyncStorage.setItem('bongoflix_wifi_only', JSON.stringify(val));
  };

  const toggleNotifications = async (val: boolean) => {
    setNotifications(val);
    await AsyncStorage.setItem('bongoflix_notifications', JSON.stringify(val));
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in your phone settings.');
        setNotifications(false);
        await AsyncStorage.setItem('bongoflix_notifications', JSON.stringify(false));
      }
    }
  };

  const handleDataUsagePress = () => {
    Alert.alert('Cellular Data Usage', 'Choose your data usage preference for streaming off Wi-Fi:', [
      { text: 'Automatic (Max Quality)', onPress: async () => { setSaveData(false); await AsyncStorage.setItem('bongoflix_save_data', 'false'); } },
      { text: 'Save Data (Standard Quality)', onPress: async () => { setSaveData(true); await AsyncStorage.setItem('bongoflix_save_data', 'true'); } },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleQualityPress = () => {
    Alert.alert('Download Video Quality', 'Choose default quality for downloads:', [
      { text: 'Standard (Faster, less storage)', onPress: async () => { setDownloadQuality('Standard'); await AsyncStorage.setItem('bongoflix_download_quality', 'Standard'); } },
      { text: 'High (Uses more storage)', onPress: async () => { setDownloadQuality('High'); await AsyncStorage.setItem('bongoflix_download_quality', 'High'); } },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleDeleteAllDownloads = () => {
    Alert.alert(
      "Delete All Downloads",
      "Are you sure you want to delete all downloaded movies and shows? This will free up storage space on your device.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.user) return;
              
              const stored = await AsyncStorage.getItem(`bongoflix_downloads_${session.user.id}`);
              if (stored) {
                const downloads = JSON.parse(stored);
                for (const movie of downloads) {
                  if (movie.videoUrl.startsWith('file://')) {
                    await FileSystem.deleteAsync(movie.videoUrl, { idempotent: true });
                  }
                }
              }
              await AsyncStorage.removeItem(`bongoflix_downloads_${session.user.id}`);
              Alert.alert('Success', 'All downloads have been deleted.');
            } catch (error) {
              console.error('Failed to delete all', error);
              Alert.alert('Error', 'Failed to delete some downloads.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionHeader}>Video Playback</Text>
        
        <TouchableOpacity style={styles.settingRow} onPress={handleDataUsagePress}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Cellular Data Usage</Text>
            <Text style={styles.settingSubtext}>{saveData ? 'Save Data' : 'Automatic'}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Downloads</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Wi-Fi Only</Text>
          </View>
          <Switch 
            value={wifiOnly}
            onValueChange={toggleWifiOnly}
            trackColor={{ false: '#333', true: '#E50914' }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Smart Downloads</Text>
            <Text style={styles.settingSubtext}>Completed episodes will be deleted and replaced with the next episodes.</Text>
          </View>
          <Switch 
            value={smartDownloads}
            onValueChange={toggleSmartDownloads}
            trackColor={{ false: '#333', true: '#E50914' }}
          />
        </View>

        <TouchableOpacity style={styles.settingRow} onPress={handleQualityPress}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Download Video Quality</Text>
            <Text style={styles.settingSubtext}>{downloadQuality}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Notifications</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Allow Notifications</Text>
          </View>
          <Switch 
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#333', true: '#E50914' }}
          />
        </View>

        <View style={styles.sectionHeaderSpacing} />
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAllDownloads}>
          <Ionicons name="trash-outline" size={20} color="#E50914" style={{ marginRight: 10 }} />
          <Text style={styles.dangerText}>Delete All Downloads</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#000',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    color: '#8c8c8c',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginLeft: 15,
    marginTop: 25,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
  },
  settingSubtext: {
    color: '#8c8c8c',
    fontSize: 14,
    marginTop: 5,
  },
  sectionHeaderSpacing: {
    height: 30,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginHorizontal: 15,
    backgroundColor: '#141414',
    borderRadius: 5,
    marginBottom: 40,
  },
  dangerText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
