import { POST } from '../signup/route';
import { NextRequest } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/auth';

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  createUser: jest.fn(),
  getUserByUsername: jest.fn(),
  generateTokens: jest.fn(() => ({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  })),
}));

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'testuser@strands.local',
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Testuser',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (getUserByUsername as jest.Mock).mockResolvedValueOnce(null);
    (createUser as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('tokens');
    expect(data.user.username).toBe('testuser');
    expect(data.user).not.toHaveProperty('password_hash');
    expect(createUser).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('should reject duplicate username', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'testuser@strands.local',
      username: 'testuser',
      password_hash: 'hashed_password',
      display_name: 'Testuser',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (getUserByUsername as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Username is already taken');
  });

  it('should reject invalid data', async () => {
    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: 'ab',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
    expect(data.errors).toBeDefined();
  });
});


