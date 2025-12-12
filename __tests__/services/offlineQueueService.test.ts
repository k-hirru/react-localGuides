import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueueService } from '@/src/services/offlineQueueService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const STORAGE_KEY = 'offlineMutations_v1';

describe('offlineQueueService', () => {
  beforeEach(async () => {
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    await offlineQueueService.clear();
  });

  it('enqueues mutations and persists them to AsyncStorage', async () => {
    await offlineQueueService.enqueue({
      type: 'review:add',
      id: 'm1',
      payload: {
        businessId: 'b1',
        userId: 'u1',
        userName: 'Test User',
        userAvatar: '',
        rating: 5,
        text: 'Great place',
        images: [],
      },
      createdAt: new Date().toISOString(),
    });

    const mutations = await offlineQueueService.getAll();
    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toMatchObject({ id: 'm1', type: 'review:add' });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.stringContaining('m1'));
  });

  it('honors MAX_MUTATIONS by trimming older entries', async () => {
    // Enqueue more than the cap (50) and make sure only the newest remain
    const total = 60;
    for (let i = 0; i < total; i++) {
      await offlineQueueService.enqueue({
        type: 'review:helpful',
        id: `m${i}`,
        reviewId: 'r1',
        reviewOwnerId: 'owner',
        taggedBy: 'u1',
        businessId: 'b1',
        delta: 1,
        createdAt: new Date().toISOString(),
      });
    }

    const mutations = await offlineQueueService.getAll();
    // Expect we kept only the newest 50
    expect(mutations).toHaveLength(50);
    expect(mutations[0].id).toBe('m10');
    expect(mutations[mutations.length - 1].id).toBe('m59');
  });

  it('clear() removes all mutations', async () => {
    await offlineQueueService.enqueue({
      type: 'review:delete',
      id: 'delete-1',
      reviewId: 'r1',
      businessId: 'b1',
      createdAt: new Date().toISOString(),
    });

    let mutations = await offlineQueueService.getAll();
    expect(mutations).toHaveLength(1);

    await offlineQueueService.clear();
    mutations = await offlineQueueService.getAll();
    expect(mutations).toHaveLength(0);
  });

  it('replaceAll() overwrites the stored mutations', async () => {
    await offlineQueueService.enqueue({
      type: 'review:add',
      id: 'old',
      payload: {
        businessId: 'b1',
        userId: 'u1',
        userName: 'Test User',
        userAvatar: '',
        rating: 5,
        text: 'Old review',
        images: [],
      },
      createdAt: new Date().toISOString(),
    });

    await offlineQueueService.replaceAll([
      {
        type: 'review:delete',
        id: 'new',
        reviewId: 'r2',
        businessId: 'b2',
        createdAt: new Date().toISOString(),
      },
    ]);

    const mutations = await offlineQueueService.getAll();
    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toMatchObject({ id: 'new', type: 'review:delete' });
  });
});
