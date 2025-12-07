import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { uploadImageSchema } from '@/lib/validation';

/**
 * POST /api/images/metadata
 * Saves image metadata to database after direct upload to Supabase Storage
 * Accepts: imageUrl, file metadata, groupIds
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { 
      imageUrl, 
      thumbnailUrl, 
      fileName, 
      fileSize, 
      mimeType, 
      mediaType,
      duration,
      width,
      height,
      groupIds: groupIdsJson 
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { message: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Parse and validate group IDs
    // Note: groupIds are optional for metadata endpoint since sharing happens via strands
    let groupIds: string[] = [];
    if (groupIdsJson) {
      try {
        groupIds = Array.isArray(groupIdsJson) ? groupIdsJson : JSON.parse(groupIdsJson);
        // Only validate if groupIds are provided and not empty
        if (groupIds.length > 0) {
          const validatedData = uploadImageSchema.parse({ groupIds });
          groupIds = validatedData.groupIds;
        }
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return NextResponse.json(
            { message: 'Validation error', errors: error.errors },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { message: 'Invalid group IDs format' },
          { status: 400 }
        );
      }
    }

    // Verify user is a member of all groups
    if (groupIds.length > 0) {
      try {
        const membershipCheck = await query(
          `SELECT group_id FROM group_members
           WHERE user_id = $1 AND group_id = ANY($2::uuid[])`,
          [authUser.userId, groupIds]
        );

        const memberGroupIds = membershipCheck.rows.map(row => {
          const groupId = row.group_id;
          return typeof groupId === 'string' ? groupId : String(groupId);
        });
        
        const groupIdsAsStrings = groupIds.map(id => String(id));
        const invalidGroupIds = groupIdsAsStrings.filter(id => !memberGroupIds.includes(id));

        if (invalidGroupIds.length > 0) {
          return NextResponse.json(
            { message: 'You are not a member of one or more specified groups' },
            { status: 403 }
          );
        }
      } catch (membershipError: any) {
        console.error('Membership check error:', membershipError);
        return NextResponse.json(
          { message: 'Failed to verify group membership' },
          { status: 500 }
        );
      }
    }

    // Determine media type from mimeType if not provided
    const finalMediaType = mediaType || (mimeType?.startsWith('video/') ? 'video' : 'image');
    
    // Save image metadata to database
    const imageResult = await query(
      `INSERT INTO images (user_id, image_url, thumbnail_url, file_name, file_size, mime_type, media_type, duration, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        authUser.userId,
        imageUrl,
        thumbnailUrl || imageUrl,
        fileName || 'uploaded-image',
        fileSize || 0,
        mimeType || 'image/jpeg',
        finalMediaType,
        duration || null,
        width || null,
        height || null,
      ]
    );

    const image = imageResult.rows[0];

    // Create image group shares
    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        await query(
          `INSERT INTO image_group_shares (image_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (image_id, group_id) DO NOTHING`,
          [image.id, groupId]
        );
      }
    }

    return NextResponse.json(
      {
        id: image.id,
        userId: image.user_id,
        imageUrl: image.image_url,
        thumbnailUrl: image.thumbnail_url,
        fileName: image.file_name,
        fileSize: image.file_size,
        mimeType: image.mime_type,
        mediaType: image.media_type,
        duration: image.duration,
        width: image.width,
        height: image.height,
        createdAt: image.created_at,
        groupIds,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Image metadata save error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

