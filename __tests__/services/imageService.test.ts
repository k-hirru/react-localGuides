import { imageService } from '@/src/services/imageService';
import { getAuth } from '@react-native-firebase/auth';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from '@react-native-firebase/storage';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/storage');

describe('imageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure we have a currentUser by default
    const auth = getAuth() as any;
    auth.currentUser = { uid: 'user-1' };
  });

  it('uploads image and returns download URL', async () => {
    const auth = getAuth() as any;
    auth.currentUser = { uid: 'user-1' };

    (uploadString as jest.Mock).mockResolvedValueOnce(undefined);
    (getDownloadURL as jest.Mock).mockResolvedValueOnce('https://example.com/img.jpg');

    const url = await imageService.uploadImage(
      'data:image/jpeg;base64,AAAA',
      'review'
    );

    expect(uploadString).toHaveBeenCalledTimes(1);
    const [storageRef, base64Data] = (uploadString as jest.Mock).mock.calls[0];
    expect(base64Data).toBe('AAAA');
    expect(storageRef).toEqual(expect.objectContaining({ fullPath: expect.any(String) }));
    expect(url).toBe('https://example.com/img.jpg');
  });

  it('throws if user not authenticated on upload', async () => {
    const auth = getAuth() as any;
    auth.currentUser = null;

    await expect(
      imageService.uploadImage('data:image/jpeg;base64,AAAA', 'review')
    ).rejects.toThrow('User must be authenticated to upload images');
  });

  it('deletes image when user authenticated', async () => {
    const auth = getAuth() as any;
    auth.currentUser = { uid: 'user-1' };

    (deleteObject as jest.Mock).mockResolvedValueOnce(undefined);

    await imageService.deleteImage('review-images/user-1/file.jpg');

    expect(ref).toHaveBeenCalledTimes(1);
    const [storage, path] = (ref as jest.Mock).mock.calls[0];
    expect(storage).toBe(getStorage());
    expect(path).toBe('review-images/user-1/file.jpg');
    expect(deleteObject).toHaveBeenCalledTimes(1);
  });

  it('throws if user not authenticated on deleteImage', async () => {
    const auth = getAuth() as any;
    auth.currentUser = null;

    await expect(
      imageService.deleteImage('review-images/user-1/file.jpg')
    ).rejects.toThrow('User must be authenticated to delete images');
  });

  it('deleteImages calls deleteImage for each URL and continues on errors', async () => {
    const spy = jest
      .spyOn(imageService, 'deleteImage')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    await imageService.deleteImages(['url1', 'url2', 'url3']);

    expect(spy).toHaveBeenCalledTimes(3);
  });
});
