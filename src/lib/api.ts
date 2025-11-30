// API utility functions for client-side requests

// Import fetch utilities
import { fetchWithRetry, isNetworkError, getErrorMessage } from './utils/fetchWithRetry';

// Use relative URLs for API calls in the browser
const API_BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || '');

export interface ApiError {
  message: string;
  statusCode?: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Safely get token from localStorage
  let token: string | null = null;
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  } catch (error) {
    // localStorage might not be available (e.g., private browsing)
    // Continue without token - API will return 401 if needed
    console.warn('Unable to access localStorage:', error);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      // Safely clear tokens
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } catch (error) {
        // Ignore storage errors
        console.warn('Failed to clear tokens:', error);
      }
      
      // Redirect to login page (avoid redirect if already on login/signup page)
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup') && !currentPath.startsWith('/invite')) {
        window.location.href = '/login';
      }
    }

    const error: ApiError = await response.json().catch(() => ({
      message: 'An error occurred',
      statusCode: response.status,
    }));
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

// Auth API functions
export const authApi = {
  signup: async (data: { username: string; password: string; inviteToken?: string }) => {
    return apiRequest<{ user: any; tokens: { accessToken: string; refreshToken: string }; groupId?: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: { username: string; password: string }) => {
    return apiRequest<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  refresh: async (refreshToken: string) => {
    return apiRequest<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  },
};

// User API functions
export const userApi = {
  getProfile: async () => {
    return apiRequest<{
      id: string;
      email: string;
      username: string;
      display_name: string;
      profile_picture_url: string | null;
      is_admin?: boolean;
      isAdmin?: boolean;
      created_at: string;
      updated_at: string;
    }>('/api/users/profile');
  },

  updateProfile: async (data: { displayName?: string; profilePictureUrl?: string }) => {
    return apiRequest<{
      id: string;
      email: string;
      username: string;
      display_name: string;
      profile_picture_url: string | null;
      created_at: string;
      updated_at: string;
    }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  search: async (query: string) => {
    return apiRequest<{
      id: string;
      email: string;
      username: string;
      displayName: string;
      profilePictureUrl: string | null;
      createdAt?: string;
    }[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
  },
};

// Friend API functions
export interface Friend {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  friendshipCreatedAt: string;
}

export interface FriendRequest {
  id: string;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  } | null;
  receiver: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  } | null;
  isReceived: boolean;
}

export const friendApi = {
  getFriends: async () => {
    return apiRequest<Friend[]>('/api/friends');
  },

  getFriendRequests: async () => {
    return apiRequest<FriendRequest[]>('/api/friends/requests');
  },

  sendFriendRequest: async (friendId: string) => {
    return apiRequest<{ id: string; message: string }>('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  },

  updateFriendRequest: async (requestId: string, status: 'accepted' | 'declined') => {
    return apiRequest<{ id: string; status: string; message: string }>(`/api/friends/requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  removeFriend: async (friendId: string) => {
    return apiRequest<{ message: string }>(`/api/friends/${friendId}`, {
      method: 'DELETE',
    });
  },
};

// Group API functions
export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  userRole?: 'admin' | 'member';
  joinedAt?: string;
  unreadCount?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
}

export interface GroupWithMembers extends Group {
  members?: GroupMember[];
}

export const groupApi = {
  getGroups: async () => {
    return apiRequest<Group[]>('/api/groups');
  },

  getGroup: async (id: string) => {
    return apiRequest<GroupWithMembers>(`/api/groups/${id}`);
  },

  createGroup: async (data: { name: string; memberIds?: string[] }) => {
    return apiRequest<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteGroup: async (groupId: string) => {
    return apiRequest<{ message: string }>(`/api/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  addMembersToGroup: async (groupId: string, memberIds: string[]) => {
    return apiRequest<{ message: string; addedMemberIds: string[] }>(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  },

  removeMemberFromGroup: async (groupId: string, userId: string) => {
    return apiRequest<{ message: string }>(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  leaveGroup: async (groupId: string) => {
    return apiRequest<{ message: string }>(`/api/groups/${groupId}/leave`, {
      method: 'POST',
    });
  },

  createInvite: async (groupId: string) => {
    return apiRequest<{
      id: string;
      token: string;
      inviteUrl: string;
      expiresAt: string;
      createdAt: string;
    }>(`/api/groups/${groupId}/invite`, {
      method: 'POST',
    });
  },

  getInviteInfo: async (token: string) => {
    return apiRequest<{
      groupId: string;
      groupName: string;
      expiresAt: string;
    }>(`/api/groups/invite/${token}`);
  },

  joinGroupViaInvite: async (token: string) => {
    return apiRequest<{
      message: string;
      groupId: string;
    }>(`/api/groups/invite/${token}/join`, {
      method: 'POST',
    });
  },

  markGroupAsRead: async (groupId: string) => {
    return apiRequest<{ success: boolean }>(`/api/groups/${groupId}/read`, {
      method: 'POST',
    });
  },
};

// Image API functions
export interface Image {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
  groups?: Array<{
    id: string;
    name: string;
  }>;
}

export interface ImageFeedResponse {
  images: Image[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const imageApi = {
  uploadImage: async (file: File, groupIds: string[]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupIds', JSON.stringify(groupIds));

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Use fetchWithRetry for better network error handling
      // Increase timeout for large file uploads (3 minutes)
      const response = await fetchWithRetry('/api/images/upload', {
        method: 'POST',
        headers,
        body: formData,
        timeout: 180000, // 3 minutes for large file uploads
        retries: 2,
        retryDelay: 2000, // 2 seconds between retries
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup') && !currentPath.startsWith('/invite')) {
            window.location.href = '/login';
          }
        }
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors with better messages
      if (isNetworkError(error)) {
        throw { message: getErrorMessage(error) };
      }
      throw error;
    }
  },

  getImageFeed: async (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return apiRequest<ImageFeedResponse>(`/api/images/feed${query ? `?${query}` : ''}`);
  },

  getGroupImages: async (groupId: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return apiRequest<ImageFeedResponse>(`/api/images/group/${groupId}${query ? `?${query}` : ''}`);
  },

  getImage: async (id: string) => {
    return apiRequest<Image>(`/api/images/${id}`);
  },

  deleteImage: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/images/${id}`, {
      method: 'DELETE',
    });
  },

  // Comments API
  getImageComments: async (imageId: string) => {
    return apiRequest<{ comments: Comment[] }>(`/api/images/${imageId}/comments`);
  },

  createComment: async (imageId: string, content: string) => {
    return apiRequest<Comment>(`/api/images/${imageId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// Strand API functions
import { Strand, StrandFeedResponse, Comment as StrandComment } from '@/types/strand';

export const strandApi = {
  getStrands: async (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return apiRequest<StrandFeedResponse>(`/api/strands${query ? `?${query}` : ''}`);
  },

  getGroupStrands: async (groupId: string, limit?: number, offset?: number, pinned?: boolean) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (pinned) params.append('pinned', 'true');
    const query = params.toString();
    return apiRequest<StrandFeedResponse>(`/api/strands/group/${groupId}${query ? `?${query}` : ''}`);
  },

  getStrand: async (id: string) => {
    return apiRequest<Strand>(`/api/strands/${id}`);
  },

  createStrand: async (data: { content?: string; file?: File; groupIds: string[] }) => {
    const formData = new FormData();
    if (data.content) {
      formData.append('content', data.content);
    }
    if (data.file) {
      formData.append('file', data.file);
    }
    formData.append('groupIds', JSON.stringify(data.groupIds));

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Use fetchWithRetry for better network error handling
      const response = await fetchWithRetry('/api/strands', {
        method: 'POST',
        headers,
        body: formData,
        timeout: data.file ? 180000 : 30000, // 3 minutes for file uploads, 30s for text only
        retries: 2,
        retryDelay: 2000,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup') && !currentPath.startsWith('/invite')) {
            window.location.href = '/login';
          }
        }
        const error = await response.json().catch(() => ({ message: 'Failed to create strand' }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors with better messages
      if (isNetworkError(error)) {
        throw { message: getErrorMessage(error) };
      }
      throw error;
    }
  },

  updateStrand: async (id: string, data: { content?: string; file?: File; removeImage?: boolean }) => {
    const formData = new FormData();
    if (data.content !== undefined) {
      formData.append('content', data.content);
    }
    if (data.file) {
      formData.append('file', data.file);
    }
    if (data.removeImage) {
      formData.append('removeImage', 'true');
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Use fetchWithRetry for better network error handling
      const response = await fetchWithRetry(`/api/strands/${id}`, {
        method: 'PUT',
        headers,
        body: formData,
        timeout: data.file ? 180000 : 30000, // 3 minutes for file uploads, 30s for text only
        retries: 2,
        retryDelay: 2000,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/signup') && !currentPath.startsWith('/invite')) {
            window.location.href = '/login';
          }
        }
        const error = await response.json().catch(() => ({ message: 'Failed to update strand' }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors with better messages
      if (isNetworkError(error)) {
        throw { message: getErrorMessage(error) };
      }
      throw error;
    }
  },

  deleteStrand: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/strands/${id}`, {
      method: 'DELETE',
    });
  },

  pinStrand: async (strandId: string, groupId: string) => {
    return apiRequest<{ message: string }>(`/api/strands/${strandId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    });
  },

  unpinStrand: async (strandId: string, groupId: string) => {
    return apiRequest<{ message: string }>(`/api/strands/${strandId}/pin`, {
      method: 'DELETE',
      body: JSON.stringify({ groupId }),
    });
  },

  // Comments API
  getStrandComments: async (strandId: string) => {
    return apiRequest<{ comments: StrandComment[] }>(`/api/strands/${strandId}/comments`);
  },

  createStrandComment: async (strandId: string, content: string) => {
    return apiRequest<StrandComment>(`/api/strands/${strandId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  deleteStrandComment: async (strandId: string, commentId: string) => {
    return apiRequest<{ message: string }>(`/api/strands/${strandId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  // Fire reactions API
  addFire: async (strandId: string) => {
    return apiRequest<{ success: boolean; fireCount: number }>(`/api/strands/${strandId}/fire`, {
      method: 'POST',
    });
  },

  removeFire: async (strandId: string) => {
    return apiRequest<{ success: boolean; fireCount: number }>(`/api/strands/${strandId}/fire`, {
      method: 'DELETE',
    });
  },
};

// Comment types
export interface Comment {
  id: string;
  imageId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
}

