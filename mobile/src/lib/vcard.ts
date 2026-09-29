import { StaffProfile } from '../types';

/**
 * Generates an RFC 2426 compliant vCard (Version 3.0) string
 * for direct encoding into an offline QR code.
 * Works seamlessly with iOS Camera and Android Google Lens without internet!
 */
export function generateOfflineVCard(profile: StaffProfile, companyName: string = 'Cel-Ron Enterprises Pte Ltd'): string {
  const nameParts = profile.full_name.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const firstName = nameParts[0] || '';

  const cleanPhone = profile.phone ? profile.phone.replace(/[^\+0-9]/g, '') : '';
  const cleanWa = profile.whatsapp ? profile.whatsapp.replace(/[^\+0-9]/g, '') : cleanPhone;

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.full_name}`,
    `N:${lastName};${firstName};;;`,
    `ORG:${companyName}`,
  ];

  if (profile.job_title) {
    lines.push(`TITLE:${profile.job_title}`);
  }

  if (cleanPhone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${cleanPhone}`);
  }

  if (cleanWa && cleanWa !== cleanPhone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${cleanWa}`);
  }

  if (profile.email) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${profile.email}`);
  }

  lines.push('URL:https://celron.com.sg');
  lines.push('ADR;TYPE=WORK:;;1 Rochor Canal Rd #03-05 Sim Lim Square;Singapore;;188504;Singapore');
  lines.push('NOTE:Marine Spare Parts Specialist - Cel-Ron Enterprises');
  lines.push('END:VCARD');

  return lines.join('\n');
}
