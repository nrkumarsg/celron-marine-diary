'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface LeadFormProps {
  shareLinkId?: string | null;
  staffName: string;
}

export default function LeadForm({ shareLinkId, staffName }: LeadFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Please provide your name and contact phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured() && shareLinkId) {
        const { error } = await supabase.from('leads').insert({
          share_link_id: shareLinkId,
          name: name.trim(),
          company: company.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          message: message.trim() || null,
        });

        if (error) {
          console.error('Lead submission error:', error);
          throw error;
        }
      } else {
        // Mock fallback mode for local development
        console.log('[Lead Form Mock Submission]', {
          shareLinkId,
          name,
          company,
          phone,
          email,
          message,
        });
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to submit details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-lg backdrop-blur-md">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h4 className="text-lg font-semibold text-white">Details Sent!</h4>
        <p className="text-emerald-200/90 text-sm mt-1">
          Thank you for reaching out. <strong className="text-white">{staffName}</strong> has received your contact info and will follow up with you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 shadow-xl backdrop-blur-md transition-all">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-98"
        >
          <Send className="w-4 h-4" />
          <span>Leave Your Details / Exchange Contact</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span>Leave Your Contact for {staffName}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Capt. James Tan"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Company / Vessel Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Pacific Shipping Pte Ltd"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mobile / WhatsApp <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+65 9123 4567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Enquiry / Spare Parts Needed
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Looking for generator fuel injector spares..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Details...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Contact Details</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
