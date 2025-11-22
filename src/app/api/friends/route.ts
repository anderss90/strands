import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string } };

    // Get all friends (accepted status only)
    const result = await query(
      `SELECT 
        f.id,
        f.user_id,
        f.friend_id,
        f.status,
        f.created_at,
        CASE 
          WHEN f.user_id = $1 THEN friend_user.id
          ELSE user_user.id
        END as friend_user_id,
        CASE 
          WHEN f.user_id = $1 THEN friend_user.username
          ELSE user_user.username
        END as friend_username,
        CASE 
          WHEN f.user_id = $1 THEN friend_user.display_name
          ELSE user_user.display_name
        END as friend_display_name,
        CASE 
          WHEN f.user_id = $1 THEN friend_user.profile_picture_url
          ELSE user_user.profile_picture_url
        END as friend_profile_picture_url
      FROM friends f
      LEFT JOIN users user_user ON f.user_id = user_user.id
      LEFT JOIN users friend_user ON f.friend_id = friend_user.id
      WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND f.status = 'accepted'
      ORDER BY f.created_at DESC`,
      [authUser.userId]
    );

    const friends = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.friend_user_id,
      username: row.friend_username,
      displayName: row.friend_display_name,
      profilePictureUrl: row.friend_profile_picture_url,
      friendshipCreatedAt: row.created_at,
    }));

    return NextResponse.json(friends, { status: 200 });
  } catch (error: any) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

