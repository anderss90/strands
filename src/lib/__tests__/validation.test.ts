import {
  signUpSchema,
  loginSchema,
  updateProfileSchema,
  sendFriendRequestSchema,
  updateFriendRequestSchema,
  createGroupSchema,
  addMembersToGroupSchema,
  uploadImageSchema,
  searchSchema,
} from '../validation';

describe('Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        username: 'testuser',
        password: 'password123',
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const invalidData = {
        username: 'ab',
        password: 'password123',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        password: 'short',
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        username: 'testuser',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        username: 'testuser',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate correct profile update data', () => {
      const validData = {
        displayName: 'Updated Name',
        profilePictureUrl: 'https://example.com/image.jpg',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept partial data', () => {
      const validData = {
        displayName: 'Updated Name',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        profilePictureUrl: 'not-a-url',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('sendFriendRequestSchema', () => {
    it('should validate correct friend request data', () => {
      const validData = {
        friendId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = sendFriendRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        friendId: 'invalid-id',
      };

      const result = sendFriendRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateFriendRequestSchema', () => {
    it('should validate accepted status', () => {
      const validData = {
        status: 'accepted' as const,
      };

      const result = updateFriendRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate declined status', () => {
      const validData = {
        status: 'declined' as const,
      };

      const result = updateFriendRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'invalid' as any,
      };

      const result = updateFriendRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createGroupSchema', () => {
    it('should validate correct group data', () => {
      const validData = {
        name: 'Test Group',
        memberIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };

      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept group without members', () => {
      const validData = {
        name: 'Test Group',
      };

      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty group name', () => {
      const invalidData = {
        name: '',
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('addMembersToGroupSchema', () => {
    it('should validate correct member data', () => {
      const validData = {
        memberIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };

      const result = addMembersToGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty member array', () => {
      const invalidData = {
        memberIds: [],
      };

      const result = addMembersToGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('uploadImageSchema', () => {
    it('should validate correct image data', () => {
      const validData = {
        groupIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };

      const result = uploadImageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty group array', () => {
      const invalidData = {
        groupIds: [],
      };

      const result = uploadImageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('searchSchema', () => {
    it('should validate correct search query', () => {
      const validData = {
        q: 'test query',
      };

      const result = searchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const invalidData = {
        q: '',
      };

      const result = searchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});


