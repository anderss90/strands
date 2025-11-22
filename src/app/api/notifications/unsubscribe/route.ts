import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// POST /api/notifications/unsubscribe - Unsubscribe from push notifications
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
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { message: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Remove subscription
    await query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [authUser.userId, endpoint]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Unsubscribe from notifications error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

