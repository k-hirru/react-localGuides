import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple versioned key so we can change the schema later without conflicts.
const STORAGE_KEY = 'offlineMutations_v1';

// Guardrail to prevent unbounded growth if the app stays offline
// for a long time or something constantly fails to sync.
const MAX_MUTATIONS = 50;

export type OfflineMutation =
  | {
      type: 'review:add';
      id: string;
      payload: {
        businessId: string;
        userId: string;
        userName: string;
        userAvatar: string;
        rating: number;
        text: string;
        images: string[];
      };
      createdAt: string;
    }
  | {
      type: 'review:delete';
      id: string;
      reviewId: string;
      businessId: string;
      createdAt: string;
    }
  | {
      type: 'review:helpful';
      id: string;
      reviewId: string;
      reviewOwnerId: string;
      taggedBy: string;
      businessId: string;
      delta: 1 | -1;
      createdAt: string;
    };

interface StoredState {
  mutations: OfflineMutation[];
}

const loadState = async (): Promise<StoredState> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { mutations: [] };
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || !Array.isArray(parsed.mutations)) {
      return { mutations: [] };
    }

    // Drop obviously malformed entries and hard-cap the queue size
    const trimmed = parsed.mutations.slice(-MAX_MUTATIONS).filter(Boolean);
    return { mutations: trimmed };
  } catch (error) {
    console.warn('⚠️ offlineQueueService: failed to load state', error);
    return { mutations: [] };
  }
};

const saveState = async (state: StoredState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('⚠️ offlineQueueService: failed to save state', error);
  }
};

export const offlineQueueService = {
  async enqueue(mutation: OfflineMutation): Promise<void> {
    const state = await loadState();
    state.mutations.push(mutation);

    // Enforce a simple FIFO cap so the queue cannot grow without bound.
    if (state.mutations.length > MAX_MUTATIONS) {
      state.mutations.splice(0, state.mutations.length - MAX_MUTATIONS);
    }

    await saveState(state);
  },

  async getAll(): Promise<OfflineMutation[]> {
    const state = await loadState();
    return state.mutations;
  },

  async clear(): Promise<void> {
    await saveState({ mutations: [] });
  },

  async replaceAll(mutations: OfflineMutation[]): Promise<void> {
    await saveState({ mutations });
  },
};
