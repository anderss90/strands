import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: friendId } = await params;

    // Get the friendship
    const friendshipResult = await query(
      `SELECT * FROM friends 
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND status = 'accepted'`,
      [authUser.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Friendship not found' },
        { status: 404 }
      );
    }

    // Delete the friendship
    await query(
      `DELETE FROM friends 
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))`,
      [authUser.userId, friendId]
    );

    return NextResponse.json({ 
      message: 'Friend removed successfully'
    }, { status: 200 });
  } catch (error: any) {
    console.error('Remove friend error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

