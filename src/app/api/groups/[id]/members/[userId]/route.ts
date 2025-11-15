import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// DELETE /api/groups/[id]/members/[userId] - Remove a member from a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    const targetUserId = params.userId;

    // Verify user is admin or removing themselves
    const membershipCheck = await query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, authUser.userId]
    );

    if (membershipCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    const userRole = membershipCheck.rows[0].role;
    const isSelfRemoval = authUser.userId === targetUserId;

    if (!isSelfRemoval && userRole !== 'admin') {
      return NextResponse.json(
        { message: 'Only admins can remove other members' },
        { status: 403 }
      );
    }

    // Check if target user is a member
    const targetMemberCheck = await query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, targetUserId]
    );

    if (targetMemberCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'User is not a member of this group' },
        { status: 404 }
      );
    }

    // Prevent removing the last admin
    if (targetMemberCheck.rows[0].role === 'admin' && !isSelfRemoval) {
      const adminCount = await query(
        `SELECT COUNT(*) as count FROM group_members
         WHERE group_id = $1 AND role = 'admin'`,
        [groupId]
      );

      if (adminCount.rows[0].count === 1) {
        return NextResponse.json(
          { message: 'Cannot remove the last admin from the group' },
          { status: 400 }
        );
      }
    }

    // Remove member
    await query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, targetUserId]
    );

    return NextResponse.json(
      { message: 'Member removed from group successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

