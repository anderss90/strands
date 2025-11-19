import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { createServerSupabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { updateStrandSchema } from '@/lib/validation';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// GET /api/strands/[id] - Get a specific strand
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

    // If admin, get strand directly. Otherwise, verify user has access
    let result;
    if (authUser.isAdmin) {
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
          i.thumbnail_url,
          i.file_name,
          i.file_size,
          i.mime_type,
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
                  'name', g.name,
                  'isPinned', EXISTS(SELECT 1 FROM strand_pins sp WHERE sp.strand_id = s.id AND sp.group_id = g.id),
                  'userRole', COALESCE(gm.role, NULL)
                )
              )
              FROM strand_group_shares sgs
              INNER JOIN groups g ON sgs.group_id = g.id
              LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $2
              WHERE sgs.strand_id = s.id
            ),
            '[]'::json
          ) as groups
        FROM strands s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN images i ON s.image_id = i.id
        WHERE s.id = $1`,
        [strandId, authUser.userId]
      );
    } else {
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
          i.thumbnail_url,
          i.file_name,
          i.file_size,
          i.mime_type,
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
          json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name,
              'isPinned', EXISTS(SELECT 1 FROM strand_pins sp WHERE sp.strand_id = s.id AND sp.group_id = g.id),
              'userRole', gm.role
            )
          ) FILTER (WHERE g.id IS NOT NULL) as groups
        FROM strands s
        INNER JOIN strand_group_shares sgs ON s.id = sgs.strand_id
        INNER JOIN group_members gm ON sgs.group_id = gm.group_id
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN images i ON s.image_id = i.id
        LEFT JOIN groups g ON sgs.group_id = g.id
        WHERE s.id = $1 AND gm.user_id = $2
        GROUP BY s.id, s.user_id, s.content, s.image_id, s.created_at, s.updated_at, s.edited_at, u.username, u.display_name, u.profile_picture_url, i.image_url, i.thumbnail_url, i.file_name, i.file_size, i.mime_type`,
        [strandId, authUser.userId]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Strand not found or access denied' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const strand = {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      imageId: row.image_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      editedAt: row.edited_at,
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
        thumbnailUrl: row.thumbnail_url,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
      } : null,
      groups: row.groups || [],
    };

    return NextResponse.json(strand, { status: 200 });
  } catch (error: any) {
    console.error('Get strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/strands/[id] - Update a strand (only by owner)
export async function PUT(
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
    const strandId = params.id;

    // Verify user owns the strand
    const ownershipCheck = await query(
      `SELECT id, content, image_id FROM strands WHERE id = $1 AND user_id = $2`,
      [strandId, authUser.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Strand not found or access denied' },
        { status: 404 }
      );
    }

    const existingStrand = ownershipCheck.rows[0];

    // Parse form data
    const formData = await request.formData();
    const content = formData.get('content') as string | null;
    const file = formData.get('file') as File | null;
    const removeImage = formData.get('removeImage') === 'true';

    // Validate update data
    try {
      updateStrandSchema.parse({
        content: content || undefined,
        removeImage: removeImage || undefined,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
    }

    // Validate content length if provided
    if (content && content.trim().length > 5000) {
      return NextResponse.json(
        { message: 'Content must be 5000 characters or less' },
        { status: 400 }
      );
    }

    let newImageId: string | null = existingStrand.image_id;

    // Handle image removal
    if (removeImage) {
      if (!existingStrand.image_id) {
        return NextResponse.json(
          { message: 'Strand does not have an image to remove' },
          { status: 400 }
        );
      }
      // Check if strand has content, otherwise it would violate the constraint
      if (!content?.trim() && !existingStrand.content) {
        return NextResponse.json(
          { message: 'Cannot remove image: strand must have either content or image' },
          { status: 400 }
        );
      }
      newImageId = null;
    }

    // Handle new image upload
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
          { status: 413 }
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

      newImageId = imageResult.rows[0].id;
    }

    // Update strand
    const trimmedContent = content !== null ? (content.trim() || null) : existingStrand.content;
    
    // Validate: at least content or image must be present
    if (!trimmedContent && !newImageId) {
      return NextResponse.json(
        { message: 'Strand must have either content or image' },
        { status: 400 }
      );
    }

    const updateResult = await query(
      `UPDATE strands 
       SET content = $1, image_id = $2, edited_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, content, image_id, created_at, updated_at, edited_at`,
      [trimmedContent, newImageId, strandId]
    );

    const strand = updateResult.rows[0];

    return NextResponse.json(
      {
        id: strand.id,
        userId: strand.user_id,
        content: strand.content,
        imageId: strand.image_id,
        createdAt: strand.created_at,
        updatedAt: strand.updated_at,
        editedAt: strand.edited_at,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/strands/[id] - Delete a strand (only by owner)
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
    const strandId = params.id;

    // Verify user owns the strand
    const ownershipCheck = await query(
      `SELECT id FROM strands WHERE id = $1 AND user_id = $2`,
      [strandId, authUser.userId]
    );

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { message: 'Strand not found or access denied' },
        { status: 404 }
      );
    }

    // Delete strand (cascade will handle shares, pins, and comments)
    await query(
      `DELETE FROM strands WHERE id = $1`,
      [strandId]
    );

    return NextResponse.json(
      { message: 'Strand deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete strand error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
