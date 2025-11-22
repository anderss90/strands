import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authApi, userApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    signup: jest.fn(),
  },
  userApi: {
    getProfile: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const TestComponent = () => {
  const { user, loading, isAuthenticated, login, signup, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('testuser', 'password123')}>Login</button>
      <button onClick={() => signup('testuser', 'password123')}>Signup</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('provides loading state initially', async () => {
    // Don't set token, so it won't try to fetch profile
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should eventually stop loading
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    }, { timeout: 3000 });
  });

  it('provides not authenticated state when no token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  it('fetches user profile when token exists', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    localStorageMock.setItem('accessToken', 'test-token');
    (userApi.getProfile as jest.Mock).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(userApi.getProfile).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });
  });

  it('clears tokens when profile fetch fails', async () => {
    localStorageMock.setItem('accessToken', 'test-token');
    localStorageMock.setItem('refreshToken', 'refresh-token');
    (userApi.getProfile as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  it('handles login successfully', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (authApi.login as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });
  });

  it('handles signup successfully', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (authApi.signup as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    const signupButton = screen.getByText('Signup');
    
    await act(async () => {
      signupButton.click();
    });

    await waitFor(() => {
      expect(authApi.signup).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });
  });

  it('handles logout', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    localStorageMock.setItem('accessToken', 'test-token');
    localStorageMock.setItem('refreshToken', 'refresh-token');
    (userApi.getProfile as jest.Mock).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    });

    const logoutButton = screen.getByText('Logout');
    
    act(() => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});

