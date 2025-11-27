import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getAuthenticatedUser } from '@/lib/middleware';
import { getUserById } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validation';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    // Check if authResult is an error response
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    // Check if authResult has user property
    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };
    const user = await getUserById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;
    
    // Include isAdmin status from the authenticated user (which is fetched from DB in middleware)
    const userWithAdmin = {
      ...userWithoutPassword,
      isAdmin: authUser.isAdmin,
    };

    return NextResponse.json(userWithAdmin, { status: 200 });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    // Check if authResult is an error response
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    // Check if authResult has user property
    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string } };
    const body = await request.json();
    
    // Validate request body
    const validatedData = updateProfileSchema.parse(body);
    
    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (validatedData.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex}`);
      updateValues.push(validatedData.displayName.trim());
      paramIndex++;
    }

    if (validatedData.profilePictureUrl !== undefined) {
      updateFields.push(`profile_picture_url = $${paramIndex}`);
      updateValues.push(validatedData.profilePictureUrl);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(authUser.userId);

    // Update user profile
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, username, display_name, profile_picture_url, created_at, updated_at
    `;

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      display_name: updatedUser.display_name,
      profile_picture_url: updatedUser.profile_picture_url,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

