import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/images/feed - Get image feed for the authenticated user
// Returns images shared in groups the user is a member of
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

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };

    // Get pagination parameters
    let limit = 20;
    let offset = 0;
    try {
      const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
      limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 per page
      offset = parseInt(searchParams.get('offset') || '0');
    } catch (error) {
      // Use defaults if URL parsing fails
      limit = 20;
      offset = 0;
    }

    // If admin, get all images. Otherwise, get images shared in groups the user is a member of
    let imageIdsResult;
    if (authUser.isAdmin) {
      imageIdsResult = await query(
        `SELECT DISTINCT i.id, i.created_at
         FROM images i
         ORDER BY i.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      imageIdsResult = await query(
        `SELECT DISTINCT i.id, i.created_at
         FROM images i
         INNER JOIN image_group_shares igs ON i.id = igs.image_id
         INNER JOIN group_members gm ON igs.group_id = gm.group_id
         WHERE gm.user_id = $1
         ORDER BY i.created_at DESC
         LIMIT $2 OFFSET $3`,
        [authUser.userId, limit, offset]
      );
    }

    if (imageIdsResult.rows.length === 0) {
      return NextResponse.json({
        images: [],
        pagination: {
          limit,
          offset,
          hasMore: false,
        },
      }, { status: 200 });
    }

    const imageIds = imageIdsResult.rows.map(row => row.id);

    // Get full image details with groups
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
        u.profile_picture_url,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', g.id,
                'name', g.name
              )
            )
            FROM image_group_shares igs
            INNER JOIN groups g ON igs.group_id = g.id
            WHERE igs.image_id = i.id
          ),
          '[]'::json
        ) as groups
      FROM images i
      INNER JOIN users u ON i.user_id = u.id
      WHERE i.id = ANY($1::uuid[])
      ORDER BY i.created_at DESC`,
      [imageIds]
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
      groups: row.groups || [],
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
    console.error('Get image feed error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

