import { POST } from '../route';
import { NextRequest } from 'next/server';
import { verifyPasswordResetToken, updateUserPassword, getUserById } from '@/lib/auth';

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  verifyPasswordResetToken: jest.fn(),
  updateUserPassword: jest.fn(),
  getUserById: jest.fn(),
}));

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset password successfully', async () => {
    const mockTokenPayload = {
      userId: 'user-id',
      email: 'test@example.com',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'old_hashed_password',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (verifyPasswordResetToken as jest.Mock).mockReturnValueOnce(mockTokenPayload);
    (getUserById as jest.Mock).mockResolvedValueOnce(mockUser);
    (updateUserPassword as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-reset-token',
        password: 'newpassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Password has been reset successfully');
    expect(verifyPasswordResetToken).toHaveBeenCalledWith('valid-reset-token');
    expect(getUserById).toHaveBeenCalledWith('user-id');
    expect(updateUserPassword).toHaveBeenCalledWith('user-id', 'newpassword123');
  });

  it('should reject invalid or expired token', async () => {
    (verifyPasswordResetToken as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid or expired password reset token');
    });

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid-token',
        password: 'newpassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid or expired reset token');
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('should reject if user not found', async () => {
    const mockTokenPayload = {
      userId: 'non-existent-id',
      email: 'test@example.com',
    };

    (verifyPasswordResetToken as jest.Mock).mockReturnValueOnce(mockTokenPayload);
    (getUserById as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'newpassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('User not found');
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('should reject if email mismatch', async () => {
    const mockTokenPayload = {
      userId: 'user-id',
      email: 'old@example.com',
    };

    const mockUser = {
      id: 'user-id',
      email: 'new@example.com', // Different email
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (verifyPasswordResetToken as jest.Mock).mockReturnValueOnce(mockTokenPayload);
    (getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'newpassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid reset token');
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('should reject invalid data', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: '',
        password: 'short', // Too short
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
    expect(data.errors).toBeDefined();
  });

  it('should reject missing fields', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        password: 'newpassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
  });
});
