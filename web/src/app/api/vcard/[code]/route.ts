import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateVCard } from '@/lib/vcard';
import { SAMPLE_CARDS } from '@/lib/mockData';
import { CardData } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  let cardData: CardData | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_public_card', {
        p_short_code: code,
      });

      if (!error && data && data.status === 'ok') {
        cardData = data as CardData;
      }
    } catch (err) {
      console.error('vCard fetch error from Supabase:', err);
    }
  }

  // Fallback to sample cards if Supabase not configured or code matches mock
  if (!cardData && SAMPLE_CARDS[code]) {
    cardData = SAMPLE_CARDS[code];
  }

  if (!cardData?.profile) {
    return new NextResponse('Card or profile not found', { status: 404 });
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
