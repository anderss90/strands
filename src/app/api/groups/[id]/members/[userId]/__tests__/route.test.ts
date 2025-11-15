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

describe('DELETE /api/groups/[id]/members/[userId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes member when admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ role: 'member' }] }) // Check target member
      .mockResolvedValueOnce({ rowCount: 1 }); // Remove member

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Member removed from group successfully');
  });

  it('allows self-removal', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-2', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'member' }] }) // Check membership (self)
      .mockResolvedValueOnce({ rows: [{ role: 'member' }] }) // Check target member (self)
      .mockResolvedValueOnce({ rowCount: 1 }); // Remove member

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Member removed from group successfully');
  });

  it('rejects removing member when not admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // Not admin

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Only admins can remove other members');
  });

  it('prevents removing last admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Target is admin
      .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // Only one admin

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Cannot remove the last admin from the group');
  });

  it('rejects when target user is not a member', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [] }); // Target not a member

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('User is not a member of this group');
  });

  it('rejects when not a member of group', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Group not found or access denied');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups/group-1/members/user-2', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'group-1', userId: 'user-2' } });

    expect(response.status).toBe(401);
  });
});

