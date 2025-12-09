import { notificationService } from '@/src/services/notificationService';
import { SecureStorageKey } from '@/src/services/secureStorage';
import EncryptedStorage from 'react-native-encrypted-storage';
import messaging from '@react-native-firebase/messaging';

jest.mock('react-native-encrypted-storage');

const mockedEncrypted = EncryptedStorage as unknown as {
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

// Our Jest setup mocks messaging() as a function that returns an instance
const mockedMessagingInstance = (messaging as any)();

describe('notificationService - token management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores FCM token in secure storage when permission granted', async () => {
    mockedMessagingInstance.requestPermission = jest
      .fn()
      .mockResolvedValue((messaging as any).AuthorizationStatus.AUTHORIZED);
    mockedMessagingInstance.getToken = jest
      .fn()
      .mockResolvedValue('fcm-token');

    const token = await notificationService.requestPermissionAndGetToken();

    expect(mockedMessagingInstance.requestPermission).toHaveBeenCalled();
    expect(mockedMessagingInstance.getToken).toHaveBeenCalled();
    expect(token).toBe('fcm-token');
    expect(mockedEncrypted.setItem).toHaveBeenCalledWith(
      SecureStorageKey.FCM_TOKEN,
      'fcm-token'
    );
  });

  it('clears cached token and removes from storage on clearCachedToken', () => {
    // seed internal cache by setting it via type cast
    (notificationService as any).cachedToken = 'cached';

    notificationService.clearCachedToken();

    expect((notificationService as any).cachedToken).toBeNull();
    expect(mockedEncrypted.removeItem).toHaveBeenCalledWith(SecureStorageKey.FCM_TOKEN);
  });
});