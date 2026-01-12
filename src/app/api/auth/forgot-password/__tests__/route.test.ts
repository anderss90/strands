import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getUserByEmail, generatePasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

// Mock the auth utilities and email service
jest.mock('@/lib/auth', () => ({
  getUserByEmail: jest.fn(),
  generatePasswordResetToken: jest.fn(() => 'test-reset-token'),
}));

jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send password reset email for valid real email', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (getUserByEmail as jest.Mock).mockResolvedValueOnce(mockUser);
    (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('password reset link has been sent');
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(generatePasswordResetToken).toHaveBeenCalledWith('user-id', 'test@example.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'test-reset-token');
  });

  it('should return success even if email does not exist (security)', async () => {
    (getUserByEmail as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('password reset link has been sent');
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should return success for placeholder emails without sending (security)', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'testuser@strands.local',
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (getUserByEmail as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'testuser@strands.local',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('password reset link has been sent');
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should return success even if email sending fails (security)', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Test User',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (getUserByEmail as jest.Mock).mockResolvedValueOnce(mockUser);
    (sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce(new Error('Email service error'));

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('password reset link has been sent');
  });

  it('should reject invalid email format', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
    expect(data.errors).toBeDefined();
  });

  it('should reject missing email', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
  });
});
