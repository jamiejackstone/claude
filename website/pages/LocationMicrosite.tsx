import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { LOCATIONS } from '../constants';
import { getClickIdsForLead, withTrackedParams } from '../lib/clickTracking';
import { trackWaitlistLead } from '../lib/metaPixel';
import { trackBookTrialClick } from '../lib/trackBookTrial';
import { getBookingWidgetUrl } from '../lib/venueNotice';
import { requestLondonNow, useRequestLondonDate } from '../lib/requestDate';
import { useTrackedHref } from '../lib/trackedHref';
import { ClassSessionList } from '../components/ClassSessionList';
import { DateWindowOutlet, LocationTicker } from '../components/DateWindows';
import { DeferredEmbed } from '../components/DeferredEmbed';
import { upsertJsonLd } from '../lib/jsonLdDom';
import {
  LOCATION_SCHEMA_ID,
  ORG_SCHEMA_ID,
  PUBLIC_EMAIL,
  PUBLIC_PHONE_DISPLAY,
  PUBLIC_PHONE_TEL,
  SANDHURST_META_DESCRIPTION,
  SANDHURST_PAGE_TITLE,
  buildLocationJsonLd,
  locationDocumentTitle,
  locationTownName,
} from '../lib/locationSchema';
import { LocationData } from '../types';
import { MapPin, CheckCircle, Star, ArrowRight, Mail, Clock, ExternalLink, Info, Bell, Loader2, Volume2, VolumeX, MessageCircle, Calendar, Smartphone, ShoppingCart } from 'lucide-react';

export { TemporaryVenueCard } from '../components/DateWindows';

interface LocationMicrositeProps {
  forcedId?: string;
}

function nextClassDate(loc: LocationData, today: Date): string | null {
  if (loc.startDate) return loc.startDate;
  if (!loc.classes || loc.classes.length === 0) return null;

  const dayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const currentDay = today.getDay();
  const classDays = Array.from(new Set(loc.classes.map(c => c.day)));

  let minDiff = 8;
  let targetDate: Date | null = null;

  classDays.forEach(dayStr => {
    const targetDay = dayMap[dayStr];
    if (targetDay === undefined) return;

    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;

    if (diff < minDiff) {
      minDiff = diff;
      const d = new Date(today);
      d.setDate(today.getDate() + diff);
      targetDate = d;
    }
  });

  if (!targetDate) return null;

  const d: Date = targetDate;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function BookingCalendar({ location }: { location: LocationData }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const bookingWidgetUrl = getBookingWidgetUrl(location, requestLondonNow());
    if (!bookingWidgetUrl) {
      setSrc(null);
      return;
    }
    const separator = bookingWidgetUrl.includes('?') ? '&' : '?';
    let finalUrl = `${bookingWidgetUrl}${separator}view=agenda&mode=upcoming`;
    const autoDate = nextClassDate(location, new Date());
    if (autoDate) finalUrl += `&start_date=${autoDate}`;
    setSrc(withTrackedParams(finalUrl));
  }, [location]);

  return (
    <div className="w-full bg-white flex-grow">
      {src ? (
        <iframe src={src} title="Hoop Heroes Booking Calendar" className="w-full h-[950px]" style={{ border: 0 }} loading="lazy" />
      ) : (
        <div className="w-full h-[950px]" data-hh-embed="Hoop Heroes Booking Calendar" />
      )}
    </div>
  );
}

function upsertMeta(property: string, content: string | null) {
  const selector = `meta[property="${property}"]`;
  const existing = document.querySelector(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('meta');
  el.setAttribute('property', property);
  el.setAttribute('content', content);
  if (!existing) document.head.appendChild(el);
}

export const LocationMicrosite: React.FC<LocationMicrositeProps> = ({ forcedId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = forcedId || paramId;
  const location = LOCATIONS.find(l => l.id === id || l.slug === id) ?? null;
  const londonDay = useRequestLondonDate();
  const memberHref = useTrackedHref('https://goteamup.com/p/6822945-hoop-heroes/');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Waitlist form state
  const [waitlistData, setWaitlistData] = useState({
    name: '',
    email: '',
    phone: '',
    source_location: ''
  });

  const HERO_VIDEO_URL = "https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/697370fc10cc2782a54f64d8.mp4";

  useEffect(() => {
    const localFound = location;
    if (localFound) {
      setWaitlistData(prev => ({ ...prev, source_location: localFound.name }));

      // SEO: keep the worker title. Do not rewrite it to "[Town] Basketball Classes".
      const isSandhurst = localFound.slug === 'sandhurst';
      document.title = locationDocumentTitle(localFound);
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          isSandhurst
            ? SANDHURST_META_DESCRIPTION
            : `Join the best youth basketball classes in ${localFound.name}. Book your free taster session today at Hoop Heroes ${localFound.name}.`,
        );
      }
      upsertMeta('og:title', isSandhurst ? SANDHURST_PAGE_TITLE : null);
      upsertMeta('og:description', isSandhurst ? SANDHURST_META_DESCRIPTION : null);
      upsertJsonLd(LOCATION_SCHEMA_ID, buildLocationJsonLd(localFound));
      upsertJsonLd(ORG_SCHEMA_ID, null);
    }

    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    // Load Review Widget Script with delay
    const timer = setTimeout(() => {
      const scriptUrl = 'https://reputationhub.site/reputation/assets/review-widget.js';
      const scriptId = 'reputation-widget-script';
      
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = scriptUrl;
        script.async = true;
        document.body.appendChild(script);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleBookClick = (buttonPosition: string) => {
    if (location?.comingSoon) {
      document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const linkUrl = withTrackedParams('https://goteamup.com/p/6822945-hoop-heroes/memberships/166242/');
    trackBookTrialClick({
      location_slug: location?.slug || 'none',
      button_position: buttonPosition,
      link_url: linkUrl,
    });
    window.open(linkUrl, '_blank');
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;

    setIsSubmitting(true);

    try {
        const leadPayload = {
            name: waitlistData.name,
            email: waitlistData.email,
            phone: waitlistData.phone,
            locationName: location.name,
            tags: [
                location.name, 
                location.ghlTag || `${location.name} Waitlist`,
                `Source: Website Waitlist`
            ],
            source: `Website Waitlist - ${location.name}`,
            ...getClickIdsForLead(),
        };

        const response = await fetch('/api/waitlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadPayload)
        });

        if (response.ok) {
            console.log('Lead submitted to server successfully');
            setIsWaitlistSubmitted(true);
            trackWaitlistLead();
        } else {
            const errorData = await response.json();
            console.error('Server submission error:', errorData);
            alert(`Submission failed: ${errorData.error || 'Unknown error'}. Please try again or contact support.`);
        }
    } catch (error) {
        console.error('Error submitting waitlist:', error);
        alert('An error occurred while submitting. Please check your connection and try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!location) {
    return <div className="flex items-center justify-center h-screen bg-brand-dark text-white font-display text-2xl uppercase">Loading Location...</div>;
  }

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(location.mapQueryOverride || `Hoop Heroes ${location.name}`)}&t=&z=18&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="bg-white min-h-screen font-sans text-brand-dark selection:bg-brand-orange selection:text-brand-dark pb-20 md:pb-0">
      
      {/* Sticky Mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t-2 border-slate-100 z-40 flex flex-col items-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => handleBookClick('sticky')}
          className={`w-full py-4 rounded-xl font-display uppercase text-xl tracking-wide shadow-lg ${location.comingSoon ? 'bg-blue-600 text-white' : 'bg-brand-dark text-white'}`}
        >
          {location.comingSoon ? "Join Waitlist" : "Book Free Taster"}
        </button>
      </div>

      {/* HERO */}
      <div className="relative min-h-[70vh] md:min-h-[600px] flex items-center pb-12 md:pb-0 overflow-hidden bg-brand-dark">
        <div className="absolute inset-0">
          <img 
            src={`${location.heroImage}?w=1600&q=75&auto=format`} 
            className={`w-full h-full object-cover opacity-30 ${location.comingSoon ? 'grayscale-[30%]' : ''}`} 
            alt={`Basketball at Hoop Heroes ${location.name}`} 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-brand-dark/60 mix-blend-multiply"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-16 bg-white clip-wave-top z-10"></div>
        <div className="relative container mx-auto px-4 z-10 pt-24 md:pt-10 pb-20 md:pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-4xl flex flex-col">
              <h1 className="font-display text-5xl md:text-8xl text-white uppercase leading-none drop-shadow-xl mb-6 order-1">
                Kids Basketball Classes in <br/>
                <span className={location.comingSoon ? "text-blue-400" : "text-brand-orange"}>{locationTownName(location)}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-6 order-2">
                <div className={`inline-block px-4 py-1 rounded-lg shadow-sticker transform -rotate-2 border-2 border-brand-dark ${location.comingSoon ? 'bg-blue-600 text-white' : 'bg-brand-orange text-brand-dark'}`}>
                    <div className="flex items-center gap-2 font-display uppercase text-sm md:text-base tracking-wide">
                    <MapPin size={16} /> {location.id === 'loc_holmer' ? location.name : (location.comingSoon && location.address.toLowerCase().startsWith('coming soon') ? "COMING SOON" : location.address.split(',')[0])}
                    </div>
                </div>
                {location.displayDays && (
                  <div className="inline-block px-4 py-1 rounded-lg shadow-sticker transform rotate-2 bg-white text-brand-dark border-2 border-brand-dark animate-fade-in">
                    <div className="flex items-center gap-2 font-display uppercase text-sm md:text-base tracking-wide">
                      <Calendar size={16} className="text-brand-dark" /> {location.displayDays}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 mt-4 items-start md:items-center order-3">
                <button 
                  onClick={() => handleBookClick('hero')}
                  className={`px-8 py-4 rounded-full font-display uppercase text-xl tracking-wide transition-all shadow-sticker border-2 border-transparent flex items-center justify-center gap-2 shrink-0 ${location.comingSoon ? 'bg-blue-600 hover:bg-blue-500 text-white hover:border-white' : 'bg-white hover:bg-slate-100 text-brand-dark hover:border-brand-dark'}`}
                >
                  {location.comingSoon ? "Join Waitlist" : "Book Free Taster"}
                </button>
                
                {!location.comingSoon && (
                  <div className="bg-white border-2 border-brand-dark px-6 py-3 rounded-2xl shadow-sticker flex items-center gap-4 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="20" height="20" className="w-5 h-5 shrink-0" />
                      <div className="flex -space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={20} fill="#fba91a" className="text-brand-orange" />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col leading-tight border-l-2 border-slate-100 pl-4">
                      <span className="text-lg font-display text-brand-dark uppercase">5.0 RATING</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">80+ REVIEWS</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hero Video */}
            <div className="relative flex items-center justify-center mt-8 lg:mt-0">
              <div className="w-full lg:w-[85%] relative">
                <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl transition-all duration-500 bg-black aspect-video group transform rotate-2 hover:rotate-0">
                    <video 
                        ref={videoRef}
                        suppressHydrationWarning
                        className="w-full h-full absolute inset-0 object-cover"
                        src={HERO_VIDEO_URL}
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster={`${location.heroImage}?w=800&q=50&auto=format`}
                    />
                    <button 
                        onClick={toggleMute}
                        className="absolute bottom-4 right-4 z-20 bg-brand-dark/50 hover:bg-brand-dark/80 text-white p-3 rounded-full backdrop-blur-sm transition-all border border-white/20"
                        title={isMuted ? "Unmute Video" : "Mute Video"}
                    >
                        {isMuted ? <VolumeX size={24} strokeWidth={2.5} /> : <Volume2 size={24} strokeWidth={2.5} />}
                    </button>
                </div>
                <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse -z-10 ${location.comingSoon ? 'bg-blue-500' : 'bg-brand-orange'}`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-20">
        
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {location.newsTicker && <LocationTicker text={location.newsTicker} />}
          <DateWindowOutlet slot="banner-notices" location={location} londonDay={londonDay} />
          <DateWindowOutlet slot="temporary-venues" location={location} londonDay={londonDay} />

          {location.comingSoon ? (
            <div id="waitlist" className="bg-white rounded-[2.5rem] shadow-sticker border-4 border-brand-dark overflow-hidden scroll-mt-32">
              <div className="p-8 border-b-4 border-brand-dark bg-blue-600 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <h2 className="font-display text-4xl md:text-5xl uppercase">Coming Soon</h2>
                  <Bell className="w-10 h-10 text-white animate-bounce" />
                </div>
                <p className="font-medium opacity-90 text-lg">We are bringing Hoop Heroes to {location.name}! Be the first to know when classes launch.</p>
              </div>
              <div className="p-8 md:p-12 bg-white">
                {isWaitlistSubmitted ? (
                  <div className="text-center py-12 animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} /></div>
                    <h3 className="font-display text-3xl text-brand-dark uppercase mb-2">You're on the list!</h3>
                    <p className="text-slate-600 text-lg">We'll notify you as soon as booking opens.</p>
                  </div>
                ) : (
                  <form className="space-y-6 max-w-xl mx-auto" onSubmit={handleWaitlistSubmit}>
                    {/* Hidden field for location tagging */}
                    <input type="hidden" name="source_location" value={waitlistData.source_location} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-brand-dark uppercase tracking-wider mb-2">Parent Name</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-brand-dark" placeholder="Your Name" value={waitlistData.name} onChange={(e) => setWaitlistData({...waitlistData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-brand-dark uppercase tracking-wider mb-2">Phone</label>
                        <input required type="tel" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark" placeholder="Mobile Number" value={waitlistData.phone} onChange={(e) => setWaitlistData({...waitlistData, phone: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-brand-dark uppercase tracking-wider mb-2">Email Address</label>
                      <input required type="email" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark" placeholder="name@example.com" value={waitlistData.email} onChange={(e) => setWaitlistData({...waitlistData, email: e.target.value})} />
                    </div>
                    <button disabled={isSubmitting} className={`w-full text-white font-display text-xl uppercase tracking-wide py-4 rounded-xl border-2 border-brand-dark shadow-sticker flex items-center justify-center gap-2 ${location.comingSoon ? 'bg-blue-600' : 'bg-brand-dark'}`}>
                        {isSubmitting ? <><Loader2 className="animate-spin" size={24} /> Processing</> : "Notify Me When Booking Opens"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div id="schedule" className="bg-white rounded-[2.5rem] shadow-sticker border-4 border-brand-dark overflow-hidden scroll-mt-32 flex flex-col min-h-[1050px]">
              <div className="p-8 border-b-4 border-brand-dark bg-brand-light">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h2 className="font-display text-4xl md:text-5xl text-brand-dark uppercase">Class Schedule</h2>
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase text-brand-dark bg-green-400/20 px-4 py-2 rounded-full border-2 border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Availability
                  </div>
                </div>
                <DateWindowOutlet slot="schedule-notices" location={location} londonDay={londonDay} />
                <div className="space-y-1">
                  <p className="text-slate-600 font-medium">Browse next available sessions below and book your free trial.</p>
                  {location.scheduleNotice ? (
                    <p className="text-sm font-bold text-brand-orange leading-snug">
                      {location.scheduleNotice}
                    </p>
                  ) : (
                    <p className="text-xs font-black uppercase text-brand-orange tracking-widest">
                      Term times only, see upcoming schedule for availability.
                    </p>
                  )}
                </div>
                {location.classes.some((session) => session.comingSoon) && (
                  <ClassSessionList sessions={location.classes} />
                )}
              </div>
              {location.bookingWidgetUrl && <BookingCalendar location={location} />}
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
            {/* Coach bio section */}
            <div className="bg-white rounded-[2.5rem] p-8 border-4 border-brand-dark shadow-sticker relative overflow-hidden flex flex-col">
                <div className="flex items-center gap-4 mb-5 relative z-10">
                    <img src={location.headCoach.imageUrl} alt={`Coach ${location.headCoach.name}`} width="80" height="80" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-brand-orange shrink-0" loading="lazy" />
                    <div>
                    <h3 className="font-display text-xl md:text-2xl text-brand-dark uppercase leading-none mb-1">{location.headCoach.name}</h3>
                    <p className="text-brand-orange text-[10px] font-black uppercase tracking-wider">{location.headCoach.role}</p>
                    </div>
                </div>
                <div className="relative z-10 mb-4 flex-grow">
                    <h4 className="font-display text-xs text-slate-400 uppercase mb-2">Why I Coach</h4>
                    <p className="text-brand-dark font-bold text-base leading-snug italic">
                      "{location.headCoach.quote || "I teach confidence. My goal is to ensure every child leaves the court feeling taller than when they walked in."}"
                    </p>
                </div>
            </div>

            {/* Get In Touch Section */}
            <div className={`rounded-[2.5rem] p-8 md:p-10 shadow-sticker border-4 border-brand-dark ${location.comingSoon ? 'bg-blue-600 text-white' : 'bg-brand-orange text-brand-dark'}`}>
              <h3 className="font-display text-4xl uppercase mb-8 border-b-2 border-brand-dark/20 pb-4">Get in Touch</h3>
              <ul className="space-y-8">
                <li className="flex items-start gap-4">
                  <div className="bg-brand-dark p-3 rounded-xl text-white shrink-0"><MapPin size={22} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase block mb-1 opacity-60 tracking-widest">Address</span>
                    {location.id === 'loc_holmer' ? (
                      <div className="space-y-2">
                        <span className="font-bold leading-tight block text-base">{location.address}</span>
                        <div className="text-xs bg-brand-orange/10 border-2 border-brand-dark p-3 rounded-xl mt-2 text-brand-dark">
                          <p className="font-bold mb-1">Backup Venue during Exams:</p>
                          <p className="font-medium">Sir William Ramsay School, Rose Avenue, Hazlemere, HP15 7UB</p>
                          <p className="font-medium mt-1 italic text-[10px]">Please check the booking calendar below for up-to-date location details.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold leading-tight block text-base">{location.address}</span>
                        {location.googleMapsUrl && (
                          <a 
                            href={location.googleMapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs font-black underline hover:text-brand-dark/80 mt-1 uppercase"
                          >
                            View on Google Maps <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-brand-dark p-3 rounded-xl text-white shrink-0"><Mail size={22} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase block mb-1 opacity-60 tracking-widest">Email Us</span>
                    <a href={`mailto:${PUBLIC_EMAIL}?subject=Hoop Heroes ${location.name} inquiry`} className="font-black hover:underline break-all block text-base">{PUBLIC_EMAIL}</a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-brand-dark p-3 rounded-xl text-white shrink-0"><Smartphone size={22} /></div>
                  <div>
                    <span className="text-[10px] font-black uppercase block mb-1 opacity-60 tracking-widest">SMS / WhatsApp</span>
                    <a href={PUBLIC_PHONE_TEL} className="font-black hover:underline block tracking-wide text-base">{PUBLIC_PHONE_DISPLAY}</a>
                  </div>
                </li>
              </ul>
              
              <div className="mt-10 rounded-2xl overflow-hidden border-2 border-brand-dark bg-white shadow-inner flex flex-col">
                  <div className="h-48">
                    <DeferredEmbed
                      width="100%"
                      height="100%"
                      className="w-full h-full"
                      style={{ border: 0 }}
                      title="Location Map"
                      src={mapSrc}
                      loading="lazy"
                    />
                  </div>
                  {location.googleMapsUrl && (
                    <a 
                      href={location.googleMapsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block text-center bg-brand-dark text-white text-xs font-black py-3 uppercase tracking-wider hover:bg-slate-800 transition-colors border-t-2 border-brand-dark"
                    >
                      Get Directions in Google Maps
                    </a>
                  )}
              </div>
              
              {location.locationNotes && (
                <div className="mt-6 bg-white p-5 rounded-2xl border-2 border-brand-dark shadow-sm flex items-start gap-3">
                  <Info size={22} className="text-brand-dark shrink-0" />
                  <div>
                    <span className="block text-[10px] font-black text-brand-dark/60 uppercase mb-1 tracking-widest">Arrival Instructions</span>
                    <p className="text-sm font-bold text-brand-dark leading-snug whitespace-pre-line">{location.locationNotes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Member Login Block */}
            {!location.comingSoon && (
              <div className="bg-brand-dark rounded-[2.5rem] p-8 md:p-10 border-4 border-brand-dark shadow-sticker text-white text-center">
                <h3 className="font-display text-2xl uppercase mb-5">Existing Member?</h3>
                <a href={memberHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-brand-dark px-8 py-3 rounded-full font-display uppercase hover:bg-brand-orange transition-colors w-full justify-center mb-8 shadow-md">
                    Member Login <ExternalLink size={16} />
                </a>

                <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center justify-center gap-2">
                        <Smartphone size={14} /> Download Booking App
                    </p>
                    <div className="flex flex-col gap-3">
                        <a 
                            href="https://apps.apple.com/gb/app/teamup-members-v2/id6740145491" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl text-xs font-bold transition-all group"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="w-5 h-5 text-brand-orange">
                                <path d="M15.072 2.617c.563-.687.944-1.64.84-2.585-.867.035-1.916.577-2.538 1.304-.559.65-.992 1.636-.889 2.593.966.075 1.954-.486 2.587-1.312zm-3.238 10.97c0-2.36 1.928-3.486 2.016-3.535-.111-.475-.869-2.705-2.223-2.73-1.077-.02-1.9.645-2.503.645-.603 0-1.579-.628-2.603-.61-2.592.043-4.417 2.14-4.417 5.176 0 2.062.776 4.39 2.067 6.248.877 1.265 1.892 2.664 3.25 2.613 1.292-.05 1.779-.835 3.336-.835 1.558 0 2.008.835 3.376.81 1.408-.025 2.298-1.282 3.16-2.537.994-1.45 1.402-2.854 1.425-2.93-.032-.015-2.753-1.054-2.753-4.17z"/>
                            </svg> Download on App Store
                        </a>
                        <a 
                            href="https://play.google.com/store/apps/details?id=teamup.customer.v2&pcampaignid=web_share" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl text-xs font-bold transition-all group"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="w-5 h-5 text-brand-orange">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.913.913 0 0 1-.913-.913V2.727a.913.913 0 0 1 .912-.913zM14.97 13.18l3.18-3.182-3.18-3.182-1.18 1.18 1.18 2v1.182zM19.336 8.818L21.31 9.8c.706.353.706 1.45 0 1.804l-1.974.982-2.39-2.39 2.39-2.39zM12.613 13.182l-1.18 1.18L3.61 22.186l9.003-9.004z"/>
                            </svg> Get it on Google Play
                        </a>
                    </div>
                </div>
              </div>
            )}

            {/* Online Store Block */}
            <div className="bg-blue-500 rounded-[2.5rem] p-8 md:p-10 border-4 border-brand-dark shadow-sticker text-white text-center mt-8">
              <h3 className="font-display text-2xl uppercase mb-3 flex items-center justify-center gap-2">
                  <ShoppingCart size={24} /> Official Store
              </h3>
              <p className="text-sm font-bold mb-6">Get your Hoop Heroes gear, kits, and accessories!</p>
              <a href="https://clubs.coreteamwear.co.uk/hoop-heroes" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-brand-dark px-8 py-3 rounded-full font-display uppercase hover:bg-slate-100 transition-colors w-full justify-center shadow-md">
                  Shop Teamwear <ExternalLink size={16} />
              </a>
            </div>
        </div>
      </div>
    </div>
  );
};