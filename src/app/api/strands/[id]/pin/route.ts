import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { pinStrandSchema } from '@/lib/validation';

// POST /api/strands/[id]/pin - Pin a strand in a group
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
    const strandId = params.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate request body
    try {
      pinStrandSchema.parse(body);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
    }

    const { groupId } = body;

    // Verify strand exists and user has access
    let strandCheck;
    if (authUser.isAdmin) {
      strandCheck = await query(
        `SELECT s.id FROM strands s
         INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
         WHERE s.id = $1 AND sgs.group_id = $2`,
        [strandId, groupId]
      );
    } else {
      strandCheck = await query(
        `SELECT s.id FROM strands s
         INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
         INNER JOIN group_members gm ON sgs.group_id = gm.group_id
         WHERE s.id = $1 AND sgs.group_id = $2 AND gm.user_id = $3`,
        [strandId, groupId, authUser.userId]
      );
    }

    if (strandCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Strand not found or access denied' },
        { status: 404 }
      );
    }

    // Verify user is a group admin (or is admin)
    if (!authUser.isAdmin) {
      const adminCheck = await query(
        `SELECT role FROM group_members
         WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
        [groupId, authUser.userId]
      );

      if (adminCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'Only group admins can pin strands' },
          { status: 403 }
        );
      }
    }

    // Pin the strand
    const pinResult = await query(
      `INSERT INTO strand_pins (strand_id, group_id, pinned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (strand_id, group_id) DO UPDATE SET pinned_by = $3, pinned_at = NOW()
       RETURNING id, strand_id, group_id, pinned_by, pinned_at`,
      [strandId, groupId, authUser.userId]
    );

    return NextResponse.json(
      {
        id: pinResult.rows[0].id,
        strandId: pinResult.rows[0].strand_id,
        groupId: pinResult.rows[0].group_id,
        pinnedBy: pinResult.rows[0].pinned_by,
        pinnedAt: pinResult.rows[0].pinned_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Pin strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/strands/[id]/pin - Unpin a strand from a group
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

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };
    const strandId = params.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate request body
    try {
      pinStrandSchema.parse(body);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
    }

    const { groupId } = body;

    // Verify pin exists
    const pinCheck = await query(
      `SELECT id FROM strand_pins
       WHERE strand_id = $1 AND group_id = $2`,
      [strandId, groupId]
    );

    if (pinCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Strand is not pinned in this group' },
        { status: 404 }
      );
    }

    // Verify user is a group admin (or is admin)
    if (!authUser.isAdmin) {
      const adminCheck = await query(
        `SELECT role FROM group_members
         WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
        [groupId, authUser.userId]
      );

      if (adminCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'Only group admins can unpin strands' },
          { status: 403 }
        );
      }
    }

    // Unpin the strand
    await query(
      `DELETE FROM strand_pins
       WHERE strand_id = $1 AND group_id = $2`,
      [strandId, groupId]
    );

    return NextResponse.json(
      { message: 'Strand unpinned successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unpin strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
