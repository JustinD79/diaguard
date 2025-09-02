import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, X, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from './Button';

interface ProfilePictureSelectorProps {
  currentImage?: string;
  onImageSelected: (imageUri: string) => void;
  size?: number;
  showEditButton?: boolean;
}

export default function ProfilePictureSelector({
  currentImage,
  onImageSelected,
  size = 80,
  showEditButton = true,
}: ProfilePictureSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take photos for your profile picture.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request media library permissions
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access to select images for your profile picture.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        setShowModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        setShowModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            onImageSelected('');
            setShowModal(false);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.imageContainer, { width: size, height: size }]}
        onPress={() => setShowModal(true)}
        accessibilityRole="button"
        accessible={true}
        accessibilityLabel="Change profile picture"
        accessibilityHint="Tap to change your profile picture"
      >
        {currentImage ? (
          <Image 
            source={{ uri: currentImage }} 
            style={[styles.profileImage, { width: size, height: size }]} 
          />
        ) : (
          <View style={[styles.placeholderImage, { width: size, height: size }]}>
            <User size={size * 0.4} color="#9CA3AF" />
          </View>
        )}
        
        {showEditButton && (
          <View style={styles.editOverlay}>
            <Camera size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profile Picture</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.currentImageContainer}>
              {currentImage ? (
                <Image source={{ uri: currentImage }} style={styles.currentImage} />
              ) : (
                <View style={styles.currentImagePlaceholder}>
                  <User size={60} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View style={styles.optionsContainer}>
              <Button
                title={loading ? 'Opening Camera...' : 'Take Photo'}
                onPress={takePhoto}
                disabled={loading}
                style={styles.optionButton}
              />

              <Button
                title={loading ? 'Opening Library...' : 'Choose from Library'}
                onPress={selectFromLibrary}
                disabled={loading}
                variant="outline"
                style={styles.optionButton}
              />

              {currentImage && (
                <Button
                  title="Remove Photo"
                  onPress={removePhoto}
                  variant="danger"
                  style={styles.optionButton}
                />
              )}
            </View>

            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>📱 Permissions Required</Text>
              <Text style={styles.permissionText}>
                • Camera access to take new photos{'\n'}
                • Photo library access to select existing images{'\n'}
                • Images are stored locally on your device
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 50,
    overflow: 'hidden',
  },
  profileImage: {
    borderRadius: 50,
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  currentImageContainer: {
    marginBottom: 40,
  },
  currentImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  currentImagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  optionButton: {
    width: '100%',
  },
  permissionInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    width: '100%',
  },
  permissionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 18,
  },
});