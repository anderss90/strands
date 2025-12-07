export interface StrandMedia {
  id: string;
  imageId: string;
  displayOrder: number;
  image: {
    id: string;
    imageUrl: string;
    mediaUrl?: string;
    thumbnailUrl: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    mediaType?: 'image' | 'video' | 'audio';
    duration?: number;
    width?: number;
    height?: number;
  };
}

export interface Strand {
  id: string;
  userId: string;
  content: string | null;
  imageId: string | null; // Deprecated: kept for backward compatibility
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isPinned?: boolean;
  fireCount?: number;
  hasUserFired?: boolean;
  user?: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
  image?: {
    id: string;
    imageUrl: string;
    mediaUrl?: string;
    thumbnailUrl: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    mediaType?: 'image' | 'video' | 'audio';
    duration?: number;
    width?: number;
    height?: number;
  }; // Deprecated: kept for backward compatibility, use images array instead
  images?: StrandMedia[]; // New: array of media entries for multi-media strands
  groups?: {
    id: string;
    name: string;
    isPinned?: boolean;
    userRole?: 'admin' | 'member';
  }[];
}

export interface StrandCreate {
  content?: string;
  imageFile?: File;
  groups: string[];
}

export interface StrandUpdate {
  content?: string;
  imageFile?: File;
  removeImage?: boolean;
}

export interface StrandGroupShare {
  id: string;
  strandId: string;
  groupId: string;
  createdAt: string;
}

export interface StrandFeedResponse {
  strands: Strand[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface Comment {
  id: string;
  strandId: string;
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
