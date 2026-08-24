
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MapPin, ChevronRight, ChevronDown, User, Search } from 'lucide-react';
import { LOCATIONS } from '../constants';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileLocsOpen, setIsMobileLocsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isMicrosite = location.pathname.startsWith('/location/');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trial URL from user
  const FREE_TRIAL_URL = "https://goteamup.com/p/6822945-hoop-heroes/memberships/166242/";

  // Determine current location data to check for 'comingSoon' status
  const locationId = isMicrosite ? location.pathname.split('/location/')[1]?.replace(/\/$/, '') : null;
  const currentLocation = locationId ? LOCATIONS.find(l => l.id === locationId || l.slug === locationId) : null;
  const isComingSoon = currentLocation?.comingSoon;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navClasses = `fixed top-0 z-50 w-full transition-all duration-300 ${
    scrolled 
      ? 'bg-brand-dark shadow-lg py-3' 
      : 'bg-transparent py-5 md:py-8'
  }`;

  // Updated to the specific Hoop Heroes TeamUp portal
  const MEMBER_PORTAL_URL = "https://goteamup.com/p/6822945-hoop-heroes/";

  const handleWaitlistScroll = (e: React.MouseEvent) => {
    // If on a microsite and clicking waitlist, try to scroll
    if (isMicrosite && isComingSoon) {
        e.preventDefault();
        const element = document.getElementById('waitlist');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
  };

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          {/* Logo Area */}
          <div className="flex-shrink-0 flex items-center cursor-pointer z-50">
            <Link to="/" className="flex items-center gap-3 group">
                <Logo variant="light" className="group-hover:scale-105 transition-transform" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {!isMicrosite ? (
                <div className="flex items-center bg-brand-dark/40 backdrop-blur-sm rounded-full p-1.5 px-2 mr-4 border border-white/10">
                    <Link to="/" className="px-5 py-2 rounded-full text-sm font-bold text-white hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wider font-sans">Home</Link>
                    <Link to="/mission" className="px-5 py-2 rounded-full text-sm font-bold text-white hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wider font-sans">Mission</Link>
                    
                    {/* LOCATIONS DROPDOWN */}
                    <div ref={dropdownRef} className="relative">
                      <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="px-5 py-2 rounded-full text-sm font-bold text-white hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wider font-sans flex items-center gap-1.5 focus:outline-none"
                      >
                        LOCATIONS <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isDropdownOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 rounded-2xl bg-brand-dark border-2 border-brand-dark shadow-xl py-2 z-50 overflow-hidden animate-fade-in">
                          {LOCATIONS.map((loc) => (
                            <Link
                              key={loc.id}
                              to={`/location/${loc.slug}`}
                              onClick={() => setIsDropdownOpen(false)}
                              className="block px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wide flex justify-between items-center group/item"
                            >
                              <span>{loc.name}</span>
                              {loc.comingSoon ? (
                                <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded uppercase font-sans">Soon</span>
                              ) : (
                                <ChevronRight size={14} className="opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link to="/careers" className="px-5 py-2 rounded-full text-sm font-bold text-white hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wider font-sans">COACHING</Link>
                    <a href="https://clubs.coreteamwear.co.uk/hoop-heroes" target="_blank" rel="noopener noreferrer" className="px-5 py-2 rounded-full text-sm font-bold text-white hover:bg-brand-orange hover:text-brand-dark transition-all uppercase tracking-wider font-sans">Store</a>
                </div>
            ) : (
                <Link to="/" className="flex items-center gap-2 mr-6 text-sm font-bold text-white hover:text-brand-orange transition-colors uppercase tracking-wider bg-brand-dark/50 px-4 py-2 rounded-full border border-white/10">
                    <MapPin size={14} /> Find another location
                </Link>
            )}

            {/* Member Login */}
            <a href={MEMBER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mr-2 text-sm font-bold text-white hover:text-brand-orange transition-colors uppercase tracking-wider px-4 py-2">
               <User size={16} /> Member Login
            </a>

            {/* Dynamic CTA Button */}
            {isMicrosite ? (
                isComingSoon ? (
                    <Link 
                        to="#waitlist" 
                        onClick={handleWaitlistScroll}
                        className="group relative overflow-hidden bg-brand-orange text-brand-dark px-8 py-3 rounded-full font-display text-lg uppercase tracking-wide shadow-sticker border-2 border-brand-dark hover:shadow-sticker-hover transition-all transform hover:-translate-y-0.5"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Join Waitlist <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform"/>
                        </span>
                    </Link>
                ) : (
                    <a 
                        href={FREE_TRIAL_URL}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden bg-brand-orange text-brand-dark px-8 py-3 rounded-full font-display text-lg uppercase tracking-wide shadow-sticker border-2 border-brand-dark hover:shadow-sticker-hover transition-all transform hover:-translate-y-0.5"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Book Free Trial <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform"/>
                        </span>
                    </a>
                )
            ) : (
                <Link 
                    to="/#find-class"
                    className="group relative overflow-hidden bg-brand-orange text-brand-dark px-8 py-3 rounded-full font-display text-lg uppercase tracking-wide shadow-sticker border-2 border-brand-dark hover:shadow-sticker-hover transition-all transform hover:-translate-y-0.5"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    FIND A CLASS <Search size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform"/>
                  </span>
                </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center z-50">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`p-2 rounded-full ${isOpen ? 'bg-white text-brand-dark' : 'bg-brand-orange text-brand-dark'} shadow-lg border-2 border-brand-dark transition-colors`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - background made fully opaque for better readability */}
      <div className={`fixed inset-0 bg-brand-dark z-40 transition-all duration-300 flex flex-col justify-center items-center ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="flex flex-col items-center space-y-6 text-center p-4 w-full max-h-[85vh] overflow-y-auto">
            <Link to="/" onClick={() => setIsOpen(false)} className="text-4xl font-display text-white hover:text-brand-orange transition-colors uppercase">Home</Link>
            <Link to="/mission" onClick={() => setIsOpen(false)} className="text-4xl font-display text-white hover:text-brand-orange transition-colors uppercase">Mission</Link>
            
            {/* Mobile Locations Collapsible Dropdown */}
            <div className="flex flex-col items-center w-full">
              <button 
                onClick={() => setIsMobileLocsOpen(!isMobileLocsOpen)}
                className="text-4xl font-display text-white hover:text-brand-orange transition-colors uppercase flex items-center justify-center gap-2 focus:outline-none w-full"
              >
                LOCATIONS <ChevronDown size={24} className={`transition-transform duration-200 ${isMobileLocsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMobileLocsOpen && (
                <div className="flex flex-col items-center gap-4 mt-4 py-3 px-4 bg-brand-dark/50 rounded-2xl border border-white/5 w-full max-w-xs max-h-48 overflow-y-auto">
                  {LOCATIONS.map((loc) => (
                    <Link
                      key={loc.id}
                      to={`/location/${loc.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="text-2xl font-display text-slate-300 hover:text-brand-orange transition-colors uppercase flex items-center gap-2"
                    >
                      {loc.name}
                      {loc.comingSoon && (
                        <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded uppercase font-sans">Soon</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/careers" onClick={() => setIsOpen(false)} className="text-4xl font-display text-white hover:text-brand-orange transition-colors uppercase">COACHING</Link>
            <a href="https://clubs.coreteamwear.co.uk/hoop-heroes" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className="text-4xl font-display text-white hover:text-brand-orange transition-colors uppercase">Store</a>
            
            <a href={MEMBER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-2xl font-display text-slate-300 hover:text-white transition-colors uppercase flex items-center gap-2">
                <User size={24} /> Member Login
            </a>
            
            {/* Organic wave separator */}
            <svg width="100" height="20" viewBox="0 0 100 20" className="my-4">
                <path d="M0 10 Q 25 20 50 10 T 100 10" stroke="#fba91a" fill="none" strokeWidth="4"/>
            </svg>
            
            {isMicrosite ? (
              !isComingSoon ? (
                <a 
                    href={FREE_TRIAL_URL}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="bg-brand-orange text-brand-dark px-10 py-4 rounded-full font-display uppercase tracking-wider text-xl shadow-sticker border-2 border-brand-dark"
                >
                    Book Free Trial
                </a>
              ) : (
                <Link 
                    to="#waitlist"
                    onClick={(e) => { setIsOpen(false); handleWaitlistScroll(e); }}
                    className="bg-brand-orange text-brand-dark px-10 py-4 rounded-full font-display uppercase tracking-wider text-xl shadow-sticker border-2 border-brand-dark"
                >
                    Join Waitlist
                </Link>
              )
            ) : (
              <Link 
                  to="/#find-class"
                  onClick={() => setIsOpen(false)}
                  className="bg-brand-orange text-brand-dark px-10 py-4 rounded-full font-display uppercase tracking-wider text-xl shadow-sticker border-2 border-brand-dark flex items-center gap-2"
              >
                  FIND A CLASS <Search size={24} strokeWidth={3} />
              </Link>
            )}
        </div>
      </div>
    </nav>
  );
};
