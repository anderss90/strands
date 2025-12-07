import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { createServerSupabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { createStrandSchema } from '@/lib/validation';
import { notifyGroupMembers } from '@/lib/notifications';

// Recommended maximum file size: 4MB for serverless functions
// Files larger than this should use direct upload to Supabase Storage
// This limit is kept as a recommendation, but we'll allow larger files if they come through
const RECOMMENDED_MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// GET /api/strands - Get strands feed for the authenticated user
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
      limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      offset = parseInt(searchParams.get('offset') || '0');
    } catch (error) {
      limit = 20;
      offset = 0;
    }

    // If admin, get all strands. Otherwise, get strands shared in groups the user is a member of
    let strandIdsResult;
    if (authUser.isAdmin) {
      strandIdsResult = await query(
        `SELECT DISTINCT s.id, s.created_at
         FROM strands s
         ORDER BY s.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      strandIdsResult = await query(
        `SELECT DISTINCT s.id, s.created_at
         FROM strands s
         INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
         INNER JOIN group_members gm ON sgs.group_id = gm.group_id
         WHERE gm.user_id = $1
         ORDER BY s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [authUser.userId, limit, offset]
      );
    }

    if (strandIdsResult.rows.length === 0) {
      return NextResponse.json({
        strands: [],
        pagination: {
          limit,
          offset,
          hasMore: false,
        },
      }, { status: 200 });
    }

    const strandIds = strandIdsResult.rows.map(row => row.id);

    // Get full strand details with groups, image info, and fire counts
    const result = await query(
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
          WHERE sf.strand_id = s.id AND sf.user_id = $2
        ) as has_user_fired,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', g.id,
                'name', g.name
              )
            )
            FROM strand_group_shares sgs
            INNER JOIN groups g ON sgs.group_id = g.id
            WHERE sgs.strand_id = s.id
          ),
          '[]'::json
        ) as groups,
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
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN images i ON s.image_id = i.id
      WHERE s.id = ANY($1::uuid[])
      ORDER BY s.created_at DESC`,
      [strandIds, authUser.userId]
    );

    const strands = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      imageId: row.image_id,
      createdAt: row.created_at,
      fireCount: row.fire_count || 0,
      hasUserFired: row.has_user_fired || false,
      updatedAt: row.updated_at,
      editedAt: row.edited_at,
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
      groups: row.groups || [],
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
    console.error('Get strands feed error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/strands - Create a new strand
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
    
    // Check content type to determine if it's JSON or FormData
    const contentType = request.headers.get('content-type') || '';
    let content: string | null = null;
    let file: File | null = null;
    let imageId: string | null = null;
    let groupIds: string[] = [];
    let allFiles: File[] = [];
    let formData: FormData | null = null;

    if (contentType.includes('application/json')) {
      // Handle JSON request (for direct uploads)
      const body = await request.json();
      content = body.content || null;
      imageId = body.imageId || null;
      groupIds = body.groupIds || [];

      // Validate: at least content or imageId must be provided
      if (!content?.trim() && !imageId) {
        return NextResponse.json(
          { message: 'Either content or image (or both) is required' },
          { status: 400 }
        );
      }
    } else {
      // Handle FormData request (traditional upload)
      formData = await request.formData();
      content = formData.get('content') as string | null;
      
      // Support both single file and multiple files
      const singleFile = formData.get('file') as File | null;
      const files = formData.getAll('files') as File[];
      
      // Combine single file (for backward compatibility) and multiple files
      if (singleFile && singleFile instanceof File) {
        allFiles.push(singleFile);
      }
      allFiles.push(...files.filter(f => f instanceof File && f.size > 0));
      
      // Use first file for backward compatibility, but we'll process all files
      file = allFiles.length > 0 ? allFiles[0] : null;
      
      const groupIdsJson = formData.get('groupIds') as string | null;

      // Validate: at least content or files must be provided
      if (!content?.trim() && allFiles.length === 0) {
        return NextResponse.json(
          { message: 'Either content or media files (or both) is required' },
          { status: 400 }
        );
      }

      // Parse group IDs from JSON string
      if (groupIdsJson) {
        try {
          groupIds = JSON.parse(groupIdsJson);
        } catch (error) {
          return NextResponse.json(
            { message: 'Invalid group IDs format' },
            { status: 400 }
          );
        }
      }
    }

    // Validate content length if provided
    if (content && content.trim().length > 5000) {
      return NextResponse.json(
        { message: 'Content must be 5000 characters or less' },
        { status: 400 }
      );
    }

    // Validate group IDs
    try {
      const validatedData = createStrandSchema.parse({ content: content || undefined, groupIds });
      groupIds = validatedData.groupIds;
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

    // Verify user is a member of all groups
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

    // Process multiple files if provided
    const imageIds: string[] = [];
    
    // If imageId is provided (from direct upload), use it
    if (imageId) {
      imageIds.push(imageId);
    }
    
    // Upload all files and collect image IDs
    if (allFiles.length > 0) {
      const supabase = createServerSupabase();
      const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm'];
      const allowedVideoExtensions = ['mp4', 'mov', 'avi', 'webm'];
      const allowedVideoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      
      for (let i = 0; i < allFiles.length; i++) {
        const currentFile = allFiles[i];
        
        // Validate file type
        // On iOS, file.type can be empty, so we also check the file extension
        const fileExtension = currentFile.name.split('.').pop()?.toLowerCase() || '';
        const isVideo = allowedVideoExtensions.includes(fileExtension) || 
                       (currentFile.type && allowedVideoMimeTypes.includes(currentFile.type));
        const isImage = !isVideo && (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension) ||
                       (currentFile.type && ALLOWED_MIME_TYPES.includes(currentFile.type)));
        
        if (!isImage && !isVideo) {
          return NextResponse.json(
            { message: `Invalid file type for file ${i + 1}: ${currentFile.name}. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed.` },
            { status: 400 }
          );
        }
        
        // Normalize MIME type if it's missing but extension is valid
        let normalizedMimeType = currentFile.type;
        if (!normalizedMimeType) {
          const extensionToMime: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'webm': 'video/webm',
          };
          normalizedMimeType = extensionToMime[fileExtension] || (isVideo ? 'video/mp4' : 'image/jpeg');
        }

        // Warn about large files but don't reject them
        // Large files should ideally use direct upload, but we'll handle them here if they come through
        if (isImage && currentFile.size > RECOMMENDED_MAX_FILE_SIZE) {
          console.warn(`Large file upload detected: ${(currentFile.size / 1024 / 1024).toFixed(2)}MB. Consider using direct upload for better performance.`);
        }

        // Generate unique filename
        const finalFileExtension = fileExtension || (isVideo ? 'mp4' : 'jpg');
        const fileName = `${randomUUID()}.${finalFileExtension}`;
        const fileBuffer = Buffer.from(await currentFile.arrayBuffer());

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(fileName, fileBuffer, {
            contentType: normalizedMimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          return NextResponse.json(
            { message: `Failed to upload file ${i + 1} to storage` },
            { status: 500 }
          );
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;
        const thumbnailUrl = imageUrl; // For now, use same URL as thumbnail

        // Save image metadata to database
        const imageResult = await query(
          `INSERT INTO images (user_id, image_url, thumbnail_url, file_name, file_size, mime_type, media_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [authUser.userId, imageUrl, thumbnailUrl, currentFile.name, currentFile.size, normalizedMimeType, isVideo ? 'video' : 'image']
        );

        imageIds.push(imageResult.rows[0].id);
      }
      
      // For backward compatibility, set imageId to first image
      if (imageIds.length > 0) {
        imageId = imageIds[0];
      }
    }

    // If no imageIds and no content, we can't create a strand
    if (imageIds.length === 0 && !content?.trim()) {
      return NextResponse.json(
        { message: 'Either content or media files (or both) is required' },
        { status: 400 }
      );
    }

    // Create strand
    const trimmedContent = content?.trim() || null;
    const strandResult = await query(
      `INSERT INTO strands (user_id, content, image_id)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, content, image_id, created_at, updated_at, edited_at`,
      [authUser.userId, trimmedContent, imageId || null]
    );

    const strand = strandResult.rows[0];
    
    // Create strand_media entries for all images
    if (imageIds.length > 0) {
      for (let i = 0; i < imageIds.length; i++) {
        await query(
          `INSERT INTO strand_media (strand_id, image_id, display_order)
           VALUES ($1, $2, $3)
           ON CONFLICT (strand_id, image_id) DO NOTHING`,
          [strand.id, imageIds[i], i]
        );
      }
    }

    // Create strand group shares and send notifications
    if (groupIds.length > 0) {
      // Get user display name for notifications
      const userResult = await query(
        `SELECT display_name FROM users WHERE id = $1`,
        [authUser.userId]
      );
      const userDisplayName = userResult.rows[0]?.display_name || authUser.username;

      for (const groupId of groupIds) {
        await query(
          `INSERT INTO strand_group_shares (strand_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (strand_id, group_id) DO NOTHING`,
          [strand.id, groupId]
        );

        // Get group name for notification
        const groupResult = await query(
          `SELECT name FROM groups WHERE id = $1`,
          [groupId]
        );
        const groupName = groupResult.rows[0]?.name || 'a group';

        // Send push notifications to group members (exclude the strand author)
        await notifyGroupMembers(
          groupId,
          [authUser.userId],
          {
            title: 'New strand in ' + groupName,
            body: `${userDisplayName} posted a new strand`,
            data: {
              type: 'strand',
              strandId: strand.id,
              groupId: groupId,
              url: `/groups/${groupId}`,
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        id: strand.id,
        userId: strand.user_id,
        content: strand.content,
        imageId: strand.image_id,
        createdAt: strand.created_at,
        updatedAt: strand.updated_at,
        editedAt: strand.edited_at,
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

    console.error('Create strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
