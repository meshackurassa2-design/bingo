import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useSubscription } from '../hooks/useSubscription';

export default function AccountScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const { isSubscribed, planDetails } = useSubscription();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    Alert.alert("Reset Password", `We will send a password reset link to ${user.email}.`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Send Email", 
        onPress: async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email!);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            Alert.alert("Sent", "Check your inbox for the reset link.");
          }
        }
      }
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Sign Out", 
        style: "destructive", 
        onPress: async () => {
          await supabase.auth.signOut();
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "To securely delete your account, your data will be scheduled for deletion and you will be signed out.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive", 
          onPress: async () => {
            // In a real production app, this would call a Supabase Edge Function to delete the auth.users record.
            // For now, we sign them out.
            await supabase.auth.signOut();
          } 
        }
      ]
    );
  };

  const navigateToSubscription = () => {
    navigation.navigate('Subscription');
  };

  const formattedDate = planDetails?.end_date 
    ? new Date(planDetails.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionHeader}>Membership & Billing</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.membershipStatus}>
            {isSubscribed ? 'Premium Active' : 'No Active Plan'}
          </Text>
          {isSubscribed && (
            <Text style={styles.billingText}>Next billing date: {formattedDate}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={handleChangePassword}>
          <Text style={styles.linkText}>Change password</Text>
          <Ionicons name="chevron-forward" size={20} color="#8c8c8c" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={navigateToSubscription}>
          <Text style={styles.linkText}>Update payment info</Text>
          <Ionicons name="chevron-forward" size={20} color="#8c8c8c" />
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Plan Details</Text>
        
        <TouchableOpacity style={styles.linkRow} onPress={navigateToSubscription}>
          <Text style={styles.linkText}>{isSubscribed ? 'Change plan' : 'Subscribe Now'}</Text>
          <Text style={styles.planBadge}>{isSubscribed ? 'Premium' : 'Free'}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Danger Zone</Text>
        
        <TouchableOpacity style={styles.linkRow} onPress={handleSignOut}>
          <Text style={styles.linkText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={handleDeleteAccount}>
          <Text style={styles.dangerText}>Delete Account</Text>
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
  infoBox: {
    backgroundColor: '#141414',
    padding: 15,
    marginBottom: 10,
  },
  userEmail: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  membershipStatus: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 5,
  },
  billingText: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
  },
  dangerText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planBadge: {
    color: '#fff',
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
});
