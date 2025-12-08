import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/images/[id]/comments - Get comments for an image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: imageId } = await params;

    // If not admin, verify user has access to the image (must be shared in a group user is a member of)
    if (!authUser.isAdmin) {
      const accessCheck = await query(
        `SELECT 1
         FROM images i
         INNER JOIN image_group_shares igs ON i.id = igs.image_id
         INNER JOIN group_members gm ON igs.group_id = gm.group_id
         WHERE i.id = $1 AND gm.user_id = $2
         LIMIT 1`,
        [imageId, authUser.userId]
      );

      if (accessCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'Image not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Get all comments for the image, ordered by created_at ASC (oldest first)
    const commentsResult = await query(
      `SELECT 
        c.id,
        c.image_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username,
        u.display_name,
        u.profile_picture_url
      FROM image_comments c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.image_id = $1
      ORDER BY c.created_at ASC`,
      [imageId]
    );

    const comments = commentsResult.rows.map(row => ({
      id: row.id,
      imageId: row.image_id,
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

// POST /api/images/[id]/comments - Create a comment on an image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: imageId } = await params;

    // If not admin, verify user has access to the image
    if (!authUser.isAdmin) {
      const accessCheck = await query(
        `SELECT 1
         FROM images i
         INNER JOIN image_group_shares igs ON i.id = igs.image_id
         INNER JOIN group_members gm ON igs.group_id = gm.group_id
         WHERE i.id = $1 AND gm.user_id = $2
         LIMIT 1`,
        [imageId, authUser.userId]
      );

      if (accessCheck.rows.length === 0) {
        return NextResponse.json(
          { message: 'Image not found or access denied' },
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
      `INSERT INTO image_comments (image_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING 
         id,
         image_id,
         user_id,
         content,
         created_at`,
      [imageId, authUser.userId, trimmedContent]
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

    return NextResponse.json(
      {
        id: comment.id,
        imageId: comment.image_id,
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

