import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function AdminWithdrawalsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch withdrawal requests, ordered by newest first
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRequests(data);
    } catch (error: any) {
      Alert.alert('Error fetching requests', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (requestId: string) => {
    Alert.alert(
      'Mark as Paid?',
      'Have you already sent the money to their mobile network?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Mark Paid', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('withdrawal_requests')
                .update({ status: 'paid' })
                .eq('id', requestId);
              
              if (error) throw error;
              
              Alert.alert('Success', 'Marked as paid!');
              fetchRequests(); // Refresh list
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('reject_withdrawal', {
        request_id: rejectingId,
        note: rejectReason
      });
      if (error) throw error;
      
      Alert.alert('Success', 'Request rejected and funds returned to user.');
      setRejectingId(null);
      setRejectReason('');
      fetchRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderRequest = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const amount = item.amount || 0;
    const fee = amount * 0.1;
    const payout = amount - fee;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? '#e6b800' : '#4caf50' }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Requested Amount:</Text>
          <Text style={styles.value}>{amount.toLocaleString()} TSH</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Network Fee (10%):</Text>
          <Text style={styles.value}>-{fee.toLocaleString()} TSH</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10, marginTop: 5 }]}>
          <Text style={[styles.label, { color: '#fff', fontWeight: 'bold' }]}>NET PAYOUT:</Text>
          <Text style={[styles.value, { color: '#4caf50', fontWeight: 'bold', fontSize: 18 }]}>{payout.toLocaleString()} TSH</Text>
        </View>

        <View style={styles.phoneBox}>
          <Text style={styles.phoneLabel}>Send via {item.network} to:</Text>
          <Text style={styles.phoneText}>{item.phone_number}</Text>
          <Text style={[styles.phoneLabel, {marginTop: 5}]}>Name: {item.account_name || 'Not provided'}</Text>
        </View>

        {item.admin_note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Admin Note:</Text>
            <Text style={styles.noteText}>{item.admin_note}</Text>
          </View>
        ) : null}

        {isPending && (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, {backgroundColor: '#4caf50'}]} 
              onPress={() => markAsPaid(item.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Mark Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, {backgroundColor: '#E50914'}]} 
              onPress={() => setRejectingId(item.id)}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdrawal Requests</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderRequest}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No withdrawal requests yet.</Text>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal visible={!!rejectingId} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>Provide a reason for the user (e.g. Invalid number). The funds will be returned to their wallet.</Text>
            <TextInput
              style={styles.input}
              placeholder="Reason for rejection..."
              placeholderTextColor="#666"
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setRejectingId(null); setRejectReason(''); }}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitReject}>
                <Text style={styles.modalSubmitBtnText}>Reject & Refund</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  emptyText: {
    color: '#8c8c8c',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateText: {
    color: '#8c8c8c',
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  value: {
    color: '#fff',
    fontSize: 14,
  },
  phoneBox: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  phoneLabel: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 5,
  },
  phoneText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  noteBox: {
    backgroundColor: '#331a1a',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E50914',
  },
  noteLabel: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    padding: 12,
  },
  modalCancelBtnText: {
    color: '#8c8c8c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubmitBtn: {
    backgroundColor: '#E50914',
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
