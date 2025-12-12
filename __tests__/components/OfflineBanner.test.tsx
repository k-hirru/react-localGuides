import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '@/src/components/OfflineBanner';

// Mock useInternetConnectivity to control connectivity state
jest.mock('@/src/hooks/useInternetConnectivity', () => ({
  useInternetConnectivity: () => ({
    isConnected: mockIsConnected,
    isChecking: false,
    checkConnectivity: jest.fn(),
    showOfflineAlert: jest.fn(),
  }),
}));

let mockIsConnected = true;

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockIsConnected = true;
  });

  it('does not render when online', () => {
    const { queryByText } = render(<OfflineBanner />);
    expect(queryByText('No internet connection')).toBeNull();
  });

  it('renders banner when offline', () => {
    mockIsConnected = false;
    const { getByText } = render(<OfflineBanner />);
    expect(getByText('No internet connection')).toBeTruthy();
  });
});
