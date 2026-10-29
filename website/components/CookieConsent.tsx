
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Check, X } from 'lucide-react';
import {
  CONSENT_STORAGE_KEY,
  loadPixel,
  pushDataLayerEvent,
  trackPageView,
  updateGoogleConsent,
} from '../lib/metaPixel';

function bannerShouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return true;
  }
}

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => bannerShouldShow());

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    setIsVisible(false);
    updateGoogleConsent(true);
    loadPixel();
    trackPageView();
    pushDataLayerEvent('cookie_consent_accepted');
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'rejected');
    setIsVisible(false);
    updateGoogleConsent(false);
    pushDataLayerEvent('cookie_consent_rejected');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm transition-opacity duration-300">
        {/* Modal Container */}
        <div className="bg-white border-4 border-brand-dark rounded-[2.5rem] shadow-2xl p-8 max-w-2xl w-full flex flex-col md:flex-row items-center gap-8 animate-fade-in relative overflow-hidden">
            
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-light rounded-full -mr-16 -mt-16 z-0 pointer-events-none"></div>

            {/* Icon & Text */}
            <div className="flex-1 flex flex-col gap-4 text-center md:text-left relative z-10">
                <div className="mx-auto md:mx-0 bg-brand-orange p-4 rounded-2xl border-2 border-brand-dark transform -rotate-3 w-fit shadow-sticker">
                    <Cookie className="text-brand-dark w-8 h-8" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-display text-2xl text-brand-dark uppercase mb-2">We Value Your Privacy</h3>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        We use cookies to improve your experience, manage bookings via <strong>TeamUp</strong>, and analyze marketing via <strong>GTM & Meta</strong>. Tracking is only enabled if you click Accept.
                    </p>
                    <div className="mt-2">
                        <Link to="/policies?section=privacy" onClick={() => setIsVisible(false)} className="text-brand-dark font-black underline text-sm hover:text-brand-orange">
                            Read Privacy & Cookie Policy
                        </Link>
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-56 relative z-10">
                <button
                    onClick={handleAccept}
                    className="w-full px-6 py-4 rounded-xl bg-brand-dark border-2 border-brand-dark text-white font-display uppercase text-xl shadow-sticker hover:shadow-sticker-hover hover:-translate-y-1 hover:bg-brand-orange hover:text-brand-dark transition-all text-center flex items-center justify-center gap-2"
                >
                    <Check size={20} /> Accept All
                </button>
                <button
                    onClick={handleReject}
                    className="w-full px-6 py-4 rounded-xl bg-white border-2 border-brand-dark text-brand-dark font-display uppercase text-xl shadow-sticker hover:shadow-sticker-hover hover:-translate-y-1 hover:bg-brand-orange transition-all text-center flex items-center justify-center gap-2"
                >
                    <X size={20} /> Reject Non-Essential
                </button>
            </div>
        </div>
    </div>
  );
};
