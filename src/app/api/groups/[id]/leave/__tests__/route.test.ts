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

describe('POST /api/groups/[id]/leave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows member to leave group', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'member' }] }) // Check membership
      .mockResolvedValueOnce({ rowCount: 1 }); // Remove member

    const request = new NextRequest('http://localhost/api/groups/group-1/leave', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Left group successfully');
  });

  it('allows admin to leave if not last admin', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // Multiple admins
      .mockResolvedValueOnce({ rowCount: 1 }); // Remove member

    const request = new NextRequest('http://localhost/api/groups/group-1/leave', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Left group successfully');
  });

  it('prevents last admin from leaving', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // Only one admin

    const request = new NextRequest('http://localhost/api/groups/group-1/leave', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain('Cannot leave group as the last admin');
  });

  it('rejects when not a member', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/groups/group-1/leave', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('You are not a member of this group');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups/group-1/leave', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(401);
  });
});

