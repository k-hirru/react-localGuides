import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ReviewCard from '@/src/components/ReviewCard';
import { Review, Business } from '@/src/types';

jest.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('@/src/services/reviewService', () => ({
  reviewService: {
    hasUserVoted: jest.fn().mockResolvedValue(false),
    addHelpfulVote: jest.fn(),
    removeHelpfulVote: jest.fn(),
    updateReviewHelpfulCount: jest.fn(),
  },
}));

jest.mock('@/src/services/offlineQueueService', () => ({
  offlineQueueService: {
    enqueue: jest.fn(),
  },
}));

const baseBusiness: Business = {
  id: 'b1',
  name: 'Test Cafe',
  category: 'restaurants',
  rating: 4.5,
  reviewCount: 10,
  priceLevel: 2,
  imageUrl: 'https://example.com/image.jpg',
  address: '123 Street',
  phone: '123-456',
  website: 'https://example.com',
  hours: {},
  coordinates: { latitude: 0, longitude: 0 },
  photos: [],
  description: 'Nice place',
  features: [],
  placeId: 'b1',
  source: 'geoapify',
};

const makeReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'r1',
  businessId: 'b1',
  userId: 'u2',
  userName: 'Jane Doe',
  userAvatar: '',
  rating: 5,
  text: 'Great place',
  date: '2024-01-01',
  createdAt: new Date(),
  updatedAt: new Date(),
  helpful: 0,
  images: [],
  ...overrides,
});

describe('ReviewCard', () => {
  it('shows a Pending sync badge for offline reviews (id starts with offline-)', async () => {
    const review = makeReview({ id: 'offline-123' });

    render(<ReviewCard review={review} business={baseBusiness} isUsersReview={true} />);

    expect(await screen.findByText('Pending sync')).toBeTruthy();
  });

  it('falls back to initials when no custom avatar is provided', async () => {
    const review = makeReview({ userName: 'Jane Doe', userAvatar: '' });

    const { getByText } = render(<ReviewCard review={review} business={baseBusiness} />);

    // Initials should be "JD"
    expect(getByText('JD')).toBeTruthy();
  });
});
