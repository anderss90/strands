import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { notifyGroupMembers, notifyUsers } from '@/lib/notifications';

// GET /api/strands/[id]/comments - Get comments for a strand
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

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };
    const strandId = params.id;

    // If not admin, verify user has access to the strand
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

    // Get all comments for the strand, ordered by created_at ASC (oldest first)
    const commentsResult = await query(
      `SELECT 
        c.id,
        c.strand_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username,
        u.display_name,
        u.profile_picture_url
      FROM strand_comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.strand_id = $1
      ORDER BY c.created_at ASC`,
      [strandId]
    );

    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      strandId: row.strand_id,
      userId: row.user_id,
      content: row.content,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        profilePictureUrl: row.profile_picture_url,
      },
    }));

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/strands/[id]/comments - Create a comment on a strand
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

    // If not admin, verify user has access to the strand
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
    const { content } = body;

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { message: 'Comment content is required' },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { message: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 1000) {
      return NextResponse.json(
        { message: 'Comment content must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Create comment
    const commentResult = await query(
      `INSERT INTO strand_comments (strand_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING 
         id,
         strand_id,
         user_id,
         content,
         created_at`,
      [strandId, authUser.userId, trimmedContent]
    );

    const comment = commentResult.rows[0];

    // Get user info for the comment
    const userResult = await query(
      `SELECT id, username, display_name, profile_picture_url
       FROM users
       WHERE id = $1`,
      [authUser.userId]
    );

    const user = userResult.rows[0];

    // Get strand info and group IDs for notifications
    const strandResult = await query(
      `SELECT s.user_id as strand_user_id, s.content as strand_content,
              array_agg(DISTINCT sgs.group_id) as group_ids
       FROM strands s
       INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
       WHERE s.id = $1
       GROUP BY s.id, s.user_id, s.content`,
      [strandId]
    );

    if (strandResult.rows.length > 0) {
      const strand = strandResult.rows[0];
      const strandAuthorId = strand.strand_user_id;
      const groupIds = strand.group_ids || [];

      // Get all users who have commented on this strand (excluding the current comment author)
      const previousCommentersResult = await query(
        `SELECT DISTINCT user_id
         FROM strand_comments
         WHERE strand_id = $1 AND user_id != $2`,
        [strandId, authUser.userId]
      );

      const previousCommenterIds = previousCommentersResult.rows.map(row => row.user_id);

      // Notify strand author separately with specific message
      if (strandAuthorId !== authUser.userId) {
        await notifyUsers(
          [strandAuthorId],
          {
            title: 'New comment on your strand',
            body: `${user.display_name} commented on your strand`,
            tag: `strand-comment-${strandId}`,
            data: {
              type: 'comment',
              strandId: strandId,
              commentId: comment.id,
              url: `/home?strand=${strandId}`,
            },
          }
        );
      }

      // Notify previous commenters separately with different message
      const commentersToNotify = previousCommenterIds.filter(
        commenterId => commenterId !== authUser.userId && commenterId !== strandAuthorId
      );

      if (commentersToNotify.length > 0) {
        await notifyUsers(
          commentersToNotify,
          {
            title: 'New comment on strand',
            body: `${user.display_name} also commented on a strand you commented on`,
            tag: `strand-comment-${strandId}`,
            data: {
              type: 'comment',
              strandId: strandId,
              commentId: comment.id,
              url: `/home?strand=${strandId}`,
            },
          }
        );
      }

      // Send notifications to all groups where this strand is shared
      // (excluding the comment author, strand author, and previous commenters to avoid duplicates)
      const excludeUserIds = [
        authUser.userId,
        strandAuthorId,
        ...previousCommenterIds.filter(id => id !== authUser.userId && id !== strandAuthorId)
      ];
      
      for (const groupId of groupIds) {
        // Get group name
        const groupResult = await query(
          `SELECT name FROM groups WHERE id = $1`,
          [groupId]
        );
        const groupName = groupResult.rows[0]?.name || 'a group';

        // Send notification to all group members except those already notified
        await notifyGroupMembers(
          groupId,
          excludeUserIds,
          {
            title: 'New comment in ' + groupName,
            body: `${user.display_name} commented on a strand`,
            data: {
              type: 'comment',
              strandId: strandId,
              commentId: comment.id,
              groupId: groupId,
              url: `/home?strand=${strandId}`,
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        id: comment.id,
        strandId: comment.strand_id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          profilePictureUrl: user.profile_picture_url,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

