import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { QrCode, ExternalLink, Copy, Smartphone } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Card from '@/components/ui/Card';

interface ShareableURLProps {
  developmentURL?: string;
  ngrokURL?: string;
  onQRCodePress?: () => void;
}

export default function ShareableURL({ 
  developmentURL, 
  ngrokURL, 
  onQRCodePress 
}: ShareableURLProps) {
  const [localIP, setLocalIP] = useState<string>('');
  const [webURL, setWebURL] = useState<string>('');

  useEffect(() => {
    generateShareableURLs();
  }, []);

  const generateShareableURLs = () => {
    // Generate local network URL (replace localhost with IP)
    if (developmentURL) {
      // Extract port from URL
      const portMatch = developmentURL.match(/:(\d+)/);
      const port = portMatch ? portMatch[1] : '8081';
      
      // Get local IP (this would be detected automatically)
      const estimatedIP = '192.168.1.100'; // Placeholder - real implementation would detect
      setLocalIP(`http://${estimatedIP}:${port}`);
    }

    // Web preview URL
    setWebURL(window.location.origin);
  };

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', `${label} URL copied to clipboard`);
    } catch {
      Alert.alert('Error', 'Failed to copy URL');
    }
  };

  const shareURL = async (url: string, title: string) => {
    try {
      await Share.share({
        message: `Test the diabetes care app: ${url}`,
        title: title,
        url: url,
      });
    } catch {
      Alert.alert('Error', 'Failed to share URL');
    }
  };

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>🔗 App Testing URLs</Text>
      <Text style={styles.subtitle}>
        Share these URLs to test your app on different devices
      </Text>

      {/* Local Network URL */}
      <View style={styles.urlSection}>
        <Text style={styles.urlLabel}>📱 Mobile Testing (Same WiFi)</Text>
        <View style={styles.urlContainer}>
          <Text style={styles.url} numberOfLines={1}>
            {localIP || 'Generating...'}
          </Text>
          <View style={styles.urlActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(localIP, 'Mobile')}
            >
              <Copy size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareURL(localIP, 'DiaGaurd Mobile Test')}
            >
              <ExternalLink size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.urlDescription}>
          Open this URL on your phone's browser (must be on same WiFi network)
        </Text>
      </View>

      {/* Web Preview URL */}
      <View style={styles.urlSection}>
        <Text style={styles.urlLabel}>💻 Web Preview</Text>
        <View style={styles.urlContainer}>
          <Text style={styles.url} numberOfLines={1}>
            {webURL}
          </Text>
          <View style={styles.urlActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(webURL, 'Web Preview')}
            >
              <Copy size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => window.open(webURL, '_blank')}
            >
              <ExternalLink size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.urlDescription}>
          Use browser's responsive mode to simulate mobile devices
        </Text>
      </View>

      {/* Tunnel URL if available */}
      {ngrokURL && (
        <View style={styles.urlSection}>
          <Text style={styles.urlLabel}>🌐 Public Tunnel</Text>
          <View style={styles.urlContainer}>
            <Text style={styles.url} numberOfLines={1}>
              {ngrokURL}
            </Text>
            <View style={styles.urlActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => copyToClipboard(ngrokURL, 'Tunnel')}
              >
                <Copy size={16} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => shareURL(ngrokURL, 'DiaGaurd App Test')}
              >
                <ExternalLink size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.urlDescription}>
            Access from any device with internet connection
          </Text>
        </View>
      )}

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => {
            if (onQRCodePress) {
              onQRCodePress();
            } else {
              Alert.alert(
                'QR Code Instructions',
                `To test on mobile:\n\n1. Open Expo Go app\n2. Tap "Scan QR Code"\n3. Point camera at QR code in terminal\n4. App will load on your device\n\nOr manually enter: ${localIP}`
              );
            }
          }}
        >
          <QrCode size={24} color="#2563EB" />
          <Text style={styles.qrButtonText}>Generate QR Code</Text>
        </TouchableOpacity>
        <Text style={styles.qrDescription}>
          For Expo Go app testing on mobile devices
        </Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Testing Instructions</Text>
        <Text style={styles.instructionsText}>
          1. <Text style={styles.bold}>Mobile Testing:</Text> Copy the mobile URL and open in your phone's browser{'\n'}
          2. <Text style={styles.bold}>Web Testing:</Text> Use Chrome DevTools responsive mode{'\n'}
          3. <Text style={styles.bold}>Expo Testing:</Text> Use Expo Go app with QR code{'\n'}
          4. <Text style={styles.bold}>Share Testing:</Text> Send URLs to others for feedback
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
  },
  urlSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  urlLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  url: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  urlActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
    padding: 6,
  },
  urlDescription: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  qrSection: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  qrButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  qrDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  instructionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
  bold: {
    fontFamily: 'Inter-SemiBold',
  },
});