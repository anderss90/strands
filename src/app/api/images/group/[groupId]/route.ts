import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/images/group/[groupId] - Get images shared in a specific group
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
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
    const groupId = params.groupId;

    // If not admin, verify user is a member of the group
    if (!authUser.isAdmin) {
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
    }

    // Get pagination parameters
    let limit = 20;
    let offset = 0;
    try {
      const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
      limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      offset = parseInt(searchParams.get('offset') || '0');
    } catch (error) {
      // Use defaults if URL parsing fails
      limit = 20;
      offset = 0;
    }

    // Get images shared in this group
    const result = await query(
      `SELECT 
        i.id,
        i.user_id,
        i.image_url,
        i.thumbnail_url,
        i.file_name,
        i.file_size,
        i.mime_type,
        i.created_at,
        u.username,
        u.display_name,
        u.profile_picture_url
      FROM images i
      INNER JOIN image_group_shares igs ON i.id = igs.image_id
      INNER JOIN users u ON i.user_id = u.id
      WHERE igs.group_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    const images = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        profilePictureUrl: row.profile_picture_url,
      },
    }));

    return NextResponse.json({
      images,
      pagination: {
        limit,
        offset,
        hasMore: images.length === limit,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Get group images error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

