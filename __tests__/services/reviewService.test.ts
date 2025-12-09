import { reviewService } from '@/src/services/reviewService';
import { imageService } from '@/src/services/imageService';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  deleteDoc,
} from '@react-native-firebase/firestore';

jest.mock('@/src/services/imageService', () => ({
  imageService: {
    deleteImages: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@react-native-firebase/firestore');

const mockedGetDocs = getDocs as unknown as jest.Mock;
const mockedGetDoc = getDoc as unknown as jest.Mock;
const mockedDeleteDoc = deleteDoc as unknown as jest.Mock;

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getReviewsForBusiness maps snapshots into Review objects', async () => {
    const snap = {
      size: 1,
      forEach: (cb: (d: any) => void) => {
        cb({
          id: 'r1',
          data: () => ({
            businessId: 'b1',
            userId: 'u1',
            userName: 'User',
            userAvatar: 'avatar.png',
            rating: 5,
            text: 'Great!',
            images: ['img1'],
            helpful: 2,
            date: { toDate: () => new Date('2024-01-01T00:00:00Z') },
            createdAt: { toDate: () => new Date('2024-01-02T00:00:00Z') },
            updatedAt: { toDate: () => new Date('2024-01-03T00:00:00Z') },
          }),
        });
      },
    };

    mockedGetDocs.mockResolvedValueOnce(snap);

    const reviews = await reviewService.getReviewsForBusiness('b1');

    expect(mockedGetDocs).toHaveBeenCalledTimes(1);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      id: 'r1',
      businessId: 'b1',
      userId: 'u1',
      rating: 5,
      text: 'Great!',
      helpful: 2,
    });
    expect(reviews[0].date).toBe('2024-01-01');
  });

  it('deleteReview removes associated images then deletes review doc', async () => {
    const snap = {
      exists: true,
      data: () => ({ images: ['img1', 'img2'] }),
    } as any;

    mockedGetDoc.mockResolvedValueOnce(snap);
    mockedDeleteDoc.mockResolvedValueOnce(undefined);

    await reviewService.deleteReview('r1');

    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    expect(imageService.deleteImages).toHaveBeenCalledWith(['img1', 'img2']);
    expect(mockedDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
