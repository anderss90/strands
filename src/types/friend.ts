export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  user?: {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
  };
  friend?: {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
  };
}

