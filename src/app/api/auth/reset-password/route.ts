import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validation';
import { verifyPasswordResetToken, updateUserPassword, getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Verify and decode the reset token
    let tokenPayload;
    try {
      tokenPayload = verifyPasswordResetToken(validatedData.token);
    } catch (error: any) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Verify user still exists
    const user = await getUserById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify email matches (in case email was changed after token was generated)
    if (user.email !== tokenPayload.email) {
      return NextResponse.json(
        { message: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Update user password
    await updateUserPassword(user.id, validatedData.password);

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
