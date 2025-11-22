import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken, getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Get user to ensure they still exist
    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json(
      { accessToken },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Invalid or expired refresh token') {
      return NextResponse.json(
        { message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    console.error('Refresh token error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

