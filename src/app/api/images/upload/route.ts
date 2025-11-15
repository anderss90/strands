import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { uploadImageSchema } from '@/lib/validation';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

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
    const file = formData.get('file') as File | null;
    const groupIdsJson = formData.get('groupIds') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: 'File is required' },
        { status: 400 }
      );
    }

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

    // Parse and validate group IDs
    let groupIds: string[] = [];
    if (groupIdsJson) {
      try {
        groupIds = JSON.parse(groupIdsJson);
        const validatedData = uploadImageSchema.parse({ groupIds });
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
      const membershipCheck = await query(
        `SELECT group_id FROM group_members
         WHERE user_id = $1 AND group_id = ANY($2::uuid[])`,
        [authUser.userId, groupIds]
      );

      const memberGroupIds = membershipCheck.rows.map(row => row.group_id);
      const invalidGroupIds = groupIds.filter(id => !memberGroupIds.includes(id));

      if (invalidGroupIds.length > 0) {
        return NextResponse.json(
          { message: 'You are not a member of one or more specified groups' },
          { status: 403 }
        );
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${randomUUID()}.${fileExtension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file to public/uploads directory
    // In production, this would upload to Supabase Storage or similar
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, fileBuffer);

    // Generate URLs
    const imageUrl = `/uploads/${fileName}`;
    // For now, thumbnail is the same as image
    // In production, generate a thumbnail using sharp or similar
    const thumbnailUrl = imageUrl;

    // Save image metadata to database
    const imageResult = await query(
      `INSERT INTO images (user_id, image_url, thumbnail_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [authUser.userId, imageUrl, thumbnailUrl, file.name, file.size, file.type]
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

    console.error('Image upload error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

