import { renderHook, act } from '@testing-library/react-native';
import { useProtectedAction } from '@/src/hooks/useProtectedAction';

// Shared mutable mock so we can flip connectivity between tests without
// re-importing the hook or modules.
const mockConnectivity = {
  isConnected: true,
  checkConnectivity: jest.fn().mockResolvedValue(true),
  showOfflineAlert: jest.fn(),
};

jest.mock('@/src/hooks/useInternetConnectivity', () => ({
  useInternetConnectivity: () => mockConnectivity,
}));

describe('useProtectedAction', () => {
  it('runs the action when connected', async () => {
    const { result } = renderHook(() => useProtectedAction());
    const { protectedAction } = result.current;

    const action = jest.fn().mockResolvedValue('ok');

    let value: any;
    await act(async () => {
      value = await protectedAction(action, { actionName: 'Test action', showAlert: false });
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(value).toBe('ok');
  });

  it('returns false and does not call action when offline', async () => {
    // Flip the shared connectivity mock to simulate offline
    mockConnectivity.isConnected = false;
    mockConnectivity.checkConnectivity.mockResolvedValueOnce(false);

    const { result } = renderHook(() => useProtectedAction());
    const { protectedAction } = result.current;

    const action = jest.fn().mockResolvedValue('ok');

    let value: any;
    await act(async () => {
      value = await protectedAction(action, {
        actionName: 'Offline action',
        showAlert: false,
        retry: false,
      });
    });

    expect(action).not.toHaveBeenCalled();
    expect(value).toBe(false);
  });
});
