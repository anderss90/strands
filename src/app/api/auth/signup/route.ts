import { NextRequest, NextResponse } from 'next/server';
import { signUpSchema } from '@/lib/validation';
import { createUser, getUserByUsername, generateTokens } from '@/lib/auth';

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

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        tokens,
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

