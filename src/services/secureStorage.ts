import EncryptedStorage from 'react-native-encrypted-storage';

export enum SecureStorageKey {
  FCM_TOKEN = 'fcm_token',
  SESSION = 'session',
  CUSTOM_API_TOKEN = 'custom_api_token',
}

export async function setSecureItem<T = string>(key: SecureStorageKey, value: T): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await EncryptedStorage.setItem(key, serialized);
}

export async function getSecureItem<T = string>(key: SecureStorageKey): Promise<T | null> {
  const raw = await EncryptedStorage.getItem(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Not JSON, return as string
    return raw as unknown as T;
  }
}

export async function removeSecureItem(key: SecureStorageKey): Promise<void> {
  await EncryptedStorage.removeItem(key);
}

export async function clearAllSecure(): Promise<void> {
  await EncryptedStorage.clear();
}
