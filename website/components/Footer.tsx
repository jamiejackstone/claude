
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Smartphone } from 'lucide-react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
             <div className="flex flex-col gap-1 mb-6">
                <Link to="/" className="block w-fit">
                    <Logo variant="light" />
                </Link>
                <p className="text-slate-400 text-sm mt-4">Developing heroes on and off the court since 2016.</p>
            </div>

            {/* Member App Links */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Smartphone size={14} /> Booking App
              </p>
              <div className="flex flex-col gap-2">
                <a 
                  href="https://apps.apple.com/gb/app/teamup-members-v2/id6740145491" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors w-fit"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-orange">
                      <path d="M15.072 2.617c.563-.687.944-1.64.84-2.585-.867.035-1.916.577-2.538 1.304-.559.65-.992 1.636-.889 2.593.966.075 1.954-.486 2.587-1.312zm-3.238 10.97c0-2.36 1.928-3.486 2.016-3.535-.111-.475-.869-2.705-2.223-2.73-1.077-.02-1.9.645-2.503.645-.603 0-1.579-.628-2.603-.61-2.592.043-4.417 2.14-4.417 5.176 0 2.062.776 4.39 2.067 6.248.877 1.265 1.892 2.664 3.25 2.613 1.292-.05 1.779-.835 3.336-.835 1.558 0 2.008.835 3.376.81 1.408-.025 2.298-1.282 3.16-2.537.994-1.45 1.402-2.854 1.425-2.93-.032-.015-2.753-1.054-2.753-4.17z"/>
                  </svg> Download on App Store
                </a>
                <a 
                  href="https://play.google.com/store/apps/details?id=teamup.customer.v2&pcampaignid=web_share" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors w-fit"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-orange">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.913.913 0 0 1-.913-.913V2.727a.913.913 0 0 1 .912-.913zM14.97 13.18l3.18-3.182-3.18-3.182-1.18 1.18 1.18 2v1.182zM19.336 8.818L21.31 9.8c.706.353.706 1.45 0 1.804l-1.974.982-2.39-2.39 2.39-2.39zM12.613 13.182l-1.18 1.18L3.61 22.186l9.003-9.004z"/>
                  </svg> Get it on Google Play
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg uppercase mb-6 text-brand-orange">Company</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/mission" className="hover:text-white transition-colors">Our Mission</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers & Coaching</Link></li>
              <li><Link to="/3x3-gameday" className="hover:text-white transition-colors">3x3 Gameday</Link></li>
              <li><a href="https://clubs.coreteamwear.co.uk/hoop-heroes" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Online Store</a></li>
              <li><a href="https://clubs.coreteamwear.co.uk/hoop-heroes-golden-jersey" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Rewards</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg uppercase mb-6 text-brand-orange">Support</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li><Link to="/policies?section=safeguarding" className="hover:text-white transition-colors">Safeguarding Policy</Link></li>
              <li><Link to="/policies?section=conduct" className="hover:text-white transition-colors">Code of Conduct</Link></li>
              <li><Link to="/policies?section=terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/policies?section=privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg uppercase mb-6 text-brand-orange">Contact</h4>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-center gap-2"><Mail size={16}/> basketball@hoopheroes.co.uk</li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                07700 140 500
              </li>
              <li className="mt-4 text-slate-400 font-bold">Registered Office:</li>
              <li className="text-slate-400">59 The Gables, Aylesbury,<br/>Buckinghamshire, HP17 8AD</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-500 text-xs mb-2">
            © {new Date().getFullYear()} Hoop Heroes. All rights reserved.
          </p>
          <p className="text-slate-600 text-[10px] uppercase tracking-widest leading-relaxed">
            Registered Company Name & Number: Hoop Heroes Region 1 Ltd. 16896605 <br className="md:hidden" />
            <span className="hidden md:inline"> | </span> Place of Registration: England & Wales
          </p>
        </div>
      </div>
    </footer>
  );
};
