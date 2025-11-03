// src/services/imageService.ts
export const imageService = {
  async uploadImage(imageBase64: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', imageBase64.replace('data:image/jpeg;base64,', ''));

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=a3c41ec52bbbb7f6ae670e3a153287e7`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
      if (data.success) {
        return data.data.url; // Returns CDN URL like "https://i.ibb.co/abc123/image.jpg"
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  },
};