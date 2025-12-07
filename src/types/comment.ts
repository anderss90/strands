export interface Comment {
  id: string;
  imageId?: string;
  strandId?: string;
  userId: string;
  content: string;
  createdAt: string;
  groupId?: string; // Optional group ID for group-specific comments
  user: {
    id: string;
    username: string;
    displayName: string;
    profilePictureUrl: string | null;
  };
}

export interface CommentResponse {
  comments: Comment[];
}

