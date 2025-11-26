import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { z } from 'zod';

// Validation schema for media metadata
const createMediaSchema = z.object({
  mediaUrl: z.string().url('Invalid media URL'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileSize: z.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required').max(50, 'MIME type too long'),
  mediaType: z.enum(['image', 'video'], {
    errorMap: () => ({ message: 'Media type must be either image or video' }),
  }),
  duration: z.number().int().nonnegative('Duration must be non-negative').optional(),
  width: z.number().int().positive('Width must be positive').optional(),
  height: z.number().int().positive('Height must be positive').optional(),
  groupIds: z.array(z.string().uuid('Invalid group ID')).optional(),
});

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
    
    // Parse JSON body (no file upload, just metadata)
    const body = await request.json();
    
    // Validate request body
    let validatedData;
    try {
      validatedData = createMediaSchema.parse(body);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }

    const {
      mediaUrl,
      thumbnailUrl,
      fileName,
      fileSize,
      mimeType,
      mediaType,
      duration,
      width,
      height,
      groupIds = [],
    } = validatedData;

    // Verify user is a member of all groups if provided
    if (groupIds.length > 0) {
      try {
        const membershipCheck = await query(
          `SELECT group_id FROM group_members
           WHERE user_id = $1 AND group_id = ANY($2::uuid[])`,
          [authUser.userId, groupIds]
        );

        const memberGroupIds = membershipCheck.rows.map(row => String(row.group_id));
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

    // Save media metadata to database
    // Use image_url for backward compatibility, but also set media_url
    const imageResult = await query(
      `INSERT INTO images (
        user_id, 
        image_url, 
        media_url,
        thumbnail_url, 
        file_name, 
        file_size, 
        mime_type,
        media_type,
        duration,
        width,
        height
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, user_id, image_url, media_url, thumbnail_url, file_name, file_size, mime_type, media_type, duration, width, height, created_at`,
      [
        authUser.userId,
        mediaUrl, // image_url for backward compatibility
        mediaUrl, // media_url
        thumbnailUrl || mediaUrl, // thumbnail_url (use media_url if not provided)
        fileName,
        fileSize,
        mimeType,
        mediaType,
        duration || null,
        width || null,
        height || null,
      ]
    );

    const media = imageResult.rows[0];

    // Create media group shares if group IDs provided
    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        await query(
          `INSERT INTO image_group_shares (image_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (image_id, group_id) DO NOTHING`,
          [media.id, groupId]
        );
      }
    }

    return NextResponse.json(
      {
        id: media.id,
        userId: media.user_id,
        mediaUrl: media.media_url || media.image_url,
        imageUrl: media.image_url, // For backward compatibility
        thumbnailUrl: media.thumbnail_url,
        fileName: media.file_name,
        fileSize: media.file_size,
        mimeType: media.mime_type,
        mediaType: media.media_type,
        duration: media.duration,
        width: media.width,
        height: media.height,
        createdAt: media.created_at,
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

    console.error('Create media metadata error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

