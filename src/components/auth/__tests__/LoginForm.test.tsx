import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginForm from '../LoginForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth API
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

describe('LoginForm', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders login form correctly', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('displays validation error for empty username', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(usernameInput).toBeInvalid();
    });
  });

  it('displays validation error for empty password', async () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInvalid();
    });
  });

  it('shows loading state when submitting', async () => {
    const { authApi } = require('@/lib/api');
    authApi.login.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('displays error message on login failure', async () => {
    const { authApi } = require('@/lib/api');
    authApi.login.mockRejectedValueOnce({ message: 'Invalid credentials' });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    const { authApi } = require('@/lib/api');
    authApi.login.mockResolvedValueOnce({
      user: {
        id: 'user-id',
        email: 'testuser@strands.local',
        username: 'testuser',
        display_name: 'Testuser',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  it('handles form submission with enter key', async () => {
    const { authApi } = require('@/lib/api');
    authApi.login.mockResolvedValueOnce({
      user: {
        id: 'user-id',
        email: 'testuser@strands.local',
        username: 'testuser',
        display_name: 'Testuser',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(passwordInput.closest('form')!);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalled();
    });
  });
});

