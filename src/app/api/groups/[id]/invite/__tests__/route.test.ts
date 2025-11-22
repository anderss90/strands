import { POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

jest.mock('@/lib/middleware');
jest.mock('@/lib/db');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token-12345'),
  })),
}));

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('POST /api/groups/[id]/invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create invite for group member', async () => {
    const mockUser = { userId: 'user-1', email: 'test@test.com', username: 'testuser', isAdmin: false };
    mockAuthenticateRequest.mockResolvedValue({ user: mockUser } as any);

    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: 'member' }],
      } as any)
      .mockResolvedValueOnce({
        rows: [{
          id: 'invite-1',
          token: 'mock-token-12345',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        }],
      } as any);

    const request = new NextRequest('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
      },
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('inviteUrl');
    expect(data.inviteUrl).toContain('/invite/');
  });

  it('should return 404 if user is not a group member', async () => {
    const mockUser = { userId: 'user-1', email: 'test@test.com', username: 'testuser', isAdmin: false };
    mockAuthenticateRequest.mockResolvedValue({ user: mockUser } as any);

    mockQuery.mockResolvedValueOnce({
      rows: [],
    } as any);

    const request = new NextRequest('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
      },
    });

    const response = await POST(request, { params: { id: 'group-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toContain('Group not found or access denied');
  });

  it('should return 401 if not authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue(
      NextResponse.json({ message: 'Authorization token is required' }, { status: 401 }) as any
    );

    const request = new NextRequest('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'group-1' } });

    expect(response.status).toBe(401);
  });
});

