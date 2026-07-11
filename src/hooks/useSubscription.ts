import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planDetails, setPlanDetails] = useState<any>(null);

  const checkSubscription = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session?.user) {
        setIsSubscribed(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 means no rows found (not subscribed) - this is NOT a network error
        if (error.code === 'PGRST116') {
          setIsSubscribed(false);
          setPlanDetails(null);
          await AsyncStorage.removeItem(`bongoflix_subscription_cache_${session.user.id}`);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        setIsSubscribed(true);
        setPlanDetails(data);
        // Cache for offline playback, scoped to this specific user
        await AsyncStorage.setItem(`bongoflix_subscription_cache_${session.user.id}`, JSON.stringify({
          end_date: data.end_date,
          planDetails: data
        }));
      }
    } catch (e) {
      console.log('Error checking subscription (might be offline):', e);
      // Fallback to offline cache ONLY if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
         setIsSubscribed(false);
         setLoading(false);
         return;
      }

      try {
        const cached = await AsyncStorage.getItem(`bongoflix_subscription_cache_${session.user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (new Date(parsed.end_date) > new Date()) {
            console.log('Using offline subscription cache');
            setIsSubscribed(true);
            setPlanDetails(parsed.planDetails);
          } else {
            setIsSubscribed(false);
          }
        } else {
          setIsSubscribed(false);
        }
      } catch (cacheError) {
        setIsSubscribed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      channel = supabase
        .channel('custom-user-subscriptions-channel')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_subscriptions',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Realtime subscription update detected!', payload);
            checkSubscription();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkSubscription();
    }, [])
  );

  return { isSubscribed, loading, planDetails, checkSubscription };
}
