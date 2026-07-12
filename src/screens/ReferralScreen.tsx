import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, ScrollView, Modal, TextInput, Alert, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as Clipboard from 'expo-clipboard';

export default function ReferralScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('Tigo Pesa');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, wallet_balance')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setReferralCode(data.referral_code || '');
        setWalletBalance(data.wallet_balance || 0);
      }

      const { data: historyData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (historyData) {
        setWithdrawalHistory(historyData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Bongoflix to watch amazing movies! Use my referral code: ${referralCode} when signing up.`,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (!referralCode) {
        Alert.alert('No Code', 'You do not have a referral code yet.');
        return;
      }
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to copy: ' + error.message);
    }
  };

  const handleWithdraw = async () => {
    if (walletBalance < 500) {
      Alert.alert('Minimum limit', 'You need at least 500 TSH to withdraw.');
      return;
    }
    if (!withdrawPhone.trim() || !withdrawAccountName.trim()) {
      Alert.alert('Missing Info', 'Please enter your phone number and account name.');
      return;
    }

    setIsWithdrawing(true);
    try {
      const { data, error } = await supabase.rpc('request_withdrawal', {
        withdraw_amount: walletBalance,
        phone: withdrawPhone,
        mobile_network: withdrawNetwork,
        acc_name: withdrawAccountName
      });

      if (error) throw error;

      if (data === true) {
        Alert.alert('Success!', 'Your withdrawal request has been submitted. The admin will process it shortly.');
        setShowWithdrawModal(false);
        setWalletBalance(0); // Optimistic UI update
        fetchProfileData(); // Refresh history
      } else {
        Alert.alert('Failed', 'Insufficient funds or error processing request.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E50914" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earn with Bongoflix</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Ionicons name="cash-outline" size={80} color="#E50914" style={{ alignSelf: 'center', marginBottom: 20 }} />
        
        <Text style={styles.title}>Your Wallet Balance</Text>
        <Text style={styles.balance}>{walletBalance.toLocaleString()} TSH</Text>

        <TouchableOpacity 
          style={[styles.withdrawButton, walletBalance < 500 && styles.withdrawButtonDisabled]} 
          onPress={() => setShowWithdrawModal(true)}
          disabled={walletBalance < 500}
        >
          <Ionicons name="cash" size={24} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
        </TouchableOpacity>
        {walletBalance < 500 && (
          <Text style={styles.withdrawWarning}>Minimum withdrawal is 500 TSH</Text>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.cardText}>1. Share your unique code with friends.</Text>
          <Text style={styles.cardText}>2. They sign up using your code.</Text>
          <Text style={styles.cardText}>3. When they buy a subscription, you earn up to 5,000 TSH instantly!</Text>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Referral Code (Tap to copy)</Text>
          <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard} activeOpacity={0.7}>
            <Text style={styles.codeText}>{referralCode || 'NO CODE YET'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>Share Code</Text>
        </TouchableOpacity>

        {withdrawalHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Withdrawal History</Text>
            {withdrawalHistory.map((req) => (
              <View key={req.id} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>{new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString()}</Text>
                  <View style={[styles.historyBadge, { backgroundColor: req.status === 'paid' ? '#4caf50' : req.status === 'rejected' ? '#E50914' : '#e6b800' }]}>
                    <Text style={styles.historyStatus}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.historyAmount}>{req.amount.toLocaleString()} TSH requested</Text>
                {req.admin_note ? (
                  <Text style={styles.historyNote}>Note: {req.admin_note}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw Funds</Text>
                <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                You are requesting to withdraw your entire balance of {walletBalance.toLocaleString()} TSH. 
                A 10% mobile network transfer fee will be applied by the payment gateway.
              </Text>
              
              <View style={styles.feeContainer}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Withdrawal Amount:</Text>
                  <Text style={styles.feeValue}>{walletBalance.toLocaleString()} TSH</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Network Transfer Fee (10%):</Text>
                  <Text style={styles.feeValue}>-{(walletBalance * 0.1).toLocaleString()} TSH</Text>
                </View>
                <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 5 }]}>
                  <Text style={[styles.feeLabel, { color: '#fff', fontWeight: 'bold' }]}>You will receive:</Text>
                  <Text style={[styles.feeValue, { color: '#4caf50', fontWeight: 'bold', fontSize: 18 }]}>
                    {(walletBalance * 0.9).toLocaleString()} TSH
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Select Network</Text>
              <View style={styles.networkOptions}>
                {['Tigo Pesa', 'M-Pesa', 'Airtel Money', 'HaloPesa'].map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[styles.networkOption, withdrawNetwork === net && styles.networkOptionSelected]}
                    onPress={() => setWithdrawNetwork(net)}
                  >
                    <Text style={[styles.networkOptionText, withdrawNetwork === net && styles.networkOptionTextSelected]}>{net}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Account Name</Text>
              <TextInput
                style={[styles.input, { marginBottom: 15 }]}
                placeholder="Name on mobile money account"
                placeholderTextColor="#666"
                returnKeyType="next"
                value={withdrawAccountName}
                onChangeText={setWithdrawAccountName}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 0712345678"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                value={withdrawPhone}
                onChangeText={setWithdrawPhone}
              />

              <TouchableOpacity 
                style={styles.confirmWithdrawBtn} 
                onPress={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmWithdrawBtnText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 10,
  },
  balance: {
    color: '#4caf50',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    marginBottom: 40,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cardText: {
    color: '#8c8c8c',
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  codeLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  codeBox: {
    backgroundColor: '#222',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E50914',
    borderStyle: 'dashed',
  },
  codeText: {
    color: '#E50914',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: '#E50914',
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  withdrawButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#2a5a2b',
    opacity: 0.7,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  withdrawWarning: {
    color: '#8c8c8c',
    fontSize: 12,
    marginBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
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
  modalSubtitle: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  feeContainer: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  feeLabel: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  feeValue: {
    color: '#fff',
    fontSize: 14,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 30,
  },
  networkOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  networkOption: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  networkOptionSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4caf50',
  },
  networkOptionText: {
    color: '#ccc',
  },
  networkOptionTextSelected: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  confirmWithdrawBtn: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmWithdrawBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    width: '100%',
    marginTop: 40,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  historyCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDate: {
    color: '#8c8c8c',
    fontSize: 12,
  },
  historyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  historyStatus: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyNote: {
    color: '#E50914',
    fontSize: 12,
    marginTop: 5,
  }
});
