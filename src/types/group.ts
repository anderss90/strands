export type GroupRole = 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    profile_picture_url: string | null;
  };
}

export interface GroupWithMembers extends Group {
  members?: GroupMember[];
}

