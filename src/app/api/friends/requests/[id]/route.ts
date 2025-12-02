import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { updateFriendRequestSchema } from '@/lib/validation';
import { notifyUsers } from '@/lib/notifications';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const body = await request.json();
    const validatedData = updateFriendRequestSchema.parse(body);
    const requestId = params.id;

    // Get the friend request
    const requestResult = await query(
      `SELECT * FROM friends WHERE id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Friend request not found' },
        { status: 404 }
      );
    }

    const friendRequest = requestResult.rows[0];

    // Check if user is the receiver of the request
    if (friendRequest.friend_id !== authUser.userId) {
      return NextResponse.json(
        { message: 'Unauthorized to update this request' },
        { status: 403 }
      );
    }

    // Check if request is pending
    if (friendRequest.status !== 'pending') {
      return NextResponse.json(
        { message: 'Friend request is not pending' },
        { status: 400 }
      );
    }

    // Update the friend request
    const newStatus = validatedData.status === 'accepted' ? 'accepted' : 'blocked';
    const result = await query(
      `UPDATE friends 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, requestId]
    );

    // If accepted, notify the sender that their friend request was accepted
    if (validatedData.status === 'accepted') {
      // Get receiver's display name for notification
      // Do this after updating the request to avoid blocking on notification
      try {
        const receiverResult = await query(
          `SELECT display_name, username FROM users WHERE id = $1`,
          [authUser.userId]
        );
        const receiverDisplayName = receiverResult?.rows?.[0]?.display_name || receiverResult?.rows?.[0]?.username || authUser.username || 'Someone';

        // Notify the sender (the person who originally sent the request)
        // Don't await to avoid blocking the response
        notifyUsers(friendRequest.user_id, {
          title: 'Friend Request Accepted',
          body: `${receiverDisplayName} accepted your friend request`,
          tag: 'friend-accepted',
          data: {
            url: '/friends',
            type: 'friend_accepted',
          },
        }).catch((error) => {
          // Log but don't fail the request if notification fails
          console.error('Failed to send friend accepted notification:', error);
        });
      } catch (notifError) {
        // If notification setup fails, log but don't fail the request
        console.error('Failed to set up friend accepted notification:', notifError);
      }
    }

    return NextResponse.json({ 
      id: result.rows[0].id,
      status: result.rows[0].status,
      message: validatedData.status === 'accepted' 
        ? 'Friend request accepted' 
        : 'Friend request declined'
    }, { status: 200 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Update friend request error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

