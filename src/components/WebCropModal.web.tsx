// src/components/WebCropModal.web.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

interface WebCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
}

export default function WebCropModal({ visible, imageUri, onClose, onCropComplete }: WebCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteInternal = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (imageUri && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageUri, croppedAreaPixels, 0);
        if (croppedImage) {
          onCropComplete(croppedImage);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.cropContainer}>
            <Cropper
              image={imageUri}
              crop={crop}
              zoom={zoom}
              aspect={2 / 3}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={setZoom}
            />
          </View>
          
          <View style={styles.controls}>
            <Text style={{ color: '#fff', marginBottom: 10 }}>Zoom</Text>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 20 }}
            />
            
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.btnText}>Apply Crop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cropContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#333',
  },
  controls: {
    padding: 20,
    backgroundColor: '#222',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    padding: 15,
    backgroundColor: '#444',
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveBtn: {
    padding: 15,
    backgroundColor: '#E50914',
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
