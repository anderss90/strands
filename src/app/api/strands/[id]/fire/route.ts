import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// POST /api/strands/[id]/fire - Add a fire reaction to a strand
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

    // Verify user has access to the strand (if not admin)
    if (!authUser.isAdmin) {
      const accessCheck = await query(
        `SELECT 1
         FROM strands s
         INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
         INNER JOIN group_members gm ON sgs.group_id = gm.group_id
         WHERE s.id = $1 AND gm.user_id = $2
         LIMIT 1`,
        [strandId, authUser.userId]
      );

      if (accessCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'Strand not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Check if user already fired this strand
    const existingFire = await query(
      `SELECT id FROM strand_fires WHERE strand_id = $1 AND user_id = $2`,
      [strandId, authUser.userId]
    );

    if (existingFire.rows.length > 0) {
      return NextResponse.json(
        { message: 'You have already fired this strand' },
        { status: 400 }
      );
    }

    // Add fire reaction
    await query(
      `INSERT INTO strand_fires (strand_id, user_id)
       VALUES ($1, $2)`,
      [strandId, authUser.userId]
    );

    // Get updated fire count
    const fireCountResult = await query(
      `SELECT COUNT(*)::int as count FROM strand_fires WHERE strand_id = $1`,
      [strandId]
    );

    return NextResponse.json(
      {
        success: true,
        fireCount: fireCountResult.rows[0]?.count || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Add fire error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/strands/[id]/fire - Remove a fire reaction from a strand
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

    // Remove fire reaction
    const deleteResult = await query(
      `DELETE FROM strand_fires WHERE strand_id = $1 AND user_id = $2`,
      [strandId, authUser.userId]
    );

    // Get updated fire count
    const fireCountResult = await query(
      `SELECT COUNT(*)::int as count FROM strand_fires WHERE strand_id = $1`,
      [strandId]
    );

    return NextResponse.json(
      {
        success: true,
        fireCount: fireCountResult.rows[0]?.count || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove fire error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

