import { PUT } from '../../[id]/route';
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

describe('PUT /api/friends/requests/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts friend request successfully', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'pending',
    };

    const mockUpdated = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'accepted',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockRequest] }) // Get request
      .mockResolvedValueOnce({ rows: [mockUpdated] }); // Update request

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'accepted' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('accepted');
    expect(data.message).toBe('Friend request accepted');
  });

  it('declines friend request successfully', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'pending',
    };

    const mockUpdated = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'blocked',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockRequest] }) // Get request
      .mockResolvedValueOnce({ rows: [mockUpdated] }); // Update request

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'declined' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('blocked');
    expect(data.message).toBe('Friend request declined');
  });

  it('returns 404 when request not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'accepted' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Friend request not found');
  });

  it('returns 403 when not the receiver', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-3', // Different user
      status: 'pending',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [mockRequest] });

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'accepted' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Unauthorized to update this request');
  });

  it('returns 400 when request is not pending', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'accepted', // Already accepted
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [mockRequest] });

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'accepted' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Friend request is not pending');
  });

  it('returns 400 for invalid status', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'pending',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [mockRequest] });

    const request = new NextRequest('http://localhost/api/friends/requests/request-1', {
      method: 'PUT',
      body: JSON.stringify({ status: 'invalid' }),
    });

    const response = await PUT(request, { params: { id: 'request-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
  });
});

