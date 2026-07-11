import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Notifications from 'expo-notifications';
import * as Network from 'expo-network';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import AuthScreen from './src/screens/AuthScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminUploadScreen from './src/screens/AdminUploadScreen';
import HelpScreen from './src/screens/HelpScreen';
import AppSettingsScreen from './src/screens/AppSettingsScreen';
import AccountScreen from './src/screens/AccountScreen';
import TermsScreen from './src/screens/TermsScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import SearchScreen from './src/screens/SearchScreen';
import MyListScreen from './src/screens/MyListScreen';
import { Ionicons } from '@expo/vector-icons';
import { Image, View, Text, Platform, AppState, AppStateStatus, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoNetworkScreen from './src/screens/NoNetworkScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ session }: { session: Session | null }) {
  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#141414', borderTopColor: '#000', height: 60, paddingBottom: 5 },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#8c8c8c',
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchScreen} 
        options={{ 
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen 
        name="MyListTab" 
        component={MyListScreen} 
        options={{ 
          title: 'My List',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen 
        name="DownloadsTab" 
        component={DownloadsScreen} 
        options={{ 
          title: 'Downloads',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 24, 
              height: 24, 
              borderRadius: 4, 
              borderWidth: focused ? 2 : 0, 
              borderColor: '#fff',
              overflow: 'hidden'
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={24} color="#8c8c8c" />
              )}
            </View>
          )
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [bypassNetworkCheck, setBypassNetworkCheck] = useState(false);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permissions not granted');
        }
      }
    };
    requestPermissions();

    // Lock the entire app to Portrait by default so it doesn't rotate everywhere
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && session.user) {
        // Explicitly fetch the fresh user object to guarantee we have the latest user_metadata 
        // (like avatar_url) that might not be instantly populated in the local session cache
        const { data: { user } } = await supabase.auth.getUser();
        
        setSession({
          ...session,
          user: user || session.user
        });
      } else {
        setSession(session);
      }
    });

    // Listen to real-time database changes for push notifications!
    const channel = supabase
      .channel('public:movies')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movies' },
        (payload) => {
          const newMovie = payload.new;
          Notifications.scheduleNotificationAsync({
            content: {
              title: "New Arrival! 🍿",
              body: `${newMovie.title} is now available to watch!`,
              data: { movieId: newMovie.id },
            },
            trigger: null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check active device whenever app comes to foreground or session changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && session?.user) {
        const localDeviceId = await AsyncStorage.getItem('bongoflix_device_id');
        if (!localDeviceId) return;

        const { data, error } = await supabase
          .from('active_devices')
          .select('device_id')
          .eq('user_id', session.user.id)
          .single();

        if (data && data.device_id !== localDeviceId) {
          Alert.alert(
            'Session Expired',
            'Your account was accessed from a new device. You have been logged out of this device.',
            [{ text: 'OK', onPress: () => supabase.auth.signOut() }]
          );
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    if (session?.user) {
      handleAppStateChange('active');
    }

    return () => {
      subscription.remove();
    };
  }, [session?.user?.id]);

  // Network monitoring - check every 3 seconds
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      const currentIsConnected = state.isConnected ?? true;
      setIsConnected(currentIsConnected);
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!isConnected && !bypassNetworkCheck) {
    return (
      <NoNetworkScreen
        onRetry={async () => {
          const state = await Network.getNetworkStateAsync();
          setIsConnected(state.isConnected ?? false);
        }}
        onGoToDownloads={() => {
          setBypassNetworkCheck(true);
          setTimeout(() => {
            navigationRef.current?.navigate('MainTabs', { screen: 'DownloadsTab' });
          }, 300);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: session ? 'green' : 'blue', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold' }}>
        {session ? 'SESSION EXISTS (GREEN)' : 'NO SESSION (BLUE)'}
      </Text>
      <Text style={{ color: 'white', fontSize: 16, marginTop: 20, textAlign: 'center', padding: 20 }}>
        If you see this, NavigationContainer or SafeAreaProvider is 100% the cause of the black screen.
      </Text>
    </View>
  );
}
