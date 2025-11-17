import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';

// POST /api/groups/[id]/invite - Generate new invite token for group
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

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Insert invite into database with 30-day expiration
    const result = await query(
      `INSERT INTO group_invites (group_id, token, created_by, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
       RETURNING id, token, expires_at, created_at`,
      [groupId, token, authUser.userId]
    );

    const invite = result.rows[0];

    // Get base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json(
      {
        id: invite.id,
        token: invite.token,
        inviteUrl,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

