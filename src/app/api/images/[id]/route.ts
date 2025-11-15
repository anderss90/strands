import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/images/[id] - Get a specific image
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
    const imageId = params.id;

    // If admin, get image directly. Otherwise, verify user has access (must be shared in a group user is a member of)
    let result;
    if (authUser.isAdmin) {
      result = await query(
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
        WHERE i.id = $1`,
        [imageId]
      );
    } else {
      result = await query(
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
          json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name
            )
          ) FILTER (WHERE g.id IS NOT NULL) as groups
        FROM images i
        INNER JOIN image_group_shares igs ON i.id = igs.image_id
        INNER JOIN group_members gm ON igs.group_id = gm.group_id
        INNER JOIN users u ON i.user_id = u.id
        LEFT JOIN groups g ON igs.group_id = g.id
        WHERE i.id = $1 AND gm.user_id = $2
        GROUP BY i.id, i.user_id, i.image_url, i.thumbnail_url, i.file_name, i.file_size, i.mime_type, i.created_at, u.username, u.display_name, u.profile_picture_url`,
        [imageId, authUser.userId]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Image not found or access denied' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const image = {
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
    };

    return NextResponse.json(image, { status: 200 });
  } catch (error: any) {
    console.error('Get image error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/images/[id] - Delete an image (only by owner)
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

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string } };
    const imageId = params.id;

    // Verify user owns the image
    const ownershipCheck = await query(
      `SELECT id, image_url FROM images WHERE id = $1 AND user_id = $2`,
      [imageId, authUser.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Image not found or access denied' },
        { status: 404 }
      );
    }

    const image = ownershipCheck.rows[0];

    // Delete image shares (cascade will handle this, but explicit for clarity)
    await query(
      `DELETE FROM image_group_shares WHERE image_id = $1`,
      [imageId]
    );

    // Delete image
    await query(
      `DELETE FROM images WHERE id = $1`,
      [imageId]
    );

    // TODO: Delete actual file from storage
    // In production, delete from Supabase Storage or S3

    return NextResponse.json(
      { message: 'Image deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

