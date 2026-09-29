import { Metadata } from 'next';
import { headers } from 'next/headers';
import CardView from '@/components/CardView';
import { supabase, isSupabaseConfigured, logScanRecord } from '@/lib/supabase';
import { SAMPLE_CARDS } from '@/lib/mockData';
import { CardData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `NFC Digital Card - ${slug} | Cel-Ron Enterprises`,
    description: 'Cel-Ron Enterprises Pte Ltd staff NFC tap business card and marine documents.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function NfcTapCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase();

  let cardData: CardData = {
    status: 'not_found',
    message: 'Staff member or active tap card not found',
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_tap_card', {
        p_staff_slug: cleanSlug,
      });

      if (!error && data) {
        cardData = data as CardData;
      }
    } catch (err) {
      console.error('Error fetching NFC tap card:', err);
    }
  }

  // Fallback to sample card if mock available
  if (cardData.status === 'not_found' && SAMPLE_CARDS[cleanSlug]) {
    cardData = SAMPLE_CARDS[cleanSlug];
  }

  // Log NFC tap telemetry
  if (cardData.profile?.id) {
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || undefined;
    logScanRecord({
      shareLinkId: cardData.share_link?.id,
      profileId: cardData.profile.id,
      source: 'nfc',
      userAgent: userAgent,
    }).catch(() => {});
  }

  return (
    <CardView
      cardData={cardData}
      vcardUrl={`/api/vcard/t/${cleanSlug}`}
    />
  );
}
