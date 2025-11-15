import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// POST /api/groups/[id]/leave - Leave a group
export async function POST(
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
    const groupId = params.id;

    // Check if user is a member
    const membershipCheck = await query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, authUser.userId]
    );

    if (membershipCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 404 }
      );
    }

    // If user is admin, check if they're the last admin
    if (membershipCheck.rows[0].role === 'admin') {
      const adminCount = await query(
        `SELECT COUNT(*) as count FROM group_members
         WHERE group_id = $1 AND role = 'admin'`,
        [groupId]
      );

      if (adminCount.rows[0].count === 1) {
        return NextResponse.json(
          { message: 'Cannot leave group as the last admin. Please transfer admin or delete the group.' },
          { status: 400 }
        );
      }
    }

    // Remove member
    await query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, authUser.userId]
    );

    return NextResponse.json(
      { message: 'Left group successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Leave group error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

