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

export interface CommentResponse {
  comments: Comment[];
}

