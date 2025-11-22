import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
} from '../auth';
import { query } from '../db';

// Mock the database query function
jest.mock('../db', () => ({
  query: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`)),
}));

// Mock jsonwebtoken
const mockJwtSign = jest.fn();
const mockJwtVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  sign: (...args: any[]) => mockJwtSign(...args),
  verify: (...args: any[]) => mockJwtVerify(...args),
}));

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure environment variables are set
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    
    // Setup default mock implementations
    mockJwtSign.mockImplementation((payload: any, secret: string) => {
      return `token_${payload.userId}_${secret}`;
    });
    
    mockJwtVerify.mockImplementation((token: string, secret: string) => {
      // Extract secret from token format: token_userId_secret
      const tokenParts = token.split('_');
      if (tokenParts.length >= 3 && tokenParts[2] === secret) {
        return { userId: tokenParts[1], email: 'test@example.com', username: 'testuser' };
      }
      throw new Error('Invalid token');
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);
      expect(hashed).toBe('hashed_testpassword');
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testpassword';
      const hash = 'hashed_testpassword';
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'wrongpassword';
      const hash = 'hashed_testpassword';
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate an access token', () => {
      const payload = { userId: 'test-id', email: 'test@example.com', username: 'testuser' };
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // Verify that sign was called
      expect(mockJwtSign).toHaveBeenCalled();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const payload = { userId: 'test-id', email: 'test@example.com', username: 'testuser' };
      const token = generateRefreshToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // Verify that sign was called
      expect(mockJwtSign).toHaveBeenCalled();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = { userId: 'test-id', email: 'test@example.com', username: 'testuser' };
      const token = generateAccessToken(payload);
      
      // Token should be in format: token_test-id_test-secret
      const verifiedPayload = verifyAccessToken(token);
      expect(verifiedPayload.userId).toBe('test-id');
      expect(verifiedPayload.email).toBe('test@example.com');
    });

    it('should throw error for invalid token', () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      const token = 'invalid-token';
      expect(() => verifyAccessToken(token)).toThrow('Invalid or expired token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload = { userId: 'test-id', email: 'test@example.com', username: 'testuser' };
      const token = generateRefreshToken(payload);
      
      // Token should be in format: token_test-id_test-refresh-secret
      const verifiedPayload = verifyRefreshToken(token);
      expect(verifiedPayload.userId).toBe('test-id');
    });

    it('should throw error for invalid token', () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      const token = 'invalid-token';
      expect(() => verifyRefreshToken(token)).toThrow('Invalid or expired refresh token');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await getUserByEmail('test@example.com');
      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    });

    it('should return null when user not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await getUserByEmail('notfound@example.com');
      expect(user).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await getUserByUsername('testuser');
      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = $1', ['testuser']);
    });

    it('should return null when user not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await getUserByUsername('notfound');
      expect(user).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await getUserById('user-id');
      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['user-id']);
    });

    it('should return null when user not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await getUserById('not-found-id');
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@strands.local',
        username: 'newuser',
        password_hash: 'hashed_password123',
        display_name: 'Newuser',
        profile_picture_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await createUser(
        'newuser',
        'password123'
      );

      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'newuser@strands.local',
          'newuser',
          expect.stringContaining('hashed_'), // Password will be hashed
          'Newuser'
        ])
      );
    });
  });
});

