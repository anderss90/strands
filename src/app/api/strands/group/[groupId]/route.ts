import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/strands/group/[groupId] - Get strands for a specific group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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
    const { groupId: groupId } = await params;

    // Check if pinned query param is set
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
    const pinnedOnly = searchParams.get('pinned') === 'true';

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
      limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      offset = parseInt(searchParams.get('offset') || '0');
    } catch (error) {
      limit = 20;
      offset = 0;
    }

    // Build query based on pinned status
    let result;
    if (pinnedOnly) {
      // Get only pinned strands
      result = await query(
        `SELECT 
          s.id,
          s.user_id,
          s.content,
          s.image_id,
          s.created_at,
          s.updated_at,
          s.edited_at,
          u.username,
          u.display_name,
          u.profile_picture_url,
          i.image_url,
          i.media_url,
          i.thumbnail_url,
          i.file_name,
          i.file_size,
          i.mime_type,
          i.media_type,
          i.duration,
          i.width,
          i.height,
          sp.pinned_at,
          COALESCE(
            (
              SELECT COUNT(*)::int
              FROM strand_fires sf
              WHERE sf.strand_id = s.id
            ),
            0
          ) as fire_count,
          EXISTS(
            SELECT 1
            FROM strand_fires sf
            WHERE sf.strand_id = s.id AND sf.user_id = $4
          ) as has_user_fired,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', sm.id,
                  'imageId', sm.image_id,
                  'displayOrder', sm.display_order,
                  'image', json_build_object(
                    'id', im.id,
                    'imageUrl', im.image_url,
                    'mediaUrl', COALESCE(im.media_url, im.image_url),
                    'thumbnailUrl', im.thumbnail_url,
                    'fileName', im.file_name,
                    'fileSize', im.file_size,
                    'mimeType', im.mime_type,
                    'mediaType', COALESCE(im.media_type, CASE WHEN im.mime_type LIKE 'video/%' THEN 'video' ELSE 'image' END),
                    'duration', im.duration,
                    'width', im.width,
                    'height', im.height
                  )
                ) ORDER BY sm.display_order
              )
              FROM strand_media sm
              INNER JOIN images im ON sm.image_id = im.id
              WHERE sm.strand_id = s.id
            ),
            '[]'::json
          ) as images
        FROM strands s
        INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
        INNER JOIN strand_pins sp ON s.id = sp.strand_id AND sp.group_id = $1
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN images i ON s.image_id = i.id
        WHERE sgs.group_id = $1
        ORDER BY sp.pinned_at DESC
        LIMIT $2 OFFSET $3`,
        [groupId, limit, offset, authUser.userId]
      );
    } else {
      // Get all strands (pinned first, then by creation date)
      result = await query(
        `SELECT 
          s.id,
          s.user_id,
          s.content,
          s.image_id,
          s.created_at,
          s.updated_at,
          s.edited_at,
          u.username,
          u.display_name,
          u.profile_picture_url,
          i.image_url,
          i.media_url,
          i.thumbnail_url,
          i.file_name,
          i.file_size,
          i.mime_type,
          i.media_type,
          i.duration,
          i.width,
          i.height,
          sp.pinned_at,
          CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END as is_pinned,
          COALESCE(
            (
              SELECT COUNT(*)::int
              FROM strand_fires sf
              WHERE sf.strand_id = s.id
            ),
            0
          ) as fire_count,
          EXISTS(
            SELECT 1
            FROM strand_fires sf
            WHERE sf.strand_id = s.id AND sf.user_id = $4
          ) as has_user_fired,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', sm.id,
                  'imageId', sm.image_id,
                  'displayOrder', sm.display_order,
                  'image', json_build_object(
                    'id', im.id,
                    'imageUrl', im.image_url,
                    'mediaUrl', COALESCE(im.media_url, im.image_url),
                    'thumbnailUrl', im.thumbnail_url,
                    'fileName', im.file_name,
                    'fileSize', im.file_size,
                    'mimeType', im.mime_type,
                    'mediaType', COALESCE(im.media_type, CASE WHEN im.mime_type LIKE 'video/%' THEN 'video' ELSE 'image' END),
                    'duration', im.duration,
                    'width', im.width,
                    'height', im.height
                  )
                ) ORDER BY sm.display_order
              )
              FROM strand_media sm
              INNER JOIN images im ON sm.image_id = im.id
              WHERE sm.strand_id = s.id
            ),
            '[]'::json
          ) as images
        FROM strands s
        INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN images i ON s.image_id = i.id
        LEFT JOIN strand_pins sp ON s.id = sp.strand_id AND sp.group_id = $1
        WHERE sgs.group_id = $1
        ORDER BY is_pinned DESC, s.created_at DESC
        LIMIT $2 OFFSET $3`,
        [groupId, limit, offset, authUser.userId]
      );
    }

    const strands = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      imageId: row.image_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      editedAt: row.edited_at,
      isPinned: !!row.pinned_at || row.is_pinned === 1,
      fireCount: row.fire_count || 0,
      hasUserFired: row.has_user_fired || false,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        profilePictureUrl: row.profile_picture_url,
      },
      image: row.image_id ? {
        id: row.image_id,
        imageUrl: row.image_url,
        mediaUrl: row.media_url || row.image_url,
        thumbnailUrl: row.thumbnail_url,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        mediaType: row.media_type || (row.mime_type?.startsWith('video/') ? 'video' : 'image'),
        duration: row.duration,
        width: row.width,
        height: row.height,
      } : null,
      images: row.images && Array.isArray(row.images) && row.images.length > 0 ? row.images : undefined,
    }));

    return NextResponse.json({
      strands,
      pagination: {
        limit,
        offset,
        hasMore: strands.length === limit,
      },
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Get group strands error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
