import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { updateFriendRequestSchema } from '@/lib/validation';

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

