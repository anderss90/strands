import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { sendFriendRequestSchema } from '@/lib/validation';

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

    // Get friend requests (pending status only)
    const result = await query(
      `SELECT 
        f.id,
        f.user_id,
        f.friend_id,
        f.status,
        f.created_at,
        user_user.id as sender_id,
        user_user.username as sender_username,
        user_user.display_name as sender_display_name,
        user_user.profile_picture_url as sender_profile_picture_url,
        friend_user.id as receiver_id,
        friend_user.username as receiver_username,
        friend_user.display_name as receiver_display_name,
        friend_user.profile_picture_url as receiver_profile_picture_url
      FROM friends f
      LEFT JOIN users user_user ON f.user_id = user_user.id
      LEFT JOIN users friend_user ON f.friend_id = friend_user.id
      WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND f.status = 'pending'
      ORDER BY f.created_at DESC`,
      [authUser.userId]
    );

    const requests = result.rows.map((row: any) => {
      const isReceived = row.receiver_id === authUser.userId;
      return {
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        sender: isReceived ? {
          id: row.sender_id,
          username: row.sender_username,
          displayName: row.sender_display_name,
          profilePictureUrl: row.sender_profile_picture_url,
        } : null,
        receiver: !isReceived ? {
          id: row.receiver_id,
          username: row.receiver_username,
          displayName: row.receiver_display_name,
          profilePictureUrl: row.receiver_profile_picture_url,
        } : null,
        isReceived,
      };
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error: any) {
    console.error('Get friend requests error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const validatedData = sendFriendRequestSchema.parse(body);

    // Check if user is trying to friend themselves
    if (validatedData.friendId === authUser.userId) {
      return NextResponse.json(
        { message: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existingResult = await query(
      `SELECT * FROM friends 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [authUser.userId, validatedData.friendId]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { message: 'Already friends' },
          { status: 400 }
        );
      }
      if (existing.status === 'pending') {
        return NextResponse.json(
          { message: 'Friend request already sent' },
          { status: 400 }
        );
      }
    }

    // Create friend request
    const result = await query(
      `INSERT INTO friends (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [authUser.userId, validatedData.friendId]
    );

    return NextResponse.json({ 
      id: result.rows[0].id,
      message: 'Friend request sent successfully'
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Send friend request error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

