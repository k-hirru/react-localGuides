import EncryptedStorage from 'react-native-encrypted-storage';
import {
  SecureStorageKey,
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearAllSecure,
} from '@/src/services/secureStorage';

jest.mock('react-native-encrypted-storage');

const mockedEncrypted = EncryptedStorage as unknown as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  removeItem: jest.Mock;
  clear: jest.Mock;
};

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serializes non-string values to JSON on setSecureItem', async () => {
    const value = { foo: 'bar' };

    await setSecureItem(SecureStorageKey.SESSION, value);

    expect(mockedEncrypted.setItem).toHaveBeenCalledTimes(1);
    const [key, stored] = mockedEncrypted.setItem.mock.calls[0];
    expect(key).toBe(SecureStorageKey.SESSION);
    expect(stored).toBe(JSON.stringify(value));
  });

  it('returns parsed JSON when getSecureItem receives JSON string', async () => {
    const stored = JSON.stringify({ foo: 'bar' });
    mockedEncrypted.getItem.mockResolvedValueOnce(stored);

    const result = await getSecureItem<{ foo: string }>(SecureStorageKey.SESSION);

    expect(mockedEncrypted.getItem).toHaveBeenCalledWith(SecureStorageKey.SESSION);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns raw string when getSecureItem receives non-JSON', async () => {
    mockedEncrypted.getItem.mockResolvedValueOnce('plain-token');

    const result = await getSecureItem<string>(SecureStorageKey.CUSTOM_API_TOKEN);

    expect(result).toBe('plain-token');
  });

  it('removes a specific key with removeSecureItem', async () => {
    await removeSecureItem(SecureStorageKey.FCM_TOKEN);
    expect(mockedEncrypted.removeItem).toHaveBeenCalledWith(SecureStorageKey.FCM_TOKEN);
  });

  it('clears all secure items with clearAllSecure', async () => {
    await clearAllSecure();
    expect(mockedEncrypted.clear).toHaveBeenCalledTimes(1);
  });
});