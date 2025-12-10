import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: December 2025</Text>

        <Text style={styles.intro}>
          DiaGaurd ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>

          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <Text style={styles.paragraph}>
            When you register for an account, we collect:
          </Text>
          <Text style={styles.bullet}>• Email address</Text>
          <Text style={styles.bullet}>• Name</Text>
          <Text style={styles.bullet}>• Password (encrypted)</Text>

          <Text style={styles.subsectionTitle}>Health Information</Text>
          <Text style={styles.paragraph}>
            You may choose to provide:
          </Text>
          <Text style={styles.bullet}>• Food intake and nutritional data</Text>
          <Text style={styles.bullet}>• Blood glucose readings</Text>
          <Text style={styles.bullet}>• Insulin dosages</Text>
          <Text style={styles.bullet}>• Weight and other health metrics</Text>
          <Text style={styles.bullet}>• Medication information</Text>
          <Text style={styles.bullet}>• Food images for AI analysis</Text>

          <Text style={styles.subsectionTitle}>Automatically Collected Information</Text>
          <Text style={styles.bullet}>• Device information (type, OS version)</Text>
          <Text style={styles.bullet}>• App usage analytics</Text>
          <Text style={styles.bullet}>• Log data (crashes, errors)</Text>
          <Text style={styles.bullet}>• Location data (if you grant permission)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>
          <Text style={styles.bullet}>• Provide and maintain our services</Text>
          <Text style={styles.bullet}>• Perform AI-powered food analysis</Text>
          <Text style={styles.bullet}>• Generate personalized health insights</Text>
          <Text style={styles.bullet}>• Process payments and subscriptions</Text>
          <Text style={styles.bullet}>• Send important notifications about your account</Text>
          <Text style={styles.bullet}>• Improve our app functionality</Text>
          <Text style={styles.bullet}>• Respond to customer support requests</Text>
          <Text style={styles.bullet}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>We do not sell your personal information. We may share your information with:</Text>

          <Text style={styles.subsectionTitle}>Service Providers</Text>
          <Text style={styles.bullet}>• Cloud hosting (Supabase) - for data storage</Text>
          <Text style={styles.bullet}>• Payment processing (Stripe) - for subscriptions</Text>
          <Text style={styles.bullet}>• AI services (Anthropic/OpenAI) - for food analysis</Text>

          <Text style={styles.subsectionTitle}>Healthcare Providers</Text>
          <Text style={styles.paragraph}>
            Only if you explicitly choose to share reports with your healthcare team.
          </Text>

          <Text style={styles.subsectionTitle}>Legal Requirements</Text>
          <Text style={styles.paragraph}>
            When required by law, subpoena, or legal process.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures:
          </Text>
          <Text style={styles.bullet}>• End-to-end encryption for sensitive data</Text>
          <Text style={styles.bullet}>• Secure HTTPS connections</Text>
          <Text style={styles.bullet}>• Regular security audits</Text>
          <Text style={styles.bullet}>• Access controls and authentication</Text>
          <Text style={styles.bullet}>• Encrypted database storage</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.bullet}>• Access your personal data</Text>
          <Text style={styles.bullet}>• Correct inaccurate data</Text>
          <Text style={styles.bullet}>• Request deletion of your data</Text>
          <Text style={styles.bullet}>• Export your data</Text>
          <Text style={styles.bullet}>• Withdraw consent at any time</Text>
          <Text style={styles.bullet}>• Opt-out of marketing communications</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain data for legal compliance or legitimate business purposes for up to 7 years.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our service is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and maintained on servers located outside your jurisdiction. By using our services, you consent to such transfers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.contactText}>Email: privacy@diabetescare.app</Text>
          <Text style={styles.contactText}>Address: [Your Address]</Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>HIPAA Compliance</Text>
          <Text style={styles.disclaimerText}>
            While we implement security measures consistent with HIPAA standards, DiaGaurd is not a covered entity under HIPAA. The health information you provide is subject to this Privacy Policy, not HIPAA regulations.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginLeft: 8,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#007AFF',
    marginBottom: 4,
  },
  disclaimer: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#92400E',
  },
});
