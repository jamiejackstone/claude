import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link as RouterLink } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { Home } from './pages/Home';
import { LocationMicrosite } from './pages/LocationMicrosite';
import { Careers } from './pages/Careers';
import { Policies } from './pages/Policies';
import { Mission } from './pages/Mission';
import { AccidentReport } from './pages/AccidentReport';
import { Gameday } from './pages/Gameday';
import { GoRedirect } from './pages/GoRedirect';

// Meta Pixel Route Tracker
const MetaPixelTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if user has accepted cookies before firing
    const consent = localStorage.getItem('hoop_heroes_cookie_consent');
    if (consent === 'accepted' && typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [location]);

  return null;
};

// Canonical Link Route Tracker for SEO (dynamically updates/injects <link rel="canonical"> in head)
const CanonicalLinkTracker = () => {
  const location = useLocation();

  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }

    const baseUrl = 'https://www.hoopheroes.co.uk';
    let cleanPath = location.pathname;
    
    // Normalize path trailing slashes
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    
    const canonicalUrl = `${baseUrl}${cleanPath}`;
    link.setAttribute('href', canonicalUrl);
  }, [location]);

  return null;
};

// Hash Redirection Helper for SEO (resolves old hash-based URLs to clean path-based URLs in real-time)
const HashToPathRedirect: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const hashPath = hash.substring(1); // e.g. "/location/loc_marlow" or "/mission"
      if (hashPath) {
        const hashToPathMap: Record<string, string> = {
          '/location/loc_marlow': '/location/marlow',
          '/location/loc_bicester': '/location/bicester',
          '/location/loc_aylesbury': '/location/aylesbury',
          '/location/loc_missenden': '/location/great-missenden',
          '/location/loc_princes': '/location/wendover',
          '/location/loc_tring': '/location/tring',
          '/location/loc_holmer': '/location/holmer-green',
          '/location/loc_oxford': '/location/oxford',
          '/location/loc_wendover': '/location/wendover',
          '/location/loc_sandhurst': '/location/sandhurst',
          
          '/marlow': '/location/marlow',
          '/bicester': '/location/bicester',
          '/aylesbury': '/location/aylesbury',
          '/great-missenden': '/location/great-missenden',
          '/princes-risborough': '/location/wendover',
          '/wendover': '/location/wendover',
          '/tring': '/location/tring',
          '/holmer-green': '/location/holmer-green',
          '/oxford': '/location/oxford',
          '/sandhurst': '/location/sandhurst',

          '/mission': '/mission',
          '/franchise': '/',
          '/careers': '/careers',
          '/3x3-gameday': '/3x3-gameday',
          '/policies': '/policies',
          '/accident': '/accident'
        };

        const cleanHashPath = hashPath.replace(/\/$/, '');
        const targetPath = hashToPathMap[cleanHashPath] || hashToPathMap[hashPath];

        if (targetPath) {
          console.log(`[SEO Redirect] Programmatically redirecting from old hash URL: ${hash} to new clean path: ${targetPath}`);
          window.location.replace(targetPath);
        } else if (hashPath.startsWith('/location/')) {
          const possibleId = hashPath.split('/location/')[1]?.replace(/\/$/, '');
          const locations = [
            { id: 'loc_bicester', slug: 'bicester' },
            { id: 'loc_marlow', slug: 'marlow' },
            { id: 'loc_holmer', slug: 'holmer-green' },
            { id: 'loc_princes', slug: 'wendover' },
            { id: 'loc_wendover', slug: 'wendover' },
            { id: 'loc_tring', slug: 'tring' },
            { id: 'loc_aylesbury', slug: 'aylesbury' },
            { id: 'loc_missenden', slug: 'great-missenden' },
            { id: 'loc_oxford', slug: 'oxford' },
            { id: 'loc_sandhurst', slug: 'sandhurst' }
          ];
          const matchedLoc = locations.find(l => l.id === possibleId || l.slug === possibleId);
          if (matchedLoc) {
            window.location.replace(`/location/${matchedLoc.slug}`);
          }
        }
      }
    }
  }, [location]);

  return null;
};

// ScrollToTop helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// 404 page — served with a real 404 status by the Worker for unknown URLs
const NotFound: React.FC = () => {
  useEffect(() => {
    document.title = 'Page Not Found | Hoop Heroes';
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-brand-light px-4 py-24">
      <div className="text-center max-w-xl">
        <div className="inline-block transform -rotate-2 mb-6">
          <div className="bg-brand-orange text-brand-dark px-6 py-2 font-display text-xl uppercase tracking-wide shadow-sticker border-2 border-brand-dark rounded-lg">
            Air Ball!
          </div>
        </div>
        <h1 className="font-display text-6xl md:text-7xl uppercase text-brand-dark mb-4">Page Not Found</h1>
        <p className="text-slate-600 font-medium mb-8">
          This page doesn't exist any more — but the game is still on. Head back to the homepage to find your nearest class.
        </p>
        <RouterLink
          to="/"
          className="inline-block bg-brand-dark text-white font-display uppercase tracking-wide px-8 py-4 rounded-xl border-2 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all"
        >
          Back to the Homepage
        </RouterLink>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <ScrollToTop />
        <HashToPathRedirect />
        <MetaPixelTracker />
        <CanonicalLinkTracker />
        <Navbar />
        <main className="flex-grow">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/location/:id" element={<LocationMicrosite />} />
                
                {/* Clean URL redirects for legacy or direct standalone roots (important for old bookmarks/SEO coverage) */}
                <Route path="/aylesbury" element={<Navigate to="/location/aylesbury" replace />} />
                <Route path="/bicester" element={<Navigate to="/location/bicester" replace />} />
                <Route path="/marlow" element={<Navigate to="/location/marlow" replace />} />
                <Route path="/holmer-green" element={<Navigate to="/location/holmer-green" replace />} />
                <Route path="/princes-risborough" element={<Navigate to="/location/wendover" replace />} />
                <Route path="/wendover" element={<Navigate to="/location/wendover" replace />} />
                <Route path="/tring" element={<Navigate to="/location/tring" replace />} />
                <Route path="/great-missenden" element={<Navigate to="/location/great-missenden" replace />} />
                <Route path="/oxford" element={<Navigate to="/location/oxford" replace />} />
                <Route path="/sandhurst" element={<Navigate to="/location/sandhurst" replace />} />
                <Route path="/bracknell" element={<Navigate to="/" replace />} />
                <Route path="/crowthorne" element={<Navigate to="/" replace />} />

                <Route path="/mission" element={<Mission />} />
                <Route path="/franchise" element={<Navigate to="/" replace />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/accident" element={<AccidentReport />} />
                <Route path="/3x3-gameday" element={<Gameday />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />

                {/* QR Code Short Redirects */}
                <Route path="/go" element={<GoRedirect />} />
                <Route path="/go/:slug" element={<GoRedirect />} />

                {/* 404 — the Worker serves unknown paths with a 404 status; this renders the page */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </main>
        <Footer />
        <CookieConsent />
      </div>
    </Router>
  );
};

export default App;