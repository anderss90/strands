import { NextRequest, NextResponse } from 'next/server';
import { signUpSchema } from '@/lib/validation';
import { createUser, getUserByUsername, generateTokens } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signUpSchema.parse(body);

    // Check if username is already taken
    const existingUserByUsername = await getUserByUsername(validatedData.username);
    if (existingUserByUsername) {
      return NextResponse.json(
        { message: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Create user (email and displayName are generated automatically)
    const user = await createUser(
      validatedData.username,
      validatedData.password
    );

    // Generate tokens
    const tokens = generateTokens(user);

    // Handle invite token if provided
    let groupId: string | null = null;
    if (validatedData.inviteToken) {
      try {
        // Validate token (exists and not expired)
        const inviteResult = await query(
          `SELECT group_id FROM group_invites
           WHERE token = $1 AND expires_at > NOW()`,
          [validatedData.inviteToken]
        );

        if (inviteResult.rows.length > 0) {
          groupId = inviteResult.rows[0].group_id;

          // Add user to group (ignore if already member, which shouldn't happen for new users)
          const insertResult = await query(
            `INSERT INTO group_members (group_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (group_id, user_id) DO NOTHING
             RETURNING group_id`,
            [groupId, user.id]
          );

          // Verify the user was added (check if insert actually happened)
          if (insertResult.rows.length === 0) {
            // Check if user is already a member (shouldn't happen for new users, but verify)
            const memberCheck = await query(
              `SELECT group_id FROM group_members
               WHERE group_id = $1 AND user_id = $2`,
              [groupId, user.id]
            );
            
            if (memberCheck.rows.length === 0) {
              console.error('Failed to add user to group via invite token');
            }
          }
        }
      } catch (inviteError: any) {
        // Log error but don't fail signup if invite processing fails
        console.error('Error processing invite token:', inviteError);
        console.error('Invite token:', validatedData.inviteToken);
        console.error('User ID:', user.id);
      }
    }

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        tokens,
        groupId, // Include groupId if user was added via invite
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

    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

