import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorizeProfileForPush } from '@/lib/pushAuth';

export async function POST(req: NextRequest) {
  try {
    const { profileId, subscription } = await req.json();
    if (
      !profileId ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (!(await authorizeProfileForPush(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('push_subscriptions')
      .upsert(
        {
          profile_id: profileId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: 'profile_id,endpoint' }
      );

    if (error) {
      console.error('[push/subscribe] upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { profileId, endpoint } = await req.json();
    if (!profileId || !endpoint) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (!(await authorizeProfileForPush(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', profileId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
