import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/groups/[id] - Get group details with members
export async function GET(
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

    // Get group details
    const groupResult = await query(
      `SELECT * FROM groups WHERE id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    const group = groupResult.rows[0];

    // Get group members with user details
    const membersResult = await query(
      `SELECT 
        gm.id,
        gm.group_id,
        gm.user_id,
        gm.role,
        gm.joined_at,
        u.username,
        u.display_name,
        u.profile_picture_url
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    const members = membersResult.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        profilePictureUrl: row.profile_picture_url,
      },
    }));

    return NextResponse.json(
      {
        id: group.id,
        name: group.name,
        createdBy: group.created_by,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        members,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get group error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - Delete a group (admin only)
export async function DELETE(
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

    // Verify user is admin of the group
    const membershipCheck = await query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, authUser.userId]
    );

    if (membershipCheck.rows.length === 0 || membershipCheck.rows[0].role !== 'admin') {
      return NextResponse.json(
        { message: 'Only group admins can delete groups' },
        { status: 403 }
      );
    }

    // Delete group (cascade will handle members and shares)
    await query('DELETE FROM groups WHERE id = $1', [groupId]);

    return NextResponse.json(
      { message: 'Group deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete group error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

