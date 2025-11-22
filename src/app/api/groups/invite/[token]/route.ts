import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/groups/invite/[token] - Validate token and return group info
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Check if token exists and is not expired
    const inviteResult = await query(
      `SELECT gi.id, gi.group_id, gi.expires_at, g.name as group_name
       FROM group_invites gi
       INNER JOIN groups g ON g.id = gi.group_id
       WHERE gi.token = $1 AND gi.expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    const invite = inviteResult.rows[0];

    return NextResponse.json(
      {
        groupId: invite.group_id,
        groupName: invite.group_name,
        expiresAt: invite.expires_at,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get invite info error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

