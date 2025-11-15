export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string; // Optional, should be excluded when returning to client
  display_name: string;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  display_name: string;
}

export interface UserUpdate {
  display_name?: string;
  profile_picture_url?: string;
}

