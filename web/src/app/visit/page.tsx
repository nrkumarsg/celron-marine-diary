'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Building2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ShieldCheck,
  Phone,
  User,
  Users,
  Briefcase,
  Loader2,
  Clock,
} from 'lucide-react';

const PURPOSES = [
  'Spare parts enquiry',
  'Delivery / Collection',
  'Technical Meeting',
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
  { id: 'a0000000-0000-0000-0000-000000000003', full_name: 'Celine Lim', job_title: 'Technical Support Specialist' },
  { id: 'a0000000-0000-0000-0000-000000000001', full_name: 'Cel-Ron Operations Admin', job_title: 'Head of Operations' },
];

export default function VisitorCheckInPage() {
  const [phone, setPhone] = useState('+65 ');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [purpose, setPurpose] = useState('Spare parts enquiry');
  const [hostId, setHostId] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(1);
  const [consentGiven, setConsentGiven] = useState(true);

  const [staffList, setStaffList] = useState<StaffOption[]>(DEFAULT_STAFF);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkInResult, setCheckInResult] = useState<{
    visitCode: string;
    isReturning: boolean;
    name: string;
  } | null>(null);

  // Load active staff members for "Person to Meet" dropdown
  useEffect(() => {
    async function loadStaff() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.rpc('get_active_staff_list');
          if (!error && data && Array.isArray(data) && data.length > 0) {
            setStaffList(data);
            // Default to Cel-Ron Operations Admin
            const adminOp = data.find((s: StaffOption) =>
              s.full_name.toLowerCase().includes('operations')
            );
            setHostId(adminOp ? adminOp.id : data[0].id);
            return;
          }
        } catch (e) {
          console.warn('Could not load staff list from Supabase:', e);
        }
      }
      const defaultOp = DEFAULT_STAFF.find((s) => s.full_name.includes('Operations')) || DEFAULT_STAFF[2];
      setHostId(defaultOp.id);
    }

    loadStaff();
  }, []);

  // Quick lookup when 8-digit Singapore number is entered
  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    const clean = val.replace(/[^\+0-9]/g, '');

    if (clean.length >= 8 && isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('visitors')
          .select('full_name, visitor_company')
          .ilike('phone', `%${clean.slice(-8)}%`)
          .limit(1)
          .single();

        if (data) {
          if (!fullName && data.full_name) setFullName(data.full_name);
          if (!company && data.visitor_company) setCompany(data.visitor_company);
        }
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.replace(/[^\+0-9]/g, '');
    if (cleanPhone.length < 8) {
      setErrorMsg('Please enter a valid mobile number (e.g. +65 9123 4567)');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!consentGiven) {
      setErrorMsg('Please accept the PDPA consent to complete check-in.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('check_in_visitor', {
          p_phone: cleanPhone,
          p_full_name: fullName.trim(),
          p_visitor_company: company.trim() || null,
          p_purpose: purpose,
          p_host_profile_id: hostId || null,
          p_party_size: partySize,
          p_consent_given: consentGiven,
          p_source: 'qr_form',
        });

        if (error) {
          throw error;
        }

        if (data && data.status === 'ok') {
          setCheckInResult({
            visitCode: data.visit_code,
            isReturning: Boolean(data.is_returning),
            name: fullName.trim(),
          });
          return;
        }
      }

      // Offline / Demo fallback
      const randomCode = 'CR-' + Math.floor(100000 + Math.random() * 900000);
      setCheckInResult({
        visitCode: randomCode,
        isReturning: false,
        name: fullName.trim(),
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Check-in failed. Please notify reception.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06101E] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white pb-12">
      {/* Background nautical ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-blue-700/20 via-sky-600/10 to-transparent blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Cel-Ron Enterprises"
              className="w-12 h-12 object-contain drop-shadow"
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">
                Cel-Ron Enterprises Pte Ltd
              </h1>
              <p className="text-[11px] text-sky-400">Reception Visitor Check-In</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
            OFFICE
          </span>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto w-full px-4 sm:px-5 pt-6 flex-1 flex flex-col justify-center">
        {checkInResult ? (
          /* SUCCESS SCREEN */
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800/50 uppercase tracking-wider">
              {checkInResult.isReturning ? 'Welcome Back!' : 'Checked In ✓'}
            </span>

            <h2 className="text-2xl font-extrabold text-white mt-3">
              Welcome, {checkInResult.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Your visit has been registered with Cel-Ron reception. Staff have been notified.
            </p>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-6">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                Your Check-In Reference Code
              </span>
              <span className="text-2xl font-mono font-bold text-sky-400 tracking-wider">
                {checkInResult.visitCode}
              </span>
            </div>

            {/* WHATSAPP FOLLOW UP BUTTON */}
            <a
              href={`https://wa.me/6581962270?text=${encodeURIComponent(
                `Hi Cel-Ron, I just checked in at reception with code [${checkInResult.visitCode}]. Looking forward to meeting.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition transform active:scale-98 mb-3"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat with Cel-Ron on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setCheckInResult(null);
                setFullName('');
                setCompany('');
                setPhone('+65 ');
              }}
              className="text-xs text-slate-400 hover:text-white py-2"
            >
              Check in another visitor
            </button>
          </div>
        ) : (
          /* VISITOR CHECK-IN FORM */
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Visitor Registration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sim Lim Tower #03-05 Office • Please input your requirement. Thanks.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mobile Phone First */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+65 9123 4567"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Returning visitors will auto-fill your name and company.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Capt. James Tan"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Company / Vessel */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Vessel / Shipyard
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Sembcorp Marine / Maersk"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Purpose & Person to Meet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purpose of Visit
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Person to Meet
                  </label>
                  <select
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.job_title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PDPA Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700 focus:ring-sky-500"
                  />
                  <span className="text-[11px] text-slate-400 leading-tight">
                    I consent to Cel-Ron Enterprises Pte Ltd collecting my details for visitor records and to follow up on my enquiry.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-xl shadow-sky-950/50 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Check-In...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Complete Check-In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="relative z-10 max-w-md mx-auto text-center px-4 pt-4 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>No NRIC/Passport numbers requested</span>
        </div>
        <span>Cel-Ron Enterprises © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
