import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';

const mockConnectivity = {
  isConnected: true,
  checkConnectivity: jest.fn().mockResolvedValue(true),
  showOfflineAlert: jest.fn(),
};

jest.mock('@/src/hooks/useInternetConnectivity', () => ({
  useInternetConnectivity: () => mockConnectivity,
}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('useProtectedAction (offline alert behavior)', () => {
  beforeEach(() => {
    (Alert.alert as jest.Mock).mockClear();
    mockConnectivity.isConnected = true;
    mockConnectivity.checkConnectivity.mockResolvedValue(true);
  });

  it('shows a retry/cancel alert when offline and retry=true', async () => {
    mockConnectivity.isConnected = false;
    mockConnectivity.checkConnectivity.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useProtectedAction());
    const { protectedAction } = result.current;

    const action = jest.fn().mockResolvedValue('ok');

    await act(async () => {
      await protectedAction(action, {
        actionName: 'Loading nearby places',
        showAlert: true,
        retry: true,
      });
    });

    expect(action).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'No Internet Connection',
      'Loading nearby places requires an internet connection.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Retry' }),
      ]),
    );
  });

  it('shows a single OK alert when offline and retry=false', async () => {
    mockConnectivity.isConnected = false;
    mockConnectivity.checkConnectivity.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useProtectedAction());
    const { protectedAction } = result.current;

    const action = jest.fn().mockResolvedValue('ok');

    await act(async () => {
      await protectedAction(action, {
        actionName: 'Loading business details',
        showAlert: true,
        retry: false,
      });
    });

    expect(action).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'No Internet Connection',
      'Loading business details requires an internet connection.',
      [{ text: 'OK' }],
    );
  });

  it('does not show an alert when showAlert=false even if offline', async () => {
    mockConnectivity.isConnected = false;
    mockConnectivity.checkConnectivity.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useProtectedAction());
    const { protectedAction } = result.current;

    const action = jest.fn().mockResolvedValue('ok');

    await act(async () => {
      await protectedAction(action, {
        actionName: 'Saving favorite',
        showAlert: false,
        retry: false,
      });
    });

    expect(action).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
