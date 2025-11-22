import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// POST /api/groups/invite/[token]/join - Join group using invite token
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    const token = params.token;

    // Validate token (exists and not expired)
    const inviteResult = await query(
      `SELECT group_id FROM group_invites
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    const groupId = inviteResult.rows[0].group_id;

    // Check if user is already in group
    const membershipCheck = await query(
      `SELECT id FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, authUser.userId]
    );

    if (membershipCheck.rows.length > 0) {
      return NextResponse.json(
        {
          message: 'You are already a member of this group',
          groupId,
        },
        { status: 200 }
      );
    }

    // Add user to group
    await query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, authUser.userId]
    );

    return NextResponse.json(
      {
        message: 'Successfully joined group',
        groupId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Join group via invite error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

