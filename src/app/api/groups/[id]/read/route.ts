import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// POST /api/groups/[id]/read - Mark a group as read
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

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };
    const groupId = params.id;

    // Verify user is a member of the group (or is admin)
    if (!authUser.isAdmin) {
      const memberCheck = await query(
        `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, authUser.userId]
      );

      if (memberCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'You are not a member of this group' },
          { status: 403 }
        );
      }
    }

    // Update or insert read status
    await query(
      `INSERT INTO user_group_read_status (user_id, group_id, last_read_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id, group_id)
       DO UPDATE SET last_read_at = NOW(), updated_at = NOW()`,
      [authUser.userId, groupId]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Mark group as read error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

