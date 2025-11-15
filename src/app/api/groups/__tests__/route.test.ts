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

describe('GET /api/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns groups list when authenticated', async () => {
    const mockGroups = [
      {
        id: 'group-1',
        name: 'Test Group',
        created_by: 'user-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        user_role: 'admin',
        joined_at: '2024-01-01',
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: mockGroups });

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('id', 'group-1');
    expect(data[0]).toHaveProperty('name', 'Test Group');
    expect(data[0]).toHaveProperty('userRole', 'admin');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns empty array when no groups', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

describe('POST /api/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a group successfully', async () => {
    const mockGroup = {
      id: 'group-1',
      name: 'Test Group',
      created_by: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockGroup] }) // Create group
      .mockResolvedValueOnce({ rowCount: 1 }); // Add creator as admin

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Group' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id', 'group-1');
    expect(data).toHaveProperty('name', 'Test Group');
    expect(data).toHaveProperty('createdBy', 'user-1');
  });

  it('creates a group with members successfully', async () => {
    const mockGroup = {
      id: 'group-1',
      name: 'Test Group',
      created_by: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockGroup] }) // Create group
      .mockResolvedValueOnce({ rowCount: 1 }) // Add creator as admin
      .mockResolvedValueOnce({ rows: [{ friend_id: '00000000-0000-0000-0000-000000000002' }, { friend_id: '00000000-0000-0000-0000-000000000003' }] }) // Verify friends
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] }) // Add member 1
      .mockResolvedValueOnce({ rows: [{ id: 'member-2' }] }); // Add member 2

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Group',
        memberIds: ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id', 'group-1');
  });

  it('rejects group creation with non-friend members', async () => {
    const mockGroup = {
      id: 'group-1',
      name: 'Test Group',
      created_by: 'user-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockGroup] }) // Create group
      .mockResolvedValueOnce({ rowCount: 1 }) // Add creator as admin
      .mockResolvedValueOnce({ rows: [] }) // No friends found
      .mockResolvedValueOnce({ rowCount: 1 }); // Delete group (rollback)

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Group',
        memberIds: ['00000000-0000-0000-0000-000000000002'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('All members must be your friends');
  });

  it('rejects invalid group name', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Group' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});

