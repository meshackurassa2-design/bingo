import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Linking, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const { isSubscribed, planDetails } = useSubscription();

  const [requestTitle, setRequestTitle] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const COOL_AVATARS = [
    // Original Classic Avatars
    'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/366be133850498.56ba69ac36858.png',
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png',
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/64623a33850498.56ba69ac2a6f7.png',
    
    // Diverse Classic Avatars
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/c7906d33850498.56ba69ac353e1.png',
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/bb3a8833850498.56ba69ac33f26.png',
    'https://flagcdn.com/w320/tz.png',
    'https://mir-s3-cdn-cf.behance.net/project_modules/disp/e70b1333850498.56ba69ac32ae3.png',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Movie&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Popcorn&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/bottts/png?seed=Robot&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/bottts/png?seed=Stream&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/fun-emoji/png?seed=Happy&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/fun-emoji/png?seed=Cool&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/notionists/png?seed=Bongo&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/notionists/png?seed=Felix&backgroundColor=c0aede',
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    if (user?.id) {
      await supabase.from('active_devices').delete().eq('user_id', user.id);
    }
    await supabase.auth.signOut();
  };

  const updateAvatar = async (avatarUrl: string) => {
    setUpdatingAvatar(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    });
    
    if (error) {
      Alert.alert("Error", "Could not update profile picture.");
    } else {
      setUser(data.user);
      setShowAvatarModal(false);
    }
    setUpdatingAvatar(false);
  };

  const handleRequestMovie = async () => {
    if (!isSubscribed) {
      Alert.alert('Premium Feature', 'Only Premium members can request movies. Please upgrade your plan in the Account tab.');
      return;
    }
    
    if (!requestTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a movie or show name to request.');
      return;
    }
    
    setIsRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'You must be logged in.');
        return;
      }
      
      const { error } = await supabase.from('movie_requests').insert({
        user_id: session.user.id,
        user_email: session.user.email,
        title: requestTitle.trim(),
      });
      
      if (error) throw error;
      
      Alert.alert('Request Sent!', `We have received your request for "${requestTitle.trim()}". We will try to add it soon!`);
      setRequestTitle('');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to send request. Ensure the database table is created.');
      console.log(e);
    } finally {
      setIsRequesting(false);
    }
  };

  const menuItems = [
    { title: 'App Settings', icon: 'settings-outline', onPress: () => navigation.navigate('AppSettingsScreen') },
    { title: 'Account', icon: 'person-outline', onPress: () => navigation.navigate('AccountScreen') },
    { title: 'Help', icon: 'help-circle-outline', onPress: () => Linking.openURL('mailto:meshackurassa2@gmail.com?subject=Bongo Stream Support') },
    { title: 'Terms and Conditions', icon: 'document-text-outline', onPress: () => navigation.navigate('TermsScreen') },
    { title: 'Sign Out', icon: 'log-out-outline', onPress: handleSignOut },
  ];

  if (user?.email === 'meshackurassa2@gmail.com') {
    menuItems.unshift({ 
      title: 'Admin Dashboard', 
      icon: 'shield-checkmark-outline',
      onPress: () => navigation.navigate('AdminUpload')
    });
  }

  let daysLeft = 0;
  if (isSubscribed && planDetails?.end_date) {
    const end = new Date(planDetails.end_date);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profiles</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Main Profile */}
        <View style={styles.mainProfileContainer}>
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.mainAvatar} />
          ) : (
            <View style={[styles.mainAvatar, { backgroundColor: '#333' }]} />
          )}
          <Text style={styles.mainUsername}>
            {user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}
          </Text>
        </View>

        <TouchableOpacity style={styles.manageButton} onPress={() => setShowAvatarModal(true)}>
          <Text style={styles.manageButtonText}>Manage Profile Image</Text>
        </TouchableOpacity>

        {/* Subscription Status Block */}
        <View style={styles.subscriptionContainer}>
          <View style={styles.subHeader}>
            <Ionicons name="card" size={24} color="#fff" />
            <Text style={styles.subTitle}>Subscription Plan</Text>
          </View>
          {isSubscribed ? (
            <View style={styles.activeSubCard}>
              <View style={styles.activeSubHeader}>
                <Text style={styles.activeSubText}>BongoFlix Premium</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.planText}>Plan: {planDetails?.plan_tier.replace('_', ' ')}</Text>
              <Text style={styles.planDate}>Renews on: {new Date(planDetails?.end_date).toLocaleDateString()}</Text>
            </View>
          ) : (
            <View style={styles.inactiveSubCard}>
              <Text style={styles.inactiveSubText}>You are currently on the Free plan.</Text>
              <Text style={styles.inactiveSubSubtext}>Subscribe to unlock unlimited movies and downloads.</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.manageSubButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.manageSubButtonText}>
              {isSubscribed ? `${daysLeft} Days Remaining` : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Request Movie Block */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={styles.requestContainer}>
            <Text style={styles.requestHeader}>Can't find a movie? Request it!</Text>
            <View style={styles.requestInputRow}>
              <TextInput
                style={styles.requestInput}
                placeholder="Enter movie or show name..."
                placeholderTextColor="#8c8c8c"
                value={requestTitle}
                onChangeText={setRequestTitle}
              />
              <TouchableOpacity 
                style={[styles.requestBtn, (!requestTitle.trim() || isRequesting) && { opacity: 0.5 }]} 
                onPress={handleRequestMovie}
                disabled={!requestTitle.trim() || isRequesting}
              >
                {isRequesting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.requestBtnText}>Request</Text>
                )}
              </TouchableOpacity>
            </View>
            {!isSubscribed && (
              <View style={styles.upsellContainer}>
                <Ionicons name="star" size={14} color="#E50914" />
                <Text style={styles.upsellText}>Premium members only</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem} 
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color="#8c8c8c" style={styles.menuIcon} />
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8c8c8c" />
            </TouchableOpacity>
          ))}
          <Text style={styles.versionText}>Version: 1.1</Text>
          <Text style={[styles.versionText, { marginTop: 2 }]}>Developer: Dapaz Company</Text>
        </View>
      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal visible={showAvatarModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Image</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {updatingAvatar ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Updating...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
                {COOL_AVATARS.map((url, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.avatarOption}
                    onPress={() => updateAvatar(url)}
                  >
                    <Image source={{ uri: url }} style={styles.avatarOptionImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
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
    alignItems: 'center',
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainProfileContainer: {
    alignItems: 'center',
    marginTop: 20,
    position: 'relative',
  },
  mainAvatar: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  mainUsername: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  manageButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 40,
    marginTop: 20,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscriptionContainer: {
    backgroundColor: '#111',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  subTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  activeSubCard: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  activeSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeSubText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planText: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  planDate: {
    color: '#8c8c8c',
    fontSize: 12,
  },
  inactiveSubCard: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: '#E50914',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  inactiveSubText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  inactiveSubSubtext: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  manageSubButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  manageSubButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  versionText: {
    color: '#8c8c8c',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  avatarOption: {
    margin: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
  },
  avatarOptionImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  requestContainer: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  requestInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  requestBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  upsellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  upsellText: {
    color: '#b3b3b3',
    fontSize: 12,
    marginLeft: 4,
  }
});
