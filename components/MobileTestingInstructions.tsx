import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Smartphone, Monitor, Wifi, Globe, QrCode, Copy, ExternalLink, Terminal, Camera } from 'lucide-react-native';
import Card from '@/components/ui/Card';

export default function MobileTestingInstructions() {
  const copyCommand = async (command: string) => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(command);
        Alert.alert('Copied!', 'Command copied to clipboard');
      }
    } catch {
      Alert.alert('Copy Command', `Please copy:\n\n${command}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 Mobile Testing Guide</Text>
      <Text style={styles.subtitle}>
        Multiple ways to test your diabetes care app on mobile devices
      </Text>

      {/* Method 1: Expo Go */}
      <Card style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <QrCode size={24} color="#2563EB" />
          <Text style={styles.methodTitle}>Method 1: Expo Go App</Text>
        </View>
        
        <View style={styles.methodContent}>
          <Text style={styles.methodDescription}>
            The easiest way to test on real devices
          </Text>
          
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Download Expo Go from App Store/Play Store</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Run the app and look for QR code in terminal</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Scan QR code with Expo Go app</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>App loads directly on your device!</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.commandButton}
            onPress={() => copyCommand('expo start')}
          >
            <Terminal size={16} color="#2563EB" />
            <Text style={styles.commandText}>expo start</Text>
            <Copy size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Method 2: Local Network */}
      <Card style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <Wifi size={24} color="#059669" />
          <Text style={styles.methodTitle}>Method 2: Local Network URL</Text>
        </View>
        
        <View style={styles.methodContent}>
          <Text style={styles.methodDescription}>
            Access via WiFi network (same network required)
          </Text>
          
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Find your computer's IP address</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Replace localhost with IP in development URL</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Open URL in mobile browser</Text>
            </View>
          </View>

          <View style={styles.commandSection}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => copyCommand('ipconfig')}
            >
              <Terminal size={16} color="#059669" />
              <Text style={styles.commandText}>ipconfig (Windows)</Text>
              <Copy size={14} color="#059669" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => copyCommand('ifconfig')}
            >
              <Terminal size={16} color="#059669" />
              <Text style={styles.commandText}>ifconfig (Mac/Linux)</Text>
              <Copy size={14} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {/* Method 3: Public Tunnel */}
      <Card style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <Globe size={24} color="#8B5CF6" />
          <Text style={styles.methodTitle}>Method 3: Public Tunnel</Text>
        </View>
        
        <View style={styles.methodContent}>
          <Text style={styles.methodDescription}>
            Create public URL for testing anywhere (recommended for external testing)
          </Text>
          
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Install ngrok globally</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Start tunnel to development port</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Share the https URL</Text>
            </View>
          </View>

          <View style={styles.commandSection}>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => copyCommand('npm install -g ngrok')}
            >
              <Terminal size={16} color="#8B5CF6" />
              <Text style={styles.commandText}>npm install -g ngrok</Text>
              <Copy size={14} color="#8B5CF6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => copyCommand('ngrok http 8081')}
            >
              <Terminal size={16} color="#8B5CF6" />
              <Text style={styles.commandText}>ngrok http 8081</Text>
              <Copy size={14} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {/* Method 4: Browser Simulation */}
      <Card style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <Monitor size={24} color="#D97706" />
          <Text style={styles.methodTitle}>Method 4: Browser Mobile Mode</Text>
        </View>
        
        <View style={styles.methodContent}>
          <Text style={styles.methodDescription}>
            Simulate mobile experience in desktop browser
          </Text>
          
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Open browser Developer Tools (F12)</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Click device toggle icon (📱)</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Select iPhone/Android from dropdown</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Test touch interactions and layout</Text>
            </View>
          </View>

          <View style={styles.browserTips}>
            <Text style={styles.tipsTitle}>💡 Testing Tips:</Text>
            <Text style={styles.tipsText}>
              • Use Chrome DevTools for best mobile simulation{'\n'}
              • Test different screen sizes (iPhone 12, Pixel, etc.){'\n'}
              • Check portrait and landscape orientations{'\n'}
              • Test touch gestures and camera features
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.quickStart}>
        <Text style={styles.quickStartTitle}>🚀 Quick Start</Text>
        <Text style={styles.quickStartText}>
          <Text style={styles.bold}>Fastest way to test:</Text> Use Method 1 (Expo Go) if you have an iPhone/Android device, or Method 4 (Browser) for immediate testing.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 24,
  },
  methodCard: {
    marginBottom: 20,
    padding: 20,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  methodTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  methodContent: {
    gap: 16,
  },
  methodDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  stepsList: {
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  commandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commandText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  commandSection: {
    gap: 8,
  },
  browserTips: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipsTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 16,
  },
  quickStart: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  quickStartTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginBottom: 8,
  },
  quickStartText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    lineHeight: 18,
  },
  bold: {
    fontFamily: 'Inter-SemiBold',
  },
});