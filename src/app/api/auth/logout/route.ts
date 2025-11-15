import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Since we're using JWT tokens, logout is handled client-side
  // by removing the token from storage
  // In a more advanced setup, you might want to maintain a token blacklist
  
  return NextResponse.json(
    { message: 'Logged out successfully' },
    { status: 200 }
  );
}

