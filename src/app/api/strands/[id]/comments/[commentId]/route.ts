import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// DELETE /api/strands/[id]/comments/[commentId] - Delete a comment on a strand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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
    const { id: strandId } = await params;
    const { commentId: commentId } = await params;

    // Verify comment exists and get its details
    const commentCheck = await query(
      `SELECT id, user_id, strand_id FROM strand_comments WHERE id = $1`,
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    const comment = commentCheck.rows[0];

    // Verify comment belongs to the strand
    if (comment.strand_id !== strandId) {
      return NextResponse.json(
        { message: 'Comment does not belong to this strand' },
        { status: 400 }
      );
    }

    // Check if user owns the comment or is admin
    if (!authUser.isAdmin && comment.user_id !== authUser.userId) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the comment
    await query(
      `DELETE FROM strand_comments WHERE id = $1`,
      [commentId]
    );

    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}


