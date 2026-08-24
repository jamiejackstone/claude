
import React, { useState, useEffect } from 'react';
import { TrendingUp, Heart, Shield, ArrowRight, Loader2, CheckCircle, Star, Users, Award } from 'lucide-react';

export const Franchise: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source_location: 'Franchise Global'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Detect URL path for automated source_location population
    const path = window.location.pathname.split('/').filter(Boolean).pop() || 'Franchise';
    const locationName = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    setFormData(prev => ({ ...prev, source_location: locationName }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        setSubmitError(null);
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'franchise',
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                location: formData.source_location // Using source_location as the "location" context
            })
        });

        const result = await response.json();

        if (response.ok) {
            setIsSubmitted(true);
        } else {
            console.error('Submission failed:', result);
            setSubmitError(result.details || result.error || 'Failed to send enquiry. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting franchise enquiry:', error);
        setSubmitError('A network error occurred. Please check your connection and try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-orange selection:text-brand-dark">
        {/* Header Hero */}
        <div className="bg-brand-dark text-white pt-32 pb-32 md:pb-24 relative overflow-hidden">
             <div className="absolute inset-0 z-0 opacity-20">
                 <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1920" className="w-full h-full object-cover" alt="Coaching Group" loading="lazy" />
                 <div className="absolute inset-0 bg-brand-dark/50 mix-blend-multiply"></div>
             </div>
             
             <div className="absolute bottom-0 left-0 w-full h-12 bg-white clip-wave-top z-10"></div>
            
            <div className="container mx-auto px-4 text-center relative z-20">
                <div className="inline-block bg-brand-orange text-brand-dark px-6 py-2 rounded-lg font-display text-xl uppercase tracking-wide transform -rotate-2 mb-6 shadow-sticker border-2 border-brand-dark">
                    Franchise Opportunity
                </div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mb-6 drop-shadow-lg leading-none">Own Your <span className="text-brand-orange">Home Court</span></h1>
                <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-medium leading-tight">Join the UK's fastest-growing youth basketball network and build a business with a real positive impact.</p>
            </div>
        </div>

        {/* Why Hoop Heroes Intro Section */}
        <section className="pt-2 md:pt-8 pb-16 bg-white">
            <div className="container mx-auto px-4 max-w-4xl text-center">
                <div className="space-y-6 text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
                    <p>
                        There has never been a better time to get involved in youth sports. With children spending more time than ever on screens, parents are actively looking for high-quality, engaging physical outlets for their kids.
                    </p>
                    <p>
                        At Hoop Heroes, we don't just teach basketball; we build character. By becoming a franchisee, you are stepping into a market with high demand, recurring revenue, and a mission-driven community of owners dedicated to developing the next generation.
                    </p>
                </div>
            </div>
        </section>

        {/* Features Grid */}
        <div className="container mx-auto px-4 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 md:mb-24">
                 <div className="p-10 border-4 border-brand-dark rounded-[2.5rem] shadow-sticker hover:shadow-sticker-hover transition-all bg-white group">
                    <div className="w-16 h-16 bg-brand-orange text-brand-dark rounded-2xl flex items-center justify-center mb-6 border-4 border-brand-dark transform group-hover:rotate-6 transition-transform">
                        <TrendingUp size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-display text-3xl mb-4 uppercase">Proven Model</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">Our playbook works. We provide a business-in-a-box including our proprietary curriculum, branding, and management software to get you running fast.</p>
                 </div>
                 <div className="p-10 border-4 border-brand-dark rounded-[2.5rem] shadow-sticker hover:shadow-sticker-hover transition-all bg-white group">
                    <div className="w-16 h-16 bg-brand-dark text-brand-orange rounded-2xl flex items-center justify-center mb-6 border-4 border-brand-dark transform group-hover:-rotate-6 transition-transform">
                        <Heart size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-display text-3xl mb-4 uppercase">Community Impact</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">Build more than a business. Create a positive sanctuary for local youth, fostering friendships and confidence while becoming a cornerstone of your local community.</p>
                 </div>
                 <div className="p-10 border-4 border-brand-dark rounded-[2.5rem] shadow-sticker hover:shadow-sticker-hover transition-all bg-white group">
                    <div className="w-16 h-16 bg-brand-orange text-brand-dark rounded-2xl flex items-center justify-center mb-6 border-4 border-brand-dark transform group-hover:rotate-6 transition-transform">
                        <Shield size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-display text-3xl mb-4 uppercase">Full Support</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">You're in business for yourself, but never by yourself. We handle the heavy lifting—marketing, booking systems, and head-coach training.</p>
                 </div>
            </div>

            {/* Application Form */}
            <div className="bg-brand-light rounded-[3rem] p-8 md:p-16 text-center max-w-4xl mx-auto border-4 border-brand-dark shadow-sticker relative overflow-hidden">
                {isSubmitted ? (
                    <div className="py-12 animate-fade-in">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="font-display text-4xl mb-4 uppercase text-brand-dark">Request Received!</h2>
                        <p className="text-lg text-slate-600 font-medium max-w-md mx-auto">
                            A member of our franchise team will review your enquiry and contact you shortly to discuss next steps.
                        </p>
                        <button 
                            onClick={() => setIsSubmitted(false)}
                            className="mt-8 text-brand-dark font-black underline uppercase tracking-wider hover:text-brand-orange"
                        >
                            Send another request
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="font-display text-4xl md:text-5xl mb-6 uppercase text-brand-dark">Ready to get in the game?</h2>
                        <p className="mb-10 text-lg text-slate-600 font-medium italic">Complete the form below to receive our franchise information pack and start your journey.</p>
                        
                        <form className="max-w-lg mx-auto space-y-4 text-left" onSubmit={handleSubmit}>
                            {/* Hidden field for location tracking */}
                            <input type="hidden" name="source_location" value={formData.source_location} />
                            
                            {submitError && (
                                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-bold animate-fade-in">
                                    {submitError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-brand-dark ml-2">Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Your full name" 
                                        className="w-full p-4 rounded-xl border-2 border-slate-300 focus:ring-0 focus:border-brand-orange outline-none font-bold text-brand-dark"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase text-brand-dark ml-2">Phone</label>
                                    <input 
                                        required
                                        type="tel" 
                                        placeholder="Mobile number" 
                                        className="w-full p-4 rounded-xl border-2 border-slate-300 focus:ring-0 focus:border-brand-orange outline-none font-bold text-brand-dark"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase text-brand-dark ml-2">Email</label>
                                <input 
                                    required
                                    type="email" 
                                    placeholder="Enter your email" 
                                    className="w-full p-4 rounded-xl border-2 border-slate-300 focus:ring-0 focus:border-brand-orange outline-none font-bold text-brand-dark"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-brand-dark text-white font-display text-2xl uppercase px-8 py-5 rounded-xl hover:bg-brand-dark/90 transition-all whitespace-nowrap border-4 border-brand-dark shadow-sticker flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none"
                            >
                                {isSubmitting ? (
                                    <>Processing <Loader2 className="animate-spin" /></>
                                ) : (
                                    <>Request information pack <ArrowRight /></>
                                )}
                            </button>
                        </form>
                        
                        <p className="mt-8 text-sm font-bold text-slate-500 uppercase tracking-wide">
                            Or email us directly at <a href="mailto:franchise@hoopheroes.co.uk" className="text-brand-orange hover:underline">franchise@hoopheroes.co.uk</a>
                        </p>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
