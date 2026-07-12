import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SubscriptionScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState('1_month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mno, setMno] = useState('Tigo Pesa');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const plans = [
    { id: '1_month', title: '1 Month', price: '2,000 TZS', description: 'Billed monthly', savings: null, durationDays: 30 },
    { id: '3_months', title: '3 Months', price: '5,500 TZS', description: 'Billed every 3 months', savings: 'Save 500 TZS', durationDays: 90 },
    { id: '6_months', title: '6 Months', price: '10,000 TZS', description: 'Billed every 6 months', savings: 'Save 2,000 TZS', durationDays: 180 },
    { id: '1_year', title: '1 Year', price: '18,000 TZS', description: 'Billed annually', savings: 'Save 6,000 TZS', durationDays: 365 },
  ];

  const handleSimulatePayment = async () => {
    // 1. Format the phone number to +255...
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, ''); // Remove any non-numeric chars
    
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '255' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('6') || formattedPhone.startsWith('7')) {
      formattedPhone = '255' + formattedPhone;
    }

    // Ensure it has the + prefix
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    if (formattedPhone.length < 13) { // e.g. +255712345678 is 13 characters
      Alert.alert('Invalid Number', 'Please enter a valid phone number (e.g., 0712345678).');
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'You must be logged in to subscribe.');
        setIsProcessing(false);
        return;
      }

      const plan = plans.find(p => p.id === selectedPlan);
      const amount = parseInt(plan?.price.replace(/[^0-9]/g, '') || '2000', 10);

      // Invoke the ClickPesa Edge Function
      const { data, error } = await supabase.functions.invoke('clickpesa-checkout', {
        body: {
          phoneNumber: formattedPhone,
          amount,
          planId: plan?.id,
          mno
        }
      });

      if (error) throw error;
      
      if (data && data.success === false) {
        throw new Error(`ClickPesa Error:\n${JSON.stringify(data.details, null, 2)}`);
      }

      Alert.alert(
        'Payment Initiated! 📲', 
        `We have sent a USSD push to ${formattedPhone}. Please check your phone to complete the payment for the ${plan?.title} plan.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Payment Failed', error.message || 'There was an error triggering the ClickPesa payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Ionicons name="film-outline" size={60} color="#E50914" style={styles.icon} />
        <Text style={styles.title}>Unlock Unlimited Entertainment</Text>
        <Text style={styles.subtitle}>Watch all BongoFlix movies and series in HD, ad-free. Cancel anytime.</Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#E50914" />
            <Text style={styles.featureText}>Unlimited Movies & Series</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#E50914" />
            <Text style={styles.featureText}>Download for offline viewing</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#E50914" />
            <Text style={styles.featureText}>Watch on your phone, tablet, or TV</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment Details (ClickPesa USSD-PUSH)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mobile Network</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownButton} 
              activeOpacity={0.8}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Text style={styles.dropdownButtonText}>{mno}</Text>
              <Ionicons 
                name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>

            {isDropdownOpen && (
              <View style={styles.dropdownOptions}>
                {['Tigo Pesa', 'Airtel Money', 'HaloPesa'].map((network) => (
                  <TouchableOpacity
                    key={network}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setMno(network);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      mno === network && styles.dropdownOptionTextSelected
                    ]}>
                      {network}
                    </Text>
                    {mno === network && (
                      <Ionicons name="checkmark" size={18} color="#E50914" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0712345678"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <Text style={styles.sectionTitle}>Select Plan</Text>
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{plan.savings}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planDesc}>{plan.description}</Text>
              
              <View style={styles.radioContainer}>
                <View style={[styles.radio, selectedPlan === plan.id && styles.radioSelected]}>
                  {selectedPlan === plan.id && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.payButton} 
          onPress={handleSimulatePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay Now</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By clicking Pay, a USSD prompt will appear on your phone to enter your PIN.
        </Text>
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  featuresList: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  inputContainer: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  label: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownOptions: {
    backgroundColor: '#222',
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownOptionText: {
    color: '#ccc',
    fontSize: 16,
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  plansContainer: {
    gap: 15,
  },
  planCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  planTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  savingsBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planPrice: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planDesc: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  radioContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -10,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8c8c8c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#E50914',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E50914',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
  },
  payButton: {
    backgroundColor: '#E50914',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    color: '#8c8c8c',
    fontSize: 12,
    textAlign: 'center',
  }
});
