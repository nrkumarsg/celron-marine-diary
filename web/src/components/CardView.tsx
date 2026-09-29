'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CardData } from '@/lib/types';
import LeadForm from '@/components/LeadForm';
import {
  Phone,
  MessageCircle,
  Mail,
  UserPlus,
  FileText,
  Download,
  ExternalLink,
  MapPin,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Building2,
} from 'lucide-react';

interface CardViewProps {
  cardData: CardData;
  vcardUrl: string;
}

export default function CardView({ cardData, vcardUrl }: CardViewProps) {
  const { status, message, company, profile, share_link, documents } = cardData;

  // Handle expired or inactive states
  if (status === 'not_found' || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Digital Card Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            {message || 'The card or staff member you are looking for is unavailable or the link may have changed.'}
          </p>
          <a
            href="https://celron.com.sg"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition"
          >
            Visit Cel-Ron Enterprises
          </a>
        </div>
      </main>
    );
  }

  if (status === 'expired') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Share Link Expired</h1>
          <p className="text-slate-400 text-sm mb-6">
            This document pack link expired on{' '}
            {share_link?.expires_at ? new Date(share_link.expires_at).toLocaleDateString() : 'a previous date'}.
            Please request an updated link from {profile.full_name}.
          </p>
          <Link
            href={`/t/${profile.staff_slug}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition"
          >
            View Active Profile Card
          </Link>
        </div>
      </main>
    );
  }

  const cleanPhone = profile.phone ? profile.phone.replace(/[^\+0-9]/g, '') : '';
  const cleanWa = profile.whatsapp ? profile.whatsapp.replace(/[^\+0-9]/g, '') : cleanPhone;
  const waUrl = cleanWa
    ? `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hi ${profile.full_name}, I saw your Cel-Ron digital business card and would like to connect.`)}`
    : '';

  return (
    <div className="min-h-screen bg-[#06101E] text-slate-100 flex justify-center selection:bg-sky-500 selection:text-white pb-16">
      {/* Background nautical ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-blue-700/20 via-sky-600/10 to-transparent blur-[120px] rounded-full" />
      </div>

      <main className="relative w-full max-w-md px-4 sm:px-5 pt-6 sm:pt-8 flex flex-col gap-6 z-10">
        
        {/* HEADER BRANDING */}
        <header className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Cel-Ron Logo"
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                {company?.name || 'Cel-Ron Enterprises Pte Ltd'}
              </h2>
              <p className="text-[10px] text-slate-400">Marine Spare Parts • Singapore</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-blue-900/60 text-sky-300 border border-blue-700/40">
            OFFICIAL
          </span>
        </header>

        {/* HERO CARD PROFILE */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-700/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center text-center">
            {/* Photo Avatar */}
            <div className="relative mb-4 group">
              <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-sky-500/30 shadow-2xl bg-slate-800 relative">
                {profile.photo_url ? (
                  <Image
                    src={profile.photo_url}
                    alt={profile.full_name}
                    fill
                    className="object-cover"
                    sizes="120px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-sky-300 bg-gradient-to-br from-slate-800 to-blue-900">
                    {profile.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 border-2 border-slate-950 w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                <span className="w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* Profile Info */}
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {profile.full_name}
            </h1>
            <p className="text-sm font-medium text-sky-400 mt-0.5">
              {profile.job_title || 'Marine Specialist'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Cel-Ron Enterprises Pte Ltd
            </p>

            {share_link?.label && (
              <div className="mt-3 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
                Shared Pack: <strong className="text-white">{share_link.label}</strong>
              </div>
            )}
          </div>

          {/* PRIMARY CALL TO ACTION: SAVE TO CONTACTS */}
          <div className="mt-6">
            <a
              href={vcardUrl}
              download={`${profile.staff_slug}.vcf`}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-base shadow-xl shadow-sky-950/50 flex items-center justify-center gap-3 transition-all transform active:scale-98"
            >
              <UserPlus className="w-5 h-5" />
              <span>Save to Contacts</span>
            </a>
          </div>

          {/* QUICK COMMUNICATION BUTTONS */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {profile.phone ? (
              <a
                href={`tel:${cleanPhone}`}
                className="py-3 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex flex-col items-center justify-center gap-1.5 transition text-slate-200 hover:text-white"
              >
                <Phone className="w-5 h-5 text-sky-400" />
                <span className="text-[11px] font-medium">Call</span>
              </a>
            ) : null}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex flex-col items-center justify-center gap-1.5 transition text-slate-200 hover:text-white"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-[11px] font-medium">WhatsApp</span>
              </a>
            ) : null}

            {profile.email ? (
              <a
                href={`mailto:${profile.email}?subject=Enquiry%20via%20Digital%20Card`}
                className="py-3 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex flex-col items-center justify-center gap-1.5 transition text-slate-200 hover:text-white"
              >
                <Mail className="w-5 h-5 text-indigo-400" />
                <span className="text-[11px] font-medium">Email</span>
              </a>
            ) : null}
          </div>
        </section>

        {/* SHARED DOCUMENTS & CATALOGUES */}
        {documents && documents.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Documents & Catalogues ({documents.length})</span>
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {documents.map((doc) => {
                const isPdf = doc.file_type === 'application/pdf' || doc.file_url.endsWith('.pdf');
                return (
                  <div
                    key={doc.id}
                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/60 shrink-0 overflow-hidden relative flex items-center justify-center">
                        {doc.thumbnail_url ? (
                          <Image
                            src={doc.thumbnail_url}
                            alt={doc.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-sky-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-800/50 mb-1 capitalize">
                          {doc.category.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {isPdf ? 'PDF Document' : 'Image File'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 transition"
                        title="View document"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={doc.file_url}
                        download
                        className="p-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-sky-300 hover:text-white transition"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* LEAD CAPTURE FORM */}
        <section>
          <LeadForm
            shareLinkId={share_link?.id}
            staffName={profile.full_name}
          />
        </section>

        {/* COMPANY OFFICE & VERIFICATION FOOTER */}
        <footer className="mt-2 pt-6 border-t border-slate-800/80 text-xs text-slate-400 space-y-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>{company?.address || '1 Rochor Canal Road, #03-05 Sim Lim Square, Singapore 188504'}</span>
          </div>

          {company?.website && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                {company.website.replace('https://', '')}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 pt-3 text-[11px] text-slate-500 justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Singapore PDPA Compliant</span>
            </div>
            <span>Cel-Ron Enterprises © {new Date().getFullYear()}</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
