import { GET, DELETE } from '../route';
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

describe('GET /api/groups/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns group details when authenticated and member', async () => {
    const mockGroup = {
      id: 'group-1',
      name: 'Test Group',
      created_by: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    const mockMembers = [
      {
        id: 'member-1',
        group_id: 'group-1',
        user_id: 'user-1',
        role: 'admin',
        joined_at: '2024-01-01',
        username: 'testuser',
        display_name: 'Test User',
        profile_picture_url: null,
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [mockGroup] }) // Get group
      .mockResolvedValueOnce({ rows: mockMembers }); // Get members

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id', 'group-1');
    expect(data).toHaveProperty('name', 'Test Group');
    expect(data).toHaveProperty('members');
    expect(Array.isArray(data.members)).toBe(true);
  });

  it('returns 404 when not a member', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Group not found or access denied');
  });

  it('returns 404 when group not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [] }); // Group not found

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Group not found');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/groups/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes group when admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rowCount: 1 }); // Delete group

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Group deleted successfully');
  });

  it('rejects deletion when not admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // Not admin

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Only group admins can delete groups');
  });

  it('rejects deletion when not a member', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Only group admins can delete groups');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups/group-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(401);
  });
});

