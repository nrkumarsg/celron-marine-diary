import { Metadata } from 'next';
import { headers } from 'next/headers';
import CardView from '@/components/CardView';
import { supabase, isSupabaseConfigured, logScanRecord } from '@/lib/supabase';
import { SAMPLE_CARDS } from '@/lib/mockData';
import { CardData } from '@/lib/types';

// Force dynamic rendering since scans are logged and links may expire
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Digital Card & Documents - ${code} | Cel-Ron Enterprises`,
    description: 'Cel-Ron Enterprises Pte Ltd digital business card and marine documents.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SharedCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { code } = await params;
  const { s } = await searchParams;
  const source = s === 'link' ? 'link' : 'qr';

  let cardData: CardData = {
    status: 'not_found',
    message: 'Card link not found or expired',
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_public_card', {
        p_short_code: code,
      });

      if (!error && data) {
        cardData = data as CardData;
      }
    } catch (err) {
      console.error('Error fetching public card:', err);
    }
  }

  // Fallback to sample card if mock available
  if (cardData.status === 'not_found' && SAMPLE_CARDS[code]) {
    cardData = SAMPLE_CARDS[code];
  }

  // Log scan telemetry in background
  if (cardData.profile?.id) {
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || undefined;
    logScanRecord({
      shareLinkId: cardData.share_link?.id,
      profileId: cardData.profile.id,
      source: source,
      userAgent: userAgent,
    }).catch(() => {});
  }

  return (
    <CardView
      cardData={cardData}
      vcardUrl={`/api/vcard/${code}`}
    />
  );
}
