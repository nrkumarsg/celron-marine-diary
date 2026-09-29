'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, MessageCircle, Globe, ShieldCheck, Anchor, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReceptionPosterPage() {
  const whatsappUrl =
    'https://wa.me/6581962270?text=Hi%20Cel-Ron%2C%20I%27d%20like%20to%20check%20in%20%5BVISIT%5D';

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://celron.vercel.app';

  const webFallbackUrl = `${baseUrl}/visit`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white text-slate-900 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* SCREEN-ONLY TOOLBAR */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print A4 Poster</span>
        </button>
      </div>

      {/* A4 PRINTABLE POSTER CONTAINER */}
      <div className="w-full max-w-2xl bg-white rounded-3xl print:rounded-none shadow-2xl print:shadow-none p-8 sm:p-12 border border-slate-200 print:border-none flex flex-col items-center text-center justify-between min-h-[840px] print:min-h-screen">
        {/* HEADER BRANDING */}
        <div className="w-full border-b-2 border-slate-900 pb-6 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Cel-Ron Enterprises Pte Ltd"
            className="w-28 h-28 object-contain mb-3 drop-shadow-md"
          />
          <h1 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight uppercase">
            Cel-Ron Enterprises Pte Ltd
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 tracking-wide uppercase mt-1">
            Marine Engine, Pump & Auxiliary Spare Parts • Singapore
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            10 Jalan Besar, #03-05 Sim Lim Tower, Singapore 208787 • Tel: +65 8196 2270
          </p>
        </div>

        {/* PRIMARY WHATSAPP CHECK-IN QR */}
        <div className="my-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold mb-4 uppercase tracking-wider">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Fast Check-In via WhatsApp</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Scan to Check In & Chat With Us
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6">
            Open your phone camera, scan the QR code below, and tap send to log your visit instantly.
          </p>

          <div className="p-4 bg-white rounded-2xl border-4 border-[#0A2540] shadow-xl">
            <QRCodeSVG
              value={whatsappUrl}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-slate-800 font-bold text-sm">
            <span>WhatsApp Business:</span>
            <span className="text-emerald-700 font-mono text-base">+65 8196 2270</span>
          </div>
        </div>

        {/* SECONDARY WEB FORM FALLBACK QR */}
        <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>No WhatsApp? Use Web Form</span>
            </div>
            <p className="text-xs text-slate-600">
              Scan this QR to check in using a standard web browser form, or visit:
            </p>
            <span className="text-xs font-mono font-semibold text-blue-700 block mt-1">
              {webFallbackUrl}
            </span>
          </div>

          <div className="p-2 bg-white rounded-xl border border-slate-300 shrink-0">
            <QRCodeSVG
              value={webFallbackUrl}
              size={90}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* FOOTER & PDPA COMPLIANCE */}
        <div className="w-full pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Singapore PDPA Compliant • Visitor contact details only</span>
          </div>
          <span>Reception Counter Display Sign</span>
        </div>
      </div>
    </div>
  );
}
