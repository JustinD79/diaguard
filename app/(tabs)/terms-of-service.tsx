import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.lastUpdated}>Last Updated: December 2025</Text>

        <Text style={styles.intro}>
          Please read these Terms of Service ("Terms") carefully before using the DiaGaurd mobile application and services ("Service") operated by DiaGaurd ("us", "we", or "our").
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Medical Disclaimer</Text>
          <Text style={styles.paragraph}>
            IMPORTANT: DiaGaurd is a health management tool and is NOT a substitute for professional medical advice, diagnosis, or treatment.
          </Text>
          <Text style={styles.bullet}>• Always seek the advice of your physician or qualified health provider</Text>
          <Text style={styles.bullet}>• Never disregard professional medical advice because of information from our app</Text>
          <Text style={styles.bullet}>• Do not delay seeking medical care based on app recommendations</Text>
          <Text style={styles.bullet}>• In case of medical emergency, call 911 immediately</Text>
          <Text style={styles.bullet}>• AI-generated nutritional information may contain errors</Text>
          <Text style={styles.bullet}>• Insulin dosage suggestions are estimates only</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.subsectionTitle}>Registration</Text>
          <Text style={styles.paragraph}>
            You must provide accurate, complete information when creating an account. You are responsible for:
          </Text>
          <Text style={styles.bullet}>• Maintaining the security of your account</Text>
          <Text style={styles.bullet}>• All activities under your account</Text>
          <Text style={styles.bullet}>• Notifying us of unauthorized access</Text>

          <Text style={styles.subsectionTitle}>Eligibility</Text>
          <Text style={styles.paragraph}>
            You must be at least 13 years old to use this Service. Users under 18 must have parental consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Subscription and Billing</Text>

          <Text style={styles.subsectionTitle}>Subscription Plans</Text>
          <Text style={styles.paragraph}>
            We offer multiple subscription tiers with different features and AI scan limits:
          </Text>
          <Text style={styles.bullet}>• Standard (Free): Limited features, 30 scans/month</Text>
          <Text style={styles.bullet}>• Gold: Enhanced features, 100 scans/month</Text>
          <Text style={styles.bullet}>• Diamond: All features, unlimited scans</Text>

          <Text style={styles.subsectionTitle}>Payment</Text>
          <Text style={styles.bullet}>• Subscriptions are billed monthly or annually</Text>
          <Text style={styles.bullet}>• Prices are in USD and subject to change with notice</Text>
          <Text style={styles.bullet}>• Payment is processed through Stripe</Text>
          <Text style={styles.bullet}>• Automatic renewal unless cancelled</Text>

          <Text style={styles.subsectionTitle}>Cancellation</Text>
          <Text style={styles.bullet}>• You may cancel anytime from your account settings</Text>
          <Text style={styles.bullet}>• No refunds for partial months</Text>
          <Text style={styles.bullet}>• Access continues until end of billing period</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Content and Data</Text>

          <Text style={styles.subsectionTitle}>Your Data</Text>
          <Text style={styles.paragraph}>
            You retain ownership of all health data, food logs, and content you input. By using our Service, you grant us:
          </Text>
          <Text style={styles.bullet}>• License to process your data to provide services</Text>
          <Text style={styles.bullet}>• Right to use anonymized, aggregated data for improvement</Text>
          <Text style={styles.bullet}>• Permission to share data with AI providers for analysis</Text>

          <Text style={styles.subsectionTitle}>Data Accuracy</Text>
          <Text style={styles.paragraph}>
            You acknowledge that:
          </Text>
          <Text style={styles.bullet}>• AI food analysis may not be 100% accurate</Text>
          <Text style={styles.bullet}>• Nutritional data is estimated and may vary</Text>
          <Text style={styles.bullet}>• You should verify important calculations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Acceptable Use</Text>
          <Text style={styles.paragraph}>You agree NOT to:</Text>
          <Text style={styles.bullet}>• Use the Service for illegal purposes</Text>
          <Text style={styles.bullet}>• Share your account credentials</Text>
          <Text style={styles.bullet}>• Attempt to hack, breach, or reverse engineer the app</Text>
          <Text style={styles.bullet}>• Upload malicious content or viruses</Text>
          <Text style={styles.bullet}>• Use automated systems to access the Service</Text>
          <Text style={styles.bullet}>• Resell or redistribute our services</Text>
          <Text style={styles.bullet}>• Violate others' privacy or intellectual property</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Service and its original content, features, and functionality are owned by DiaGaurd and are protected by:
          </Text>
          <Text style={styles.bullet}>• Copyright laws</Text>
          <Text style={styles.bullet}>• Trademark laws</Text>
          <Text style={styles.bullet}>• Patent rights</Text>
          <Text style={styles.bullet}>• Other intellectual property rights</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIABETESCARE SHALL NOT BE LIABLE FOR:
          </Text>
          <Text style={styles.bullet}>• Any indirect, incidental, or consequential damages</Text>
          <Text style={styles.bullet}>• Medical decisions made based on app information</Text>
          <Text style={styles.bullet}>• Health complications or adverse events</Text>
          <Text style={styles.bullet}>• Data loss or security breaches beyond our control</Text>
          <Text style={styles.bullet}>• Service interruptions or downtime</Text>
          <Text style={styles.bullet}>• Third-party actions or services</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Warranty Disclaimer</Text>
          <Text style={styles.paragraph}>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING:
          </Text>
          <Text style={styles.bullet}>• Accuracy of AI analysis</Text>
          <Text style={styles.bullet}>• Fitness for a particular purpose</Text>
          <Text style={styles.bullet}>• Uninterrupted or error-free operation</Text>
          <Text style={styles.bullet}>• Security of data transmission</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account immediately, without prior notice, for:
          </Text>
          <Text style={styles.bullet}>• Violation of these Terms</Text>
          <Text style={styles.bullet}>• Fraudulent activity</Text>
          <Text style={styles.bullet}>• Non-payment of subscription fees</Text>
          <Text style={styles.bullet}>• Abusive behavior toward staff or other users</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify users of material changes via:
          </Text>
          <Text style={styles.bullet}>• In-app notification</Text>
          <Text style={styles.bullet}>• Email to registered address</Text>
          <Text style={styles.bullet}>• Updated "Last Updated" date</Text>
          <Text style={styles.paragraph}>
            Continued use after changes constitutes acceptance of new terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Any disputes arising from these Terms or use of the Service shall be resolved through:
          </Text>
          <Text style={styles.bullet}>• Good faith negotiation</Text>
          <Text style={styles.bullet}>• Binding arbitration if negotiation fails</Text>
          <Text style={styles.bullet}>• Small claims court (user's option)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Contact Information</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms, contact us at:
          </Text>
          <Text style={styles.contactText}>Email: legal@diabetescare.app</Text>
          <Text style={styles.contactText}>Address: [Your Address]</Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>ACKNOWLEDGMENT</Text>
          <Text style={styles.disclaimerText}>
            BY USING DIABETESCARE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM. YOU ALSO ACKNOWLEDGE THAT THIS IS A HEALTH MANAGEMENT TOOL, NOT A MEDICAL DEVICE, AND SHOULD NOT REPLACE PROFESSIONAL HEALTHCARE.
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
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#991B1B',
  },
});
