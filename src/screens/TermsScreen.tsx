import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Terms of Use</Text>
        <Text style={styles.lastUpdated}>Last Updated: Today</Text>
        
        <Text style={styles.paragraph}>
          Welcome to Bongo Stream! These Terms of Use govern your use of our service. As used in these Terms of Use, "Bongo Stream service", "our service" or "the service" means the personalized service provided by Bongo Stream for discovering and accessing Bongo Stream content, including all features and functionalities, recommendations and reviews, our websites, and user interfaces, as well as all content and software associated with our service.
        </Text>

        <Text style={styles.sectionHeading}>1. Membership</Text>
        <Text style={styles.paragraph}>
          1.1. Your Bongo Stream membership will continue until terminated. To use the Bongo Stream service you must have Internet access and a Bongo Stream ready device, and provide us with one or more Payment Methods.
        </Text>
        <Text style={styles.paragraph}>
          1.2. We may offer a number of membership plans, including memberships offered by third parties in conjunction with the provision of their own products and services.
        </Text>

        <Text style={styles.sectionHeading}>2. Promotional Offers</Text>
        <Text style={styles.paragraph}>
          We may from time to time offer special promotional offers, plans or memberships ("Offers"). Offer eligibility is determined by Bongo Stream at its sole discretion and we reserve the right to revoke an Offer and put your account on hold in the event that we determine you are not eligible.
        </Text>

        <Text style={styles.sectionHeading}>3. Billing and Cancellation</Text>
        <Text style={styles.paragraph}>
          3.1. Billing Cycle. The membership fee for the Bongo Stream service and any other charges you may incur in connection with your use of the service, such as taxes and possible transaction fees, will be charged to your Payment Method on the specific payment date indicated on the "Account" page.
        </Text>
        <Text style={styles.paragraph}>
          3.2. Cancellation. You can cancel your Bongo Stream membership at any time, and you will continue to have access to the Bongo Stream service through the end of your billing period. To the extent permitted by the applicable law, payments are non-refundable and we do not provide refunds or credits for any partial-month membership periods or unwatched Bongo Stream content.
        </Text>

        <Text style={styles.sectionHeading}>4. Bongo Stream Service</Text>
        <Text style={styles.paragraph}>
          4.1. You must be at least 18 years of age to become a member of the Bongo Stream service. Minors may only use the service under the supervision of an adult.
        </Text>
        <Text style={styles.paragraph}>
          4.2. The Bongo Stream service and any content accessed through the service are for your personal and non-commercial use only and may not be shared with individuals beyond your household unless otherwise allowed by your subscription plan.
        </Text>

        <View style={styles.bottomSpacing} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lastUpdated: {
    color: '#8c8c8c',
    fontSize: 14,
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    color: '#b3b3b3',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  bottomSpacing: {
    height: 50,
  },
});
