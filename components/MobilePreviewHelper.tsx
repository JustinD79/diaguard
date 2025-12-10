import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Monitor, Globe, QrCode, X, Copy, ExternalLink, Wifi, Settings } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface MobilePreviewHelperProps {
  visible: boolean;
  onClose: () => void;
}

export default function MobilePreviewHelper({ visible, onClose }: MobilePreviewHelperProps) {
  const [currentURL, setCurrentURL] = useState('');
  const [localIP, setLocalIP] = useState('192.168.1.100'); // Default example
  const [customPort, setCustomPort] = useState('8081');
  const [ngrokURL, setNgrokURL] = useState('');

  useEffect(() => {
    if (visible) {
      generateCurrentURL();
    }
  }, [visible]);

  const generateCurrentURL = () => {
    if (typeof window !== 'undefined') {
      setCurrentURL(window.location.href);
    }
  };

  const generateMobileURL = () => {
    return `http://${localIP}:${customPort}`;
  };

  const copyURL = async (url: string, label: string) => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      Alert.alert('Copied!', `${label} URL copied to clipboard`);
    } catch {
      Alert.alert('Copy URL', `Please copy this URL manually:\n\n${url}`);
    }
  };

  const openInNewTab = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    }
  };

  const setupNgrok = () => {
    Alert.alert(
      'Ngrok Setup',
      'To set up ngrok for public access:\n\n1. Install ngrok: npm install -g ngrok\n2. Run: ngrok http 8081\n3. Copy the https URL\n4. Enter it below for easy sharing',
      [{ text: 'OK' }]
    );
  };

  const sendTestURL = () => {
    const mobileURL = generateMobileURL();
    const message = `Test the DiaGaurd app on your mobile device:\n\n${mobileURL}\n\nMake sure you're connected to the same WiFi network!`;
    
    Alert.alert(
      'Share Test URL',
      'Choose how to share the test URL:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy URL', onPress: () => copyURL(mobileURL, 'Mobile Test') },
        { text: 'SMS/Email', onPress: () => shareViaSystem(message) }
      ]
    );
  };

  const shareViaSystem = async (message: string) => {
    try {
      if (Platform.OS !== 'web') {
        const { Share } = await import('react-native');
        await Share.share({ message });
      } else {
        // Web fallback
        Alert.alert('Share', `Send this message:\n\n${message}`);
      }
    } catch {
      Alert.alert('Share', `Send this message:\n\n${message}`);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mobile Preview Setup</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.introSection}>
            <Smartphone size={32} color="#2563EB" />
            <Text style={styles.introTitle}>Test on Mobile Devices</Text>
            <Text style={styles.introDescription}>
              Multiple ways to preview and test your diabetes care app on mobile devices
            </Text>
          </View>

          {/* Method 1: Local Network Testing */}
          <Card style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <Wifi size={20} color="#059669" />
              <Text style={styles.methodTitle}>Local WiFi Testing</Text>
            </View>
            <Text style={styles.methodDescription}>
              Test on mobile devices connected to the same WiFi network
            </Text>
            
            <View style={styles.configSection}>
              <Input
                label="Your Computer's IP Address"
                value={localIP}
                onChangeText={setLocalIP}
                placeholder="192.168.1.100"
              />
              <Input
                label="Development Port"
                value={customPort}
                onChangeText={setCustomPort}
                placeholder="8081"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.urlDisplay}>
              <Text style={styles.generatedURL}>{generateMobileURL()}</Text>
              <View style={styles.urlButtons}>
                <TouchableOpacity
                  style={styles.urlButton}
                  onPress={() => copyURL(generateMobileURL(), 'Local Network')}
                >
                  <Copy size={16} color="#059669" />
                  <Text style={styles.urlButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.urlButton}
                  onPress={sendTestURL}
                >
                  <ExternalLink size={16} color="#059669" />
                  <Text style={styles.urlButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* Method 2: Browser Responsive Mode */}
          <Card style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <Monitor size={20} color="#2563EB" />
              <Text style={styles.methodTitle}>Browser Mobile Simulation</Text>
            </View>
            <Text style={styles.methodDescription}>
              Test mobile layout using browser developer tools
            </Text>
            
            <View style={styles.instructionsList}>
              <Text style={styles.instructionStep}>
                1. Right-click and select "Inspect Element"
              </Text>
              <Text style={styles.instructionStep}>
                2. Click the device toggle icon (📱) in DevTools
              </Text>
              <Text style={styles.instructionStep}>
                3. Select iPhone/Android device from dropdown
              </Text>
              <Text style={styles.instructionStep}>
                4. Test touch interactions and responsiveness
              </Text>
            </View>

            <Button
              title="Open in Responsive Mode"
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert(
                    'Responsive Mode',
                    'Press F12 → Click device icon → Select mobile device',
                    [
                      { text: 'Cancel' },
                      { 
                        text: 'Open DevTools', 
                        onPress: () => {
                          // This will work in some browsers
                          (window as any).open('', '', 'width=375,height=667');
                        }
                      }
                    ]
                  );
                }
              }}
              style={styles.methodButton}
            />
          </Card>

          {/* Method 3: Ngrok Tunnel */}
          <Card style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <Globe size={20} color="#8B5CF6" />
              <Text style={styles.methodTitle}>Public Tunnel (Ngrok)</Text>
            </View>
            <Text style={styles.methodDescription}>
              Create a public URL for testing on any device with internet
            </Text>
            
            <Input
              label="Ngrok Public URL (optional)"
              value={ngrokURL}
              onChangeText={setNgrokURL}
              placeholder="https://abc123.ngrok.io"
            />

            <View style={styles.ngrokInstructions}>
              <Text style={styles.ngrokTitle}>Setup Instructions:</Text>
              <Text style={styles.ngrokStep}>1. Install: npm install -g ngrok</Text>
              <Text style={styles.ngrokStep}>2. Run: ngrok http 8081</Text>
              <Text style={styles.ngrokStep}>3. Copy the https URL</Text>
              <Text style={styles.ngrokStep}>4. Paste above and share</Text>
            </View>

            <View style={styles.methodButtons}>
              <Button
                title="Setup Guide"
                onPress={setupNgrok}
                variant="outline"
                style={styles.setupButton}
              />
              {ngrokURL && (
                <Button
                  title="Share Public URL"
                  onPress={() => shareViaSystem(`Test DiaGaurd: ${ngrokURL}`)}
                  style={styles.shareButton}
                />
              )}
            </View>
          </Card>

          {/* Method 4: Web Mobile Preview */}
          <Card style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <QrCode size={20} color="#D97706" />
              <Text style={styles.methodTitle}>Current Web Preview</Text>
            </View>
            <Text style={styles.methodDescription}>
              Access the current web version on any device
            </Text>
            
            <View style={styles.webPreviewActions}>
              <Button
                title="Copy Web URL"
                onPress={() => copyURL(currentURL, 'Web Preview')}
                style={styles.webButton}
              />
              <Button
                title="Open in New Tab"
                onPress={() => openInNewTab(currentURL)}
                variant="outline"
                style={styles.webButton}
              />
            </View>
          </Card>

          <View style={styles.troubleshootingSection}>
            <Text style={styles.troubleshootingTitle}>🔧 Troubleshooting Tips</Text>
            <Text style={styles.troubleshootingText}>
              • <Text style={styles.bold}>Preview not working?</Text> Try refreshing or clearing browser cache{'\n'}
              • <Text style={styles.bold}>Mobile URL fails?</Text> Check that devices are on same WiFi{'\n'}
              • <Text style={styles.bold}>QR code missing?</Text> Look for it in the terminal where you started the app{'\n'}
              • <Text style={styles.bold}>Slow loading?</Text> Try a wired connection or better WiFi signal
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  methodCard: {
    marginBottom: 16,
    padding: 16,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  methodDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  configSection: {
    gap: 12,
    marginBottom: 16,
  },
  urlDisplay: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  generatedURL: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  urlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#059669',
  },
  urlButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  instructionsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  instructionStep: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 4,
  },
  methodButton: {
    backgroundColor: '#2563EB',
  },
  ngrokInstructions: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  ngrokTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B21A8',
    marginBottom: 6,
  },
  ngrokStep: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B21A8',
    marginBottom: 2,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  setupButton: {
    flex: 1,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  webPreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  webButton: {
    flex: 1,
  },
  troubleshootingSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
  bold: {
    fontFamily: 'Inter-SemiBold',
  },
});