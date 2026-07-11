import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HelpScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <Text style={styles.netflixLogo}>BONGOFLIX</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Find help online</Text>
        
        <View style={styles.linksContainer}>
          <TouchableOpacity style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="log-in-outline" size={20} color="#fff" style={styles.linkIcon} />
              <Text style={styles.linkText}>Help Centre</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#8c8c8c" />
          </TouchableOpacity>
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="document-outline" size={20} color="#fff" style={styles.linkIcon} />
              <Text style={styles.linkText}>Privacy Statement</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#8c8c8c" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={styles.linkIcon} />
              <Text style={styles.linkText}>Terms Of Use</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#8c8c8c" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionSpacing} />

        <Text style={styles.sectionTitle}>We're here for you.</Text>
        <Text style={styles.subText}>Already have an account?</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="lock-closed-outline" size={20} color="#fff" style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Recover Password</Text>
        </TouchableOpacity>

        <View style={styles.sectionSpacing} />
        <View style={styles.largeDivider} />
        <View style={styles.sectionSpacing} />

        <Text style={styles.sectionTitle}>Contact Bongoflix{"\n"}Customer Service</Text>
        <Text style={styles.subText}>
          We'll connect the call for free using your internet connection.
        </Text>
        
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="call-outline" size={20} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('mailto:meshackurassa2@gmail.com?subject=Bongo Stream Support')}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>

      </View>
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  netflixLogo: {
    color: '#E50914',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 5,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  linksContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 5,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    marginRight: 15,
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
  },
  sectionSpacing: {
    height: 30,
  },
  subText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  actionIcon: {
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  largeDivider: {
    height: 1,
    backgroundColor: '#333',
    width: '100%',
  },
  contactRow: {
    flexDirection: 'row',
  },
  contactButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 15,
  },
});
