
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Trophy, Users, ArrowRight, Star, ShieldCheck, Heart, Clock, Award, Calendar, ShoppingCart, AlertTriangle } from 'lucide-react';
import { LOCATIONS } from '../constants';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(LOCATIONS);

  const FREE_TRIAL_URL = "https://goteamup.com/p/6822945-hoop-heroes/memberships/166242/";

  // Load Review Widget Script
  useEffect(() => {
    const scriptUrl = 'https://reputationhub.site/reputation/assets/review-widget.js';
    const scriptId = 'reputation-widget-script';

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (query.trim() === '') {
        setSearchResults(LOCATIONS);
    } else {
        setSearchResults(LOCATIONS.filter(loc => 
            loc.name.toLowerCase().includes(query) || 
            loc.address.toLowerCase().includes(query) ||
            loc.id.includes(query)
        ));
    }
  };

  const scrollToFindClass = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('find-class');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden font-sans text-brand-dark">
      
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-32 pb-32 bg-brand-dark">
        {/* Background Texture & Image */}
        <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute inset-0 bg-brand-dark/30 mix-blend-multiply z-10"></div>
            <img 
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1600" 
                alt="Hoop Heroes Basketball Action" 
                className="w-full h-full object-cover"
                loading="eager"
            />
        </div>

        {/* Decorative organic shapes */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-white clip-wave-top z-10"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-brand-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-40 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 text-center">
            
            <div className="inline-block transform -rotate-2 mb-8">
                <div className="bg-brand-orange text-brand-dark px-6 py-2 font-display text-xl uppercase tracking-wide shadow-sticker border-2 border-brand-dark rounded-lg">
                    BASKETBALL FOR AGES 5-15 YEARS
                </div>
            </div>
            
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-white mb-8 uppercase tracking-wide leading-[0.9] drop-shadow-lg">
                Heroes<br/>
                <span className="text-brand-orange">Rise Here</span>
            </h1>
            
            <div className="text-xl md:text-3xl text-white mb-12 font-medium drop-shadow-md max-w-4xl mx-auto leading-tight">
                Swap screentime for gametime. Develop <span className="text-brand-orange font-bold">Respect</span>, <span className="text-brand-orange font-bold">Confidence</span>, and <span className="text-brand-orange font-bold">Teamwork</span> on and off the court.
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <a 
                  href="#find-class" 
                  onClick={scrollToFindClass}
                  className="w-full sm:w-auto bg-brand-orange hover:bg-yellow-400 text-brand-dark border-2 border-brand-dark px-10 py-4 rounded-full font-display text-xl uppercase tracking-wide transition-all shadow-sticker hover:shadow-sticker-hover transform hover:-translate-y-1 flex items-center justify-center gap-3"
                >
                    FIND A CLASS <Search size={24} strokeWidth={3} />
                </a>
                <a 
                  href={FREE_TRIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-brand-dark border-2 border-brand-dark px-10 py-4 rounded-full font-display text-xl uppercase tracking-wide transition-all shadow-sticker hover:shadow-sticker-hover transform hover:-translate-y-1 flex items-center justify-center gap-3"
                >
                   Book a free trial
                </a>
            </div>
        </div>
      </section>

      {/* LOCATION FINDER SECTION */}
      <section id="find-class" className="relative z-20 -mt-24 px-4 mb-2 scroll-mt-24">
         <div className="max-w-6xl mx-auto bg-white rounded-[3rem] shadow-2xl p-6 md:p-8 border-4 border-brand-dark">
            <div className="bg-brand-light rounded-[2rem] p-8 md:p-12 border-2 border-dashed border-slate-300">
                
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="font-display text-4xl md:text-6xl text-brand-dark mb-4 uppercase">Find Your Nearest Hoop Heroes Class</h2>
                    <p className="text-slate-600 text-lg font-medium">
                      Enter your postcode or town to find your nearest class then book a free taster session. Suitable for all skill levels.
                    </p>
                </div>

                {/* Search Input */}
                <div className="relative max-w-2xl mx-auto mb-16 group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <MapPin className="h-8 w-8 text-brand-dark" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-20 pr-6 py-6 rounded-full bg-white border-4 border-brand-dark text-xl font-bold text-brand-dark placeholder-slate-400 focus:outline-none focus:border-brand-orange transition-colors shadow-sticker"
                        placeholder="Search town / postcode"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                    <button className="absolute right-3 top-3 bottom-3 bg-brand-orange hover:bg-yellow-400 text-brand-dark px-8 rounded-full font-display text-lg uppercase tracking-wide transition-all border-2 border-brand-dark hidden md:block">
                        Search
                    </button>
                </div>

                {/* Results Grid - Image-free for blazing fast loads */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {searchResults.map((loc) => {
                        return (
                            <div 
                                key={loc.id} 
                                onClick={() => navigate(`/location/${loc.slug}`)}
                                className="group bg-white border-4 border-brand-dark rounded-3xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-300 shadow-sticker hover:shadow-sticker-hover flex flex-col h-full"
                            >
                                {/* Bold color top cap matching location state */}
                                <div className={`h-4 border-b-4 border-brand-dark flex-shrink-0 ${loc.comingSoon ? 'bg-blue-600' : 'bg-brand-orange'}`}></div>
                                
                                <div className="p-6 bg-white flex flex-col flex-grow">
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <h3 className="text-brand-dark font-display text-3xl uppercase leading-none">{loc.name}</h3>
                                        {loc.comingSoon && (
                                            <span className="shrink-0 inline-block px-3 py-1 rounded-lg bg-blue-600 border-2 border-brand-dark text-white text-[10px] font-black uppercase tracking-wider font-sans leading-none">
                                                {loc.comingSoonDate || "Coming 2026"}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1.5 text-brand-dark text-xs font-black uppercase tracking-wide mb-4">
                                      <div className="flex items-center gap-2">
                                          <MapPin size={14} className={loc.comingSoon ? "text-blue-500" : "text-brand-orange"}/> {loc.comingSoon && loc.address.toLowerCase().startsWith('coming soon') ? "COMING SOON" : loc.address.split(',')[0]}
                                      </div>
                                      {loc.displayDays && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <Calendar size={14} className="text-brand-orange"/> {loc.displayDays}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex-grow">
                                        {loc.tempVenueNotice && (
                                            <div className="mb-3 p-3 bg-brand-orange/10 border-2 border-brand-orange/30 rounded-xl flex items-start gap-3 animate-pulse">
                                                <AlertTriangle size={18} className="text-brand-orange shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-brand-orange tracking-wider">Venue Update</p>
                                                    <p className="text-[11px] font-bold text-brand-dark leading-tight">{loc.tempVenueNotice}</p>
                                                </div>
                                            </div>
                                        )}
                                        {loc.comingSoon && (
                                            <div className="h-full flex items-center justify-center text-center p-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed min-h-[80px]">
                                                <p className="text-slate-500 font-bold text-sm italic">
                                                    Classes launching soon. Join the priority waitlist today!
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100 mt-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-brand-dark uppercase tracking-wider group-hover:text-brand-orange transition-colors">
                                                {loc.comingSoon ? "JOIN PRIORITY WAITLIST" : "SEE CLASS TIMES"}
                                            </span>
                                        </div>
                                        <span className={`w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors ${loc.comingSoon ? 'bg-blue-600 group-hover:bg-blue-500' : 'bg-brand-dark group-hover:bg-brand-orange group-hover:text-brand-dark'}`}>
                                            <ArrowRight size={20} strokeWidth={3} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
         </div>
      </section>
      
      {/* REVIEWS SECTION */}
      <section className="py-2 bg-white relative z-20">
         <div className="max-w-6xl mx-auto px-4">
             <div className="bg-white rounded-[2.5rem] border-4 border-brand-dark shadow-sticker pt-8 pb-4 px-4 md:px-6 overflow-hidden min-h-[500px]">
                <div className="text-center mb-6">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                         <span className="font-display text-2xl md:text-3xl text-brand-dark uppercase">Hoop Heroes</span>
                         <span className="hidden md:block text-slate-300 font-light text-2xl">|</span>
                         <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                             <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px] md:text-sm whitespace-nowrap">5-Star Rated on Google</span>
                         </div>
                    </div>
                </div>
                
                <div className="relative">
                    <iframe 
                        className="lc_reviews_widget" 
                        src="https://reputationhub.site/reputation/widgets/review_widget/9p0wEiLpTaIe1FDTFFQI?widgetId=6925621ff44c6d6cf010b9e2" 
                        frameBorder="0" 
                        scrolling="no" 
                        style={{ minWidth: '100%', width: '100%', height: '460px', border: 'none' }}
                        title="Customer Reviews"
                        loading="lazy"
                    />
                </div>
             </div>
         </div>
      </section>

      {/* PROMO BANNERS SECTION */}
      <section className="py-12 bg-white relative z-20">
          <div className="max-w-6xl mx-auto px-4">
              <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
                  {/* 3x3 GAMEDAY PROMO BANNER */}
                  <Link to="/3x3-gameday" className="group flex-1 max-w-xl">
                      <div className="h-full bg-brand-orange text-brand-dark py-6 px-8 rounded-3xl border-4 border-brand-dark shadow-sticker group-hover:shadow-sticker-hover transition-all transform group-hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-4">
                          <div className="w-16 h-16 bg-white rounded-2xl border-4 border-brand-dark flex items-center justify-center transform -rotate-3 group-hover:rotate-3 transition-transform">
                              <Trophy size={32} className="text-brand-dark" />
                          </div>
                          <div>
                              <h3 className="font-display text-2xl uppercase mb-1">3X3 GAMEDAYS</h3>
                              <p className="font-bold text-brand-dark/80 uppercase tracking-wide text-sm">COMPETE & HAVE FUN</p>
                          </div>
                          <div className="flex items-center gap-2 bg-brand-dark text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide group-hover:bg-slate-800 transition-colors">
                              Register Now <ArrowRight size={16} />
                          </div>
                      </div>
                  </Link>

                  {/* STORE PROMO BANNER */}
                  <a href="https://clubs.coreteamwear.co.uk/hoop-heroes" target="_blank" rel="noopener noreferrer" className="group flex-1 max-w-xl">
                      <div className="h-full bg-blue-500 text-white py-6 px-8 rounded-3xl border-4 border-brand-dark shadow-sticker group-hover:shadow-sticker-hover transition-all transform group-hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-4">
                          <div className="w-16 h-16 bg-white rounded-2xl border-4 border-brand-dark flex items-center justify-center transform rotate-3 group-hover:-rotate-3 transition-transform">
                              <ShoppingCart size={32} className="text-brand-dark" />
                          </div>
                          <div>
                              <h3 className="font-display text-2xl uppercase mb-1">Official Online Store</h3>
                              <p className="font-bold text-white/80 uppercase tracking-wide text-sm">Get your Heroes gear today</p>
                          </div>
                          <div className="flex items-center gap-2 bg-brand-dark text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide group-hover:bg-slate-800 transition-colors">
                              Shop Now <ArrowRight size={16} />
                          </div>
                      </div>
                  </a>
              </div>
          </div>
      </section>

      {/* BRAND NARRATIVE / VALUES */}
      <section className="pt-12 pb-20 bg-brand-dark text-white relative overflow-hidden">
        {/* Shorter wavy divider top */}
        <div className="absolute top-0 left-0 w-full h-10 bg-white clip-wave-bottom"></div>

        <div className="container mx-auto px-4 relative z-10 mt-6">
            <div className="text-center max-w-4xl mx-auto mb-16">
                <h2 className="font-display text-5xl md:text-7xl mb-6 uppercase leading-tight">
                    Swap Screentime <br/> <span className="text-brand-orange">For Gametime</span>
                </h2>
                <p className="text-xl md:text-2xl font-medium text-slate-300 italic">
                    Less scrolling, more shooting. We turn screen-locked habits into game-winning confidence and active social development.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { 
                        icon: Award, 
                        title: 'Core Values', 
                        desc: 'We instill essential values like Respect, Teamwork, and Leadership through fun sessions. By championing perseverance and a healthy lifestyle, we shape character and develop heroes on and off the court.', 
                        color: 'bg-brand-orange' 
                    },
                    { 
                        icon: Heart, 
                        title: 'Community', 
                        desc: 'More than just a sports club—we are a tight-knit team where every player belongs. Our community supports every child to build confidence and lifelong friendships.', 
                        color: 'bg-white' 
                    },
                    { 
                        icon: Trophy, 
                        title: 'Skill Development', 
                        desc: 'Expert coaching focused on fundamental skill development. We’re introducing the UK to the world’s fastest-growing game through fun, high-energy training.', 
                        color: 'bg-brand-orange' 
                    }
                ].map((feature, idx) => (
                    <div key={idx} className={`relative p-10 rounded-[2.5rem] border-4 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all duration-300 group bg-white`}>
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border-4 border-brand-dark transform -rotate-3 group-hover:rotate-3 transition-transform ${feature.color}`}>
                            <feature.icon 
                                size={40} 
                                strokeWidth={2} 
                                className="text-brand-dark" 
                                fill={feature.title === 'Community' ? '#fba91a' : 'none'}
                            />
                        </div>
                        <h3 className="font-display text-3xl text-brand-dark mb-4 uppercase">{feature.title}</h3>
                        <p className="text-slate-700 text-lg leading-relaxed font-medium">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Wavy divider bottom */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-brand-orange clip-wave-top"></div>
      </section>

      {/* CTA BANNER */}
      <section className="py-16 bg-brand-orange relative overflow-hidden flex items-center justify-center">
          <div className="container mx-auto px-4 relative z-10 text-center">
              <div className="inline-block bg-white border-4 border-brand-dark px-8 py-4 rounded-full mb-8 shadow-sticker transform -rotate-2">
                  <span className="font-display text-2xl md:text-3xl text-brand-dark uppercase">#10K🏀UK</span>
              </div>
              
              <h2 className="font-display text-6xl md:text-8xl text-brand-dark mb-6 uppercase leading-none">
                  Join Our <br/>Mission
              </h2>

              <p className="text-xl md:text-2xl font-bold text-brand-dark max-w-3xl mx-auto mb-10 leading-tight">
                We're on a mission to positively impact 10,000 children across the UK every week through basketball by 2030. Every hero on the court helps us reach that goal.
              </p>
              
              <a href={FREE_TRIAL_URL} target="_blank" rel="noopener noreferrer" className="inline-block bg-brand-dark text-white px-12 py-6 rounded-full font-display text-2xl uppercase tracking-wide shadow-sticker hover:shadow-sticker-hover hover:scale-105 transition-all border-4 border-transparent hover:border-white">
                  TRY YOUR FIRST CLASS FREE
              </a>
          </div>
      </section>
    </div>
  );
};
