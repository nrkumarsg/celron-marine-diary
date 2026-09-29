import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateVCard } from '@/lib/vcard';
import { SAMPLE_CARDS } from '@/lib/mockData';
import { CardData } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  let cardData: CardData | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_tap_card', {
        p_staff_slug: slug.toLowerCase(),
      });

      if (!error && data && data.status === 'ok') {
        cardData = data as CardData;
      }
    } catch (err) {
      console.error('vCard fetch error from Supabase:', err);
    }
  }

  // Fallback to sample cards if Supabase not configured or slug matches mock
  if (!cardData && SAMPLE_CARDS[slug.toLowerCase()]) {
    cardData = SAMPLE_CARDS[slug.toLowerCase()];
  }

  if (!cardData?.profile) {
    return new NextResponse('Staff profile not found', { status: 404 });
  }

  const vcardText = generateVCard(cardData.profile, cardData.company);
  const safeFilename = `${cardData.profile.staff_slug || 'contact'}.vcf`;

  return new NextResponse(vcardText, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
