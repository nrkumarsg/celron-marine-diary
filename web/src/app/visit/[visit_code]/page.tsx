'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Users,
  ShieldCheck,
  Loader2,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

const PURPOSES = [
  'Spare parts enquiry',
  'Technical Discussion',
  'Meeting',
  'Delivery / Collection',
  'Supplier / Vendor',
  'Interview',
  'Other',
];

interface StaffOption {
  id: string;
  full_name: string;
  job_title: string;
}

const DEFAULT_STAFF: StaffOption[] = [
  { id: 'a0000000-0000-0000-0000-000000000002', full_name: 'Ronald Tan', job_title: 'Marine Sales Director' },
  { id: 'a0000000-0000-0000-0000-000000000003', full_name: 'Celine Lim', job_title: 'Customer Service Lead' },
  { id: 'a0000000-0000-0000-0000-000000000001', full_name: 'Cel-Ron Operations Admin', job_title: 'Head of Operations' },
];

export default function CompleteVisitDetailsPage({
  params,
}: {
  params: Promise<{ visit_code: string }>;
}) {
  const resolvedParams = use(params);
  const rawCode = resolvedParams.visit_code || '';
  const visitCode = rawCode.toUpperCase().trim();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [hostName, setHostName] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('Spare parts enquiry');
  const [hostId, setHostId] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [consentGiven, setConsentGiven] = useState(true);
  const [checkInTime, setCheckInTime] = useState('');

  const [staffList, setStaffList] = useState<StaffOption[]>(DEFAULT_STAFF);

  // Load visit details and active staff
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Load active staff
        if (isSupabaseConfigured()) {
          const { data: staffData } = await supabase.rpc('get_active_staff_list');
          if (staffData && Array.isArray(staffData) && staffData.length > 0) {
            setStaffList(staffData);
          }
        }

        // 2. Fetch visit by code
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.rpc('get_visit_by_code', {
            p_visit_code: visitCode,
          });

          if (!error && data?.status === 'ok') {
            const v = data.visit;
            const visitor = data.visitor;
            const host = data.host;

            setFullName(visitor.full_name || visitor.whatsapp_name || '');
            setPhone(visitor.phone || '');
            setCompany(visitor.visitor_company || '');
            setPurpose(v.purpose || 'Spare parts enquiry');
            setPartySize(v.party_size || 1);
            setHostId(host?.id || DEFAULT_STAFF[0].id);
            setCheckInTime(v.checked_in_at || '');

            if (v.details_completed) {
              setIsCompleted(true);
              setHostName(host?.full_name || 'Cel-Ron Team');
            }
            return;
          }
        }

        // Demo / offline fallback
        setPhone('+65 8765 4321');
        setFullName('Capt. Alex Hansen');
        setCompany('Maersk Line Singapore Pte Ltd');
        setHostId(DEFAULT_STAFF[0].id);
        setCheckInTime(new Date().toISOString());
      } catch (err: any) {
        console.warn('Error loading visit details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [visitCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      setErrorMsg('Please specify your company or vessel name.');
      return;
    }
    if (!consentGiven) {
      setErrorMsg('PDPA consent is required to complete check-in.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const selectedStaff = staffList.find((s) => s.id === hostId) || staffList[0];
      setHostName(selectedStaff.full_name);

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('update_visit_details', {
          p_visit_code: visitCode,
          p_visitor_company: company.trim(),
          p_purpose: purpose,
          p_host_profile_id: hostId || null,
          p_party_size: partySize,
          p_consent_given: true,
        });

        if (error || data?.status !== 'ok') {
          throw new Error(data?.message || error?.message || 'Failed to update visit');
        }
      }

      setIsCompleted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving details. Please notify reception.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06101E] flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-slate-400 text-sm font-medium">Retrieving visit check-in #{visitCode}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06101E] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0A2540]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 text-lg">
              CR
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                Cel-Ron Enterprises
              </h1>
              <p className="text-xs text-slate-400">Visitor Check-In • Sim Lim Tower</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              #{visitCode}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 my-auto">
        {isCompleted ? (
          /* Confirmation Success Card */
          <div className="bg-[#0A2540] border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full mb-3">
              Check-In Completed
            </span>

            <h2 className="text-2xl font-extrabold text-white mb-2">
              Welcome, {fullName || 'Valued Guest'}!
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Your arrival has been confirmed. Host{' '}
              <strong className="text-white font-semibold">
                {hostName || 'the Cel-Ron team'}
              </strong>{' '}
              has been notified and will attend to you shortly.
            </p>

            {/* Visit Summary Card */}
            <div className="bg-[#06172A] border border-slate-800 rounded-xl p-4 text-left space-y-2 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Visit Code</span>
                <span className="font-mono font-bold text-emerald-400">#{visitCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Company</span>
                <span className="font-semibold text-slate-200">{company || 'Individual Guest'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Purpose</span>
                <span className="font-medium text-slate-200">{purpose}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Party Size</span>
                <span className="font-medium text-slate-200">{partySize} pax</span>
              </div>
            </div>

            {/* Quick Catalog / Business Card Action */}
            <div className="space-y-3">
              <Link
                href="/c/admin"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30"
              >
                <span>Browse Cel-Ron Marine Catalog & Line Sheet</span>
                <ExternalLink className="w-4 h-4" />
              </Link>

              <p className="text-xs text-slate-400">
                Need urgent assistance? Reception WhatsApp:{' '}
                <a
                  href="https://wa.me/6581962270"
                  className="text-emerald-400 hover:underline font-medium"
                >
                  +65 8196 2270
                </a>
              </p>
            </div>
          </div>
        ) : (
          /* Check-In Details Form */
          <div className="bg-[#0A2540] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Check-In Verified</span>
              </div>
              <h2 className="text-xl font-bold text-white">Confirm Visit Details</h2>
              <p className="text-xs text-slate-400 mt-1">
                Please complete your details so our front desk and engineering staff can assist you promptly.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Capt. James Tan"
                    className="w-full bg-[#06172A] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Mobile Phone (Verified) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (WhatsApp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={phone}
                    className="w-full bg-[#06172A]/60 border border-slate-800 rounded-xl pl-10 pr-24 py-2.5 text-sm text-slate-300 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Company / Vessel */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Company or Vessel Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Maersk Line / Pacific Tug 08"
                    className="w-full bg-[#06172A] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Person to Meet */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Person to Meet at Cel-Ron
                </label>
                <select
                  value={hostId}
                  onChange={(e) => setHostId(e.target.value)}
                  className="w-full bg-[#06172A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id} className="bg-[#06172A] text-white">
                      {staff.full_name} ({staff.job_title})
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose of Visit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Purpose of Visit
                </label>
                <div className="flex flex-wrap gap-2">
                  {PURPOSES.map((p) => {
                    const active = purpose === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPurpose(p)}
                        className={`text-xs py-1.5 px-3 rounded-lg border font-medium transition-all ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-[#06172A] border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Party Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Party Size (Pax)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setPartySize(n)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        partySize === n
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[#06172A] text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {n === 5 ? '5+' : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDPA Consent Box */}
              <div className="p-3 bg-[#06172A] border border-slate-800 rounded-xl space-y-2 mt-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] leading-tight text-slate-400">
                    I consent to Cel-Ron Enterprises Pte Ltd collecting and processing my particulars solely for office visitor management, security, and premise safety under the Singapore Personal Data Protection Act (PDPA).
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Check-In...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm My Arrival</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>Cel-Ron Enterprises Pte Ltd • 10 Jalan Besar, #03-05 Sim Lim Tower, Singapore 208787</p>
      </footer>
    </div>
  );
}
