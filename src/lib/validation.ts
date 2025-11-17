import { z } from 'zod';

// User validation schemas
export const signUpSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters').optional(),
  profilePictureUrl: z.string().url('Invalid URL').optional(),
});

// Friend validation schemas
export const sendFriendRequestSchema = z.object({
  friendId: z.string().uuid('Invalid user ID'),
});

export const updateFriendRequestSchema = z.object({
  status: z.enum(['accepted', 'declined'], {
    errorMap: () => ({ message: 'Status must be either accepted or declined' }),
  }),
});

// Group validation schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters'),
  memberIds: z.array(z.string().uuid('Invalid user ID')).optional(),
});

export const addMembersToGroupSchema = z.object({
  memberIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one member is required'),
});

// Image validation schemas
export const uploadImageSchema = z.object({
  groupIds: z.array(z.string().uuid('Invalid group ID')).min(1, 'At least one group is required'),
});

// Strand validation schemas
export const createStrandSchema = z.object({
  content: z.string().max(5000, 'Content must be 5000 characters or less').optional(),
  groupIds: z.array(z.string().uuid('Invalid group ID')).min(1, 'At least one group is required'),
}).refine(
  (data) => data.content?.trim() || true, // At least content or image must be provided (image handled separately)
  { message: 'Either content or image (or both) is required' }
);

export const updateStrandSchema = z.object({
  content: z.string().max(5000, 'Content must be 5000 characters or less').optional(),
  removeImage: z.boolean().optional(),
}).refine(
  (data) => data.content !== undefined || data.removeImage !== undefined,
  { message: 'At least one field must be provided for update' }
);

export const pinStrandSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
});

// Search validation schema
export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
});

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type UpdateFriendRequestInput = z.infer<typeof updateFriendRequestSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMembersToGroupInput = z.infer<typeof addMembersToGroupSchema>;
export type UploadImageInput = z.infer<typeof uploadImageSchema>;
export type CreateStrandInput = z.infer<typeof createStrandSchema>;
export type UpdateStrandInput = z.infer<typeof updateStrandSchema>;
export type PinStrandInput = z.infer<typeof pinStrandSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

