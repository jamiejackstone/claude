
import React, { useEffect } from 'react';
import { ShieldAlert, AlertCircle, Info } from 'lucide-react';

export const AccidentReport: React.FC = () => {
  useEffect(() => {
    // Load the GHL form embed script
    const script = document.createElement('script');
    script.src = "https://link.halomarketinghub.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-brand-dark pb-20">
      {/* Header Section */}
      <div className="relative pt-32 pb-20 bg-brand-dark text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 bg-pattern-grid"></div>
        
        {/* Organic Wave Bottom */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-slate-50 clip-wave-top z-10"></div>

        <div className="container mx-auto px-4 relative z-20 text-center">
            <div className="inline-block bg-brand-orange text-brand-dark px-6 py-2 rounded-lg font-display text-xl uppercase tracking-wide transform -rotate-2 mb-6 border-2 border-brand-dark shadow-sticker">
                INTERNAL USE ONLY
            </div>
            <h1 className="font-display text-5xl md:text-7xl uppercase mb-4 drop-shadow-lg leading-none">
                ACCIDENT <span className="text-brand-orange">REPORT</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-tight">
                Official reporting form for Hoop Heroes coaching staff. Please complete this immediately following any incident.
            </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-20 -mt-6">
        {/* Instruction Block */}
        <div className="bg-white rounded-[2rem] p-6 mb-8 border-4 border-brand-dark shadow-sticker flex items-start gap-4">
            <div className="bg-brand-orange p-3 rounded-xl text-brand-dark shrink-0">
                <Info size={24} strokeWidth={3} />
            </div>
            <div>
                <h3 className="font-display text-xl uppercase mb-1">Coach Instructions</h3>
                <p className="text-sm text-slate-600 font-medium">
                    Ensure the participant is safe and first aid has been administered if necessary. Complete every section of this form as accurately as possible. The data is sent directly to our central safeguarding and administration team.
                </p>
            </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border-4 border-brand-dark shadow-sticker min-h-[1500px]">
            <div className="p-4 md:p-8">
                <iframe
                    src="https://link.halomarketinghub.com/widget/form/lpGjE9ktlOROvEaaAu7d"
                    style={{ width: '100%', height: '1474px', border: 'none', borderRadius: '3px' }}
                    id="inline-lpGjE9ktlOROvEaaAu7d" 
                    data-layout="{'id':'INLINE'}"
                    data-trigger-type="alwaysShow"
                    data-trigger-value=""
                    data-activation-type="alwaysActivated"
                    data-activation-value=""
                    data-deactivation-type="neverDeactivate"
                    data-deactivation-value=""
                    data-form-name="Accident Report Form"
                    data-height="1474"
                    data-layout-iframe-id="inline-lpGjE9ktlOROvEaaAu7d"
                    data-form-id="lpGjE9ktlOROvEaaAu7d"
                    title="Accident Report Form"
                ></iframe>
            </div>
        </div>

        {/* Emergency Support Footer */}
        <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs mb-4">
                <ShieldAlert size={14} /> Need immediate assistance?
            </div>
            <div className="bg-brand-dark text-white p-6 rounded-3xl border-2 border-brand-dark">
                <p className="font-display text-xl uppercase mb-2">Urgent Welfare Support</p>
                <a href="mailto:welfare@hoopheroes.co.uk" className="text-brand-orange font-black hover:underline tracking-wide">
                    welfare@hoopheroes.co.uk
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};
