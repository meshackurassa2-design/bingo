import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

const COOL_AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/366be133850498.56ba69ac36858.png',
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png',
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/64623a33850498.56ba69ac2a6f7.png',
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

export default function ProfileSelectionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  const selectAvatar = async (url: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: url }
    });
    
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Force a session refresh so App.tsx detects the new avatar_url and unmounts this screen
    await supabase.auth.refreshSession();
    
    // Fallback if App.tsx doesn't automatically unmount it (e.g. if navigated manually)
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose your profile</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.profilesContainer} showsVerticalScrollIndicator={false}>
          {COOL_AVATARS.map((url, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.profileItem}
              onPress={() => selectAvatar(url)}
            >
              <Image source={{ uri: url }} style={styles.avatar} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  profilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  profileItem: {
    margin: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#333',
  },
});
