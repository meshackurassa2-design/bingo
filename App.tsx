import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { View, ActivityIndicator } from 'react-native';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom router state
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [currentParams, setCurrentParams] = useState<any>({});

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Supabase getSession error:", err);
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
      <View style={{ flex: 1, backgroundColor: 'blue', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
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
    default:
      return <HomeScreen navigation={navigation} />;
  }
}
