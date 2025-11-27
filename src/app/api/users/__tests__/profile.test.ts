import { GET, PUT } from '../profile/route';
import { NextRequest } from 'next/server';
import { authenticateRequest, getAuthenticatedUser } from '@/lib/middleware';
import { getUserById } from '@/lib/auth';
import { query } from '@/lib/db';

// Mock the middleware and auth utilities
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('GET /api/users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user profile when authenticated', async () => {
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

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-id', email: 'test@example.com', username: 'testuser' },
    });
    (getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest('http://localhost/api/users/profile', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id', 'user-id');
    expect(data).toHaveProperty('email', 'test@example.com');
    expect(data).not.toHaveProperty('password_hash');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/users/profile', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'non-existent-id', email: 'test@example.com', username: 'testuser' },
    });
    (getUserById as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost/api/users/profile', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('User not found');
  });
});

describe('PUT /api/users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user profile after update', async () => {
    const updatedUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Updated Name',
      profile_picture_url: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-id', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [updatedUser],
    });

    const request = new NextRequest('http://localhost/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: 'Updated Name',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id', 'user-id');
    expect(data).toHaveProperty('display_name', 'Updated Name');
    expect(data).not.toHaveProperty('password_hash');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: 'Updated Name',
      }),
    });

    const response = await PUT(request);

    expect(response.status).toBe(401);
  });
});

