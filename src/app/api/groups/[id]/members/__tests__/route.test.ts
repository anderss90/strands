import { POST } from '../route';
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

describe('POST /api/groups/[id]/members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds members to group successfully', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ friend_id: '00000000-0000-0000-0000-000000000002' }, { friend_id: '00000000-0000-0000-0000-000000000003' }] }) // Verify friends
      .mockResolvedValueOnce({ rows: [] }) // Check existing members
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] }) // Add member 1
      .mockResolvedValueOnce({ rows: [{ id: 'member-2' }] }); // Add member 2

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Added');
    expect(data).toHaveProperty('addedMemberIds');
    expect(data.addedMemberIds).toEqual(['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']);
  });

  it('rejects adding non-friends', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [] }); // No friends

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['00000000-0000-0000-0000-000000000002'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('All members must be your friends');
  });

  it('skips already existing members', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ friend_id: '00000000-0000-0000-0000-000000000002' }, { friend_id: '00000000-0000-0000-0000-000000000003' }] }) // Verify friends
      .mockResolvedValueOnce({ rows: [{ user_id: '00000000-0000-0000-0000-000000000002' }] }) // user-2 already exists
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] }); // Add user-3

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.addedMemberIds).toEqual(['00000000-0000-0000-0000-000000000003']);
  });

  it('rejects when all members already exist', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ friend_id: '00000000-0000-0000-0000-000000000002' }] }) // Verify friends
      .mockResolvedValueOnce({ rows: [{ user_id: '00000000-0000-0000-0000-000000000002' }] }); // Already exists

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['00000000-0000-0000-0000-000000000002'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('All specified users are already members of this group');
  });

  it('rejects when not a member of group', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['00000000-0000-0000-0000-000000000002'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Group not found or access denied');
  });

  it('rejects empty member list', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: [] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups/group-1/members', {
      method: 'POST',
      body: JSON.stringify({ memberIds: ['user-2'] }),
    });

    const response = await POST(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(401);
  });
});

