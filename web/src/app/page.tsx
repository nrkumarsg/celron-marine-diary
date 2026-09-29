import Link from 'next/link';
import {
  CreditCard,
  FileText,
  UserCheck,
  ScanLine,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#06101E] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-blue-600/20 via-sky-500/10 to-transparent blur-[140px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">
                Cel-Ron Enterprises Pte Ltd
              </h1>
              <p className="text-xs text-sky-400">Marine Spare Parts • Singapore</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </span>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Business Card & Document System</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Marine Parts Technical & Commercial Portal
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            Instant digital cards, catalogue sharing, and reception visitor logging for Cel-Ron Enterprises Pte Ltd.
          </p>
        </div>

        {/* STEP 2 DEMO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {/* Card 1: Ronald Tan (Director) */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between group transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950 text-sky-300 border border-blue-800/50">
                  NFC Tap Card (/t)
                </span>
                <span className="text-xs text-slate-500">Live Preview</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition">
                Ronald Tan — Marine Sales Director
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Permanent NFC tap link programmed to automatically load his active marine engine & pump catalogue pack.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Link
                href="/t/ronald-tan"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>Open Digital Card (/t/ronald-tan)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="/api/vcard/t/ronald-tan"
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Test vCard Download (.vcf)</span>
              </a>
            </div>
          </div>

          {/* Card 2: Preset QR Pack */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between group transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800/50">
                  Shared Pack QR (/c)
                </span>
                <span className="text-xs text-slate-500">Live Preview</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition">
                Pack Code: CRON-GEN
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Shared QR pack bundle containing the corporate profile, 2026 spare parts catalogue, and ISO certification.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Link
                href="/c/CRON-GEN"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <span>Open Shared Pack (/c/CRON-GEN)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="/api/vcard/CRON-GEN"
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Test vCard Download (.vcf)</span>
              </a>
            </div>
          </div>
        </div>

        {/* FEATURE CAPABILITIES GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <CreditCard className="w-5 h-5 text-sky-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-white">Digital Card</div>
            <div className="text-[11px] text-slate-500">vCard 3.0 Sync</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <FileText className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-white">Catalogues</div>
            <div className="text-[11px] text-slate-500">PDFs & Certs</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <ScanLine className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-white">AI Scanner</div>
            <div className="text-[11px] text-slate-500">Gemini Flash OCR</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <UserCheck className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-white">Visitor Diary</div>
            <div className="text-[11px] text-slate-500">WhatsApp + Web</div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800/80 px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cel-Ron Enterprises Pte Ltd • 1 Rochor Canal Road, #03-05 Sim Lim Square, Singapore</span>
          </div>
          <span>PDPA Compliant</span>
        </div>
      </footer>
    </div>
  );
}
