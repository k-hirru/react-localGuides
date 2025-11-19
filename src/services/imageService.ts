// src/services/imageService.ts
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';

export const imageService = {
  /**
   * Upload an image to Firebase Storage
   * @param imageBase64 - Base64 encoded image string
   * @param type - Image type: 'review' or 'profile'
   * @returns Firebase Storage download URL
   */
  async uploadImage(
    imageBase64: string,
    type: 'review' | 'profile' = 'review'
  ): Promise<string> {
    try {
      const user = getAuth().currentUser;

      if (!user) {
        throw new Error('User must be authenticated to upload images');
      }

      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(
        /^data:image\/\w+;base64,/,
        ''
      );

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}_${randomId}.jpg`;

      // Determine storage path based on type
      const storagePath =
        type === 'profile'
          ? `profile-images/${user.uid}/${filename}`
          : `review-images/${user.uid}/${filename}`;

      console.log('📤 Uploading image to:', storagePath);

      // Create reference to storage location
      const storageRef = ref(getStorage(), storagePath);

      // Upload the base64 string
      await uploadString(storageRef, base64Data, 'base64', {
        contentType: 'image/jpeg',
      });

      console.log('✅ Image uploaded successfully');

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      if (__DEV__) {
        // Avoid logging full signed URLs in non-dev builds
        console.log('🔗 Image uploaded (download URL hidden)');
      }

      return downloadURL;
    } catch (error: any) {
      console.error('❌ Image upload error:', error);

      // Provide user-friendly error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error(
          'You do not have permission to upload images. Please sign in again.'
        );
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was cancelled');
      } else if (error.code === 'storage/unknown') {
        throw new Error(
          'An unknown error occurred during upload. Please try again.'
        );
      } else {
        throw new Error(error.message || 'Failed to upload image');
      }
    }
  },

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl - Full Firebase Storage download URL
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const user = getAuth().currentUser;

      if (!user) {
        throw new Error('User must be authenticated to delete images');
      }

      // Extract the storage path from the URL
      const storageRef = ref(getStorage(), imageUrl);

      console.log('🗑️ Deleting image:', storageRef.fullPath);

      await deleteObject(storageRef);

      console.log('✅ Image deleted successfully');
    } catch (error: any) {
      console.error('❌ Image deletion error:', error);

      if (error.code === 'storage/object-not-found') {
        console.warn('Image already deleted or does not exist');
        return; // Don't throw error if image doesn't exist
      }

      throw new Error(error.message || 'Failed to delete image');
    }
  },

  /**
   * Delete multiple images from Firebase Storage
   * @param imageUrls - Array of Firebase Storage download URLs
   */
  async deleteImages(imageUrls: string[]): Promise<void> {
    try {
      const deletePromises = imageUrls.map((url) =>
        this.deleteImage(url).catch((error) => {
          console.warn('Failed to delete image:', url, error);
          // Continue deleting other images even if one fails
        })
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      throw error;
    }
  },
};