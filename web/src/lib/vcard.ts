import { Profile, Company } from './types';

/**
 * Generates an RFC 2426 compliant vCard (Version 3.0) file string.
 * Compatible with iPhone (Apple Contacts) and Android (Google Contacts).
 */
export function generateVCard(profile: Profile, company?: Company): string {
  const nameParts = profile.full_name.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const firstName = nameParts[0] || '';

  const vcardLines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.full_name}`,
    `N:${lastName};${firstName};;;`,
  ];

  if (company?.name) {
    vcardLines.push(`ORG:${company.name}`);
  }

  if (profile.job_title) {
    vcardLines.push(`TITLE:${profile.job_title}`);
  }

  if (profile.phone) {
    const cleanPhone = profile.phone.replace(/[^\+0-9]/g, '');
    vcardLines.push(`TEL;TYPE=CELL,VOICE:${cleanPhone}`);
  }

  if (profile.whatsapp && profile.whatsapp !== profile.phone) {
    const cleanWa = profile.whatsapp.replace(/[^\+0-9]/g, '');
    vcardLines.push(`TEL;TYPE=WORK,VOICE:${cleanWa}`);
  }

  if (profile.email) {
    vcardLines.push(`EMAIL;TYPE=INTERNET,PREF:${profile.email}`);
  }

  if (company?.website) {
    vcardLines.push(`URL:${company.website}`);
  }

  if (company?.address) {
    // Escaping commas and semicolons for vCard standard
    const escapedAddr = company.address.replace(/,/g, '\\,');
    vcardLines.push(`ADR;TYPE=WORK:;;${escapedAddr};Singapore;;;Singapore`);
  }

  if (profile.photo_url) {
    vcardLines.push(`PHOTO;VALUE=URI:${profile.photo_url}`);
  }

  vcardLines.push(`NOTE:Marine Spare Parts Specialist - Cel-Ron Enterprises Pte Ltd`);
  vcardLines.push(`REV:${new Date().toISOString()}`);
  vcardLines.push('END:VCARD');

  return vcardLines.join('\r\n');
}
