import { GET, POST } from '../route';
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

describe('GET /api/friends/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns friend requests when authenticated', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        user_id: 'user-1',
        friend_id: 'user-2',
        status: 'pending',
        created_at: '2024-01-01',
        sender_id: 'user-1',
        sender_username: 'senderuser',
        sender_display_name: 'Sender User',
        sender_profile_picture_url: null,
        receiver_id: 'user-2',
        receiver_username: 'receiveruser',
        receiver_display_name: 'Receiver User',
        receiver_profile_picture_url: null,
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: mockRequests });

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('isReceived', true);
    expect(data[0]).toHaveProperty('sender');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/friends/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates friend request successfully', async () => {
    const mockRequest = {
      id: 'request-1',
      user_id: 'user-1',
      friend_id: 'user-2',
      status: 'pending',
      created_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // No existing friendship
      .mockResolvedValueOnce({ rows: [mockRequest] }); // Created request

    // Use valid UUID format for friendId
    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId: '123e4567-e89b-12d3-a456-426614174000' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('message', 'Friend request sent successfully');
  });

  it('returns 400 when trying to friend yourself', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: '123e4567-e89b-12d3-a456-426614174001', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId: '123e4567-e89b-12d3-a456-426614174001' }), // Same as user ID
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Cannot send friend request to yourself');
  });

  it('returns 400 when already friends', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: '123e4567-e89b-12d3-a456-426614174001', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ status: 'accepted' }],
    });

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId: '123e4567-e89b-12d3-a456-426614174000' }), // Valid UUID
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Already friends');
  });

  it('returns 400 when request already pending', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: '123e4567-e89b-12d3-a456-426614174001', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ status: 'pending' }],
    });

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId: '123e4567-e89b-12d3-a456-426614174000' }), // Valid UUID
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Friend request already sent');
  });

  it('returns 400 for invalid data', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId: 'invalid-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Validation error');
  });
});

