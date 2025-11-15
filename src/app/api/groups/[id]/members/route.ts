import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { addMembersToGroupSchema } from '@/lib/validation';

// POST /api/groups/[id]/members - Add members to a group
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
    const body = await request.json();
    const validatedData = addMembersToGroupSchema.parse(body);

    // Verify user is a member of the group
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

    // Verify all member IDs are friends
    const friendsResult = await query(
      `SELECT friend_id FROM friends
       WHERE user_id = $1 AND status = 'accepted'
       UNION
       SELECT user_id as friend_id FROM friends
       WHERE friend_id = $1 AND status = 'accepted'`,
      [authUser.userId]
    );

    const friendIds = friendsResult.rows.map(row => row.friend_id);
    const invalidMembers = validatedData.memberIds.filter(id => !friendIds.includes(id));

    if (invalidMembers.length > 0) {
      return NextResponse.json(
        { message: 'All members must be your friends' },
        { status: 400 }
      );
    }

    // Check which members are already in the group
    const existingMembersResult = await query(
      `SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = ANY($2::uuid[])`,
      [groupId, validatedData.memberIds]
    );

    const existingMemberIds = existingMembersResult.rows.map(row => row.user_id);
    const newMemberIds = validatedData.memberIds.filter(id => !existingMemberIds.includes(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { message: 'All specified users are already members of this group' },
        { status: 400 }
      );
    }

    // Add new members
    const addedMembers = [];
    for (const memberId of newMemberIds) {
      const result = await query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'member')
         RETURNING *`,
        [groupId, memberId]
      );
      addedMembers.push(result.rows[0].id);
    }

    return NextResponse.json(
      {
        message: `Added ${addedMembers.length} member(s) to the group`,
        addedMemberIds: newMemberIds,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Add members error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

