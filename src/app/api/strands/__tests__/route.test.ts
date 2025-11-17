// All mocks must be declared before any imports to ensure proper hoisting
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabase: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
      })),
    },
  })),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

import { GET, POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('/api/strands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuthenticateRequest.mockResolvedValue(
        NextResponse.json({ message: 'Authorization token is required' }, { status: 401 })
      );

      const request = new NextRequest('http://localhost:3000/api/strands');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Authorization token is required');
    });

    it('should return strands feed for authenticated user', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        user: { userId: 'user-1', email: 'test@test.com', username: 'testuser', isAdmin: false },
      } as any);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'strand-1', created_at: new Date() }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'strand-1',
              user_id: 'user-1',
              content: 'Test content',
              image_id: null,
              created_at: new Date(),
              updated_at: new Date(),
              edited_at: null,
              username: 'testuser',
              display_name: 'Test User',
              profile_picture_url: null,
              groups: [],
            },
          ],
        } as any);

      const request = new NextRequest('http://localhost:3000/api/strands');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.strands).toHaveLength(1);
      expect(data.strands[0].content).toBe('Test content');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuthenticateRequest.mockResolvedValue(
        NextResponse.json({ message: 'Authorization token is required' }, { status: 401 })
      );

      const formData = new FormData();
      formData.append('content', 'Test strand');
      formData.append('groupIds', JSON.stringify(['group-1']));

      const request = new NextRequest('http://localhost:3000/api/strands', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Authorization token is required');
    });

    it('should return 400 if neither content nor file provided', async () => {
      mockAuthenticateRequest.mockResolvedValue({
        user: { userId: 'user-1', email: 'test@test.com', username: 'testuser' },
      } as any);

      const formData = new FormData();
      formData.append('groupIds', JSON.stringify(['group-1']));

      const request = new NextRequest('http://localhost:3000/api/strands', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('Either content or image');
    });
  });
});

