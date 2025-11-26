export interface Strand {
  id: string;
  userId: string;
  content: string | null;
  imageId: string | null;
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
    mediaType?: 'image' | 'video';
    duration?: number;
    width?: number;
    height?: number;
  };
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
