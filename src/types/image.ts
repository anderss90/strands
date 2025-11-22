export interface Image {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
  };
  groups?: {
    id: string;
    name: string;
  }[];
}

export interface ImageUpload {
  file: File;
  groups: string[];
}

export interface ImageGroupShare {
  id: string;
  image_id: string;
  group_id: string;
  created_at: string;
}

