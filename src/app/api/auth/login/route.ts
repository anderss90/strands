import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { getUserByUsername, verifyPassword, generateTokens } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Get user by username
    const user = await getUserByUsername(validatedData.username);
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        tokens,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

