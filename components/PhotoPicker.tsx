import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';

/**
 * Reusable Camera / Gallery image picker.
 *
 * Replaces the old gallery-only `launchImageLibraryAsync` calls. Shows a clean
 * bottom sheet with "Take Photo" / "Choose from Gallery" / "Cancel", requests
 * the camera permission only when the camera is actually chosen, and returns
 * the picked local URI via the `onPick` callback. The caller is responsible for
 * persisting the URI into app-local storage (via persistAnimalImage).
 */
export function useImagePicker() {
  const [visible, setVisible] = useState(false);
  const [setter, setSetter] = useState<((uri: string | null) => void) | null>(null);

  const open = (s: (uri: string | null) => void) => {
    setSetter(() => s);
    setVisible(true);
  };

  const pick = async (mode: 'camera' | 'gallery') => {
    setVisible(false);
    try {
      let result;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Camera blocked', text2: 'Allow camera access to take a photo.' });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setter?.(result.assets[0].uri);
      }
    } catch (e) {
      console.error('[Herdly] image pick failed:', e);
      Toast.show({ type: 'error', text1: 'Image error', text2: 'Could not open the photo picker.' });
    }
  };

  const modal = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add Animal Photo</Text>

          <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={() => pick('camera')}>
            <View style={[styles.optionIcon, { backgroundColor: '#EAF1FB' }]}>
              <Camera color={Colors.primary} size={22} />
            </View>
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={() => pick('gallery')}>
            <View style={[styles.optionIcon, { backgroundColor: '#E0E7FF' }]}>
              <ImageIcon color={Colors.primary} size={22} />
            </View>
            <Text style={styles.optionText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} activeOpacity={0.8} onPress={() => setVisible(false)}>
            <X color={Colors.textSecondary} size={18} />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return { open, modal };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 66, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: 10,
  },
  sheetTitle: {
    fontSize: 14, fontWeight: '800', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginHorizontal: 4, marginBottom: 8,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 12,
  },
  optionIcon: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  optionText: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  cancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 16, paddingVertical: 16, marginTop: 4,
  },
  cancelText: { fontSize: 16, fontWeight: '800', color: Colors.textSecondary, marginLeft: 8 },
});
