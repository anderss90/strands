import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// Mock the middleware and db
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('DELETE /api/friends/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes friend successfully', async () => {
    const mockFriendship = {
      id: 'friendship-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'accepted',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockFriendship] }) // Check friendship exists
      .mockResolvedValueOnce({ rows: [] }); // Delete friendship

    const request = new NextRequest('http://localhost/api/friends/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Friend removed successfully');
  });

  it('returns 404 when friendship not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // No friendship found

    const request = new NextRequest('http://localhost/api/friends/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Friendship not found');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/friends/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'user-2' } });

    expect(response.status).toBe(401);
  });
});

