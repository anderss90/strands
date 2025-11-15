import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { createGroupSchema } from '@/lib/validation';

// GET /api/groups - Get all groups for the authenticated user
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

    // Get all groups where user is a member
    const result = await query(
      `SELECT 
        g.id,
        g.name,
        g.created_by,
        g.created_at,
        g.updated_at,
        gm.role as user_role,
        gm.joined_at
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY g.created_at DESC`,
      [authUser.userId]
    );

    const groups = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userRole: row.user_role,
      joinedAt: row.joined_at,
    }));

    return NextResponse.json(groups, { status: 200 });
  } catch (error: any) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
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
    const validatedData = createGroupSchema.parse(body);

    // Create group
    const groupResult = await query(
      `INSERT INTO groups (name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [validatedData.name, authUser.userId]
    );

    const group = groupResult.rows[0];

    // Add creator as admin member
    await query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [group.id, authUser.userId]
    );

    // Add additional members if provided
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
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
        // Rollback group creation
        await query('DELETE FROM groups WHERE id = $1', [group.id]);
        return NextResponse.json(
          { message: 'All members must be your friends' },
          { status: 400 }
        );
      }

      // Add all members
      for (const memberId of validatedData.memberIds) {
        await query(
          `INSERT INTO group_members (group_id, user_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (group_id, user_id) DO NOTHING`,
          [group.id, memberId]
        );
      }
    }

    return NextResponse.json(
      {
        id: group.id,
        name: group.name,
        createdBy: group.created_by,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Create group error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

