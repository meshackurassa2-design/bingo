import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { View, ActivityIndicator } from 'react-native';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import MyListScreen from './src/screens/MyListScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom router state
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [currentParams, setCurrentParams] = useState<any>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  if (!session || !session.user) {
    return <AuthScreen />;
  }

  // Custom navigation object to pass down to screens
  const navigation = {
    navigate: (screenName: string, params: any = {}) => {
      setCurrentScreen(screenName);
      setCurrentParams(params);
    },
    goBack: () => {
      setCurrentScreen('Home');
      setCurrentParams({});
    }
  };

  // Simple state-based router
  switch (currentScreen) {
    case 'Home':
    case 'MainTabs': // fallback for old nav logic
    case 'HomeTab':
      return <HomeScreen navigation={navigation} />;
    case 'MovieDetail':
      return <MovieDetailScreen route={{ params: currentParams }} navigation={navigation} />;
    case 'VideoPlayer':
      return <VideoPlayerScreen route={{ params: currentParams }} navigation={navigation} />;
    case 'CategoryScreen':
      return <CategoryScreen route={{ params: currentParams }} navigation={navigation} />;
    case 'SearchTab':
    case 'Search':
      return <SearchScreen navigation={navigation} />;
    case 'ProfileTab':
    case 'Profile':
      return <ProfileScreen navigation={navigation} session={session} />;
    case 'DownloadsTab':
    case 'Downloads':
      return <DownloadsScreen navigation={navigation} />;
    case 'MyListTab':
    case 'MyList':
      return <MyListScreen navigation={navigation} />;
    default:
      return <HomeScreen navigation={navigation} />;
  }
}
