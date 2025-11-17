import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { createServerSupabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { createStrandSchema } from '@/lib/validation';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
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

    // Get full strand details with groups and image info
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
        i.thumbnail_url,
        i.file_name,
        i.file_size,
        i.mime_type,
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
        ) as groups
      FROM strands s
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN images i ON s.image_id = i.id
      WHERE s.id = ANY($1::uuid[])
      ORDER BY s.created_at DESC`,
      [strandIds]
    );

    const strands = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      imageId: row.image_id,
      createdAt: row.created_at,
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
        thumbnailUrl: row.thumbnail_url,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
      } : null,
      groups: row.groups || [],
    }));

    return NextResponse.json({
      strands,
      pagination: {
        limit,
        offset,
        hasMore: strands.length === limit,
      },
    }, { status: 200 });
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
    
    // Parse form data
    const formData = await request.formData();
    const content = formData.get('content') as string | null;
    const file = formData.get('file') as File | null;
    const groupIdsJson = formData.get('groupIds') as string | null;

    // Validate: at least content or file must be provided
    if (!content?.trim() && !file) {
      return NextResponse.json(
        { message: 'Either content or image (or both) is required' },
        { status: 400 }
      );
    }

    // Validate content length if provided
    if (content && content.trim().length > 5000) {
      return NextResponse.json(
        { message: 'Content must be 5000 characters or less' },
        { status: 400 }
      );
    }

    // Parse and validate group IDs
    let groupIds: string[] = [];
    if (groupIdsJson) {
      try {
        groupIds = JSON.parse(groupIdsJson);
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

    let imageId: string | null = null;

    // Upload image if provided
    if (file) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${randomUUID()}.${fileExtension}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Upload to Supabase Storage
      const supabase = createServerSupabase();
      const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        return NextResponse.json(
          { message: 'Failed to upload image to storage' },
          { status: 500 }
        );
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      const thumbnailUrl = imageUrl;

      // Save image metadata to database
      const imageResult = await query(
        `INSERT INTO images (user_id, image_url, thumbnail_url, file_name, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [authUser.userId, imageUrl, thumbnailUrl, file.name, file.size, file.type]
      );

      imageId = imageResult.rows[0].id;
    }

    // Create strand
    const trimmedContent = content?.trim() || null;
    const strandResult = await query(
      `INSERT INTO strands (user_id, content, image_id)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, content, image_id, created_at, updated_at, edited_at`,
      [authUser.userId, trimmedContent, imageId]
    );

    const strand = strandResult.rows[0];

    // Create strand group shares
    if (groupIds.length > 0) {
      for (const groupId of groupIds) {
        await query(
          `INSERT INTO strand_group_shares (strand_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (strand_id, group_id) DO NOTHING`,
          [strand.id, groupId]
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
