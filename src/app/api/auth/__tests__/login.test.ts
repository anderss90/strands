import { POST } from '../login/route';
import { NextRequest } from 'next/server';
import { getUserByUsername, verifyPassword } from '@/lib/auth';

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  getUserByUsername: jest.fn(),
  verifyPassword: jest.fn(),
  generateTokens: jest.fn(() => ({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  })),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login user successfully', async () => {
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

    (getUserByUsername as jest.Mock).mockResolvedValueOnce(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValueOnce(true);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('tokens');
    expect(data.user.username).toBe('testuser');
    expect(data.user).not.toHaveProperty('password_hash');
  });

  it('should reject invalid username', async () => {
    (getUserByUsername as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'nonexistent',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid username or password');
  });

  it('should reject invalid password', async () => {
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

    (getUserByUsername as jest.Mock).mockResolvedValueOnce(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValueOnce(false);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid username or password');
  });

  it('should reject invalid data', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: '',
        password: '',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
    expect(data.errors).toBeDefined();
  });
});


