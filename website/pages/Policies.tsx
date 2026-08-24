
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, FileText, ChevronRight, UserCheck, Menu, X } from 'lucide-react';

type PolicySection = 'privacy' | 'cookies' | 'safeguarding' | 'terms' | 'conduct';

export const Policies: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<PolicySection>('privacy');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync state with search params
  useEffect(() => {
    const section = searchParams.get('section') as PolicySection;
    if (section && ['privacy', 'cookies', 'safeguarding', 'terms', 'conduct'].includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionChange = (section: PolicySection) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    setSearchParams({ section });
    scrollToTop();
  };

  const navItems = [
    { id: 'privacy', label: 'Privacy Policy', icon: <Lock size={18} /> },
    { id: 'cookies', label: 'Cookie Policy', icon: <Eye size={18} /> },
    { id: 'safeguarding', label: 'Safeguarding Policy', icon: <ShieldCheck size={18} /> },
    { id: 'terms', label: 'Membership T&Cs', icon: <FileText size={18} /> },
    { id: 'conduct', label: 'Code of Conduct', icon: <UserCheck size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-brand-dark pb-20">
        {/* Header */}
        <div className="bg-brand-dark text-white py-16 md:py-24 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-pattern-grid"></div>
            <div className="container mx-auto px-4 text-center relative z-10">
                <h1 className="font-display text-4xl md:text-7xl uppercase mb-4 tracking-tight">Policies & <span className="text-brand-orange">Privacy</span></h1>
                <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                    Our commitment to safety, transparency, and the protection of our community.
                </p>
            </div>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm">
            <span className="font-black uppercase text-xs tracking-widest text-brand-dark">
                {navItems.find(n => n.id === activeSection)?.label}
            </span>
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-brand-dark text-white rounded-lg"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
        </div>

        <div className="container mx-auto px-4 py-8 md:py-16 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                
                {/* Sidebar Navigation */}
                <div className={`md:col-span-4 lg:col-span-3 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
                    <div className="bg-white rounded-[2rem] p-6 shadow-sticker border-4 border-brand-dark sticky top-24">
                        <h3 className="font-display text-xl uppercase mb-6 border-b-2 border-slate-100 pb-4">Navigation</h3>
                        <ul className="space-y-2">
                            {navItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleSectionChange(item.id as PolicySection)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all text-left ${
                                            activeSection === item.id 
                                            ? 'bg-brand-orange text-brand-dark shadow-sm translate-x-1' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-brand-dark'
                                        }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                        {activeSection === item.id && <ChevronRight size={16} className="ml-auto" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        
                        <div className="mt-8 pt-6 border-t-2 border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Need Help?</p>
                            <a href="mailto:basketball@hoopheroes.co.uk" className="text-xs font-bold text-brand-dark hover:text-brand-orange transition-colors">
                                basketball@hoopheroes.co.uk
                            </a>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="md:col-span-8 lg:col-span-9">
                    
                    {/* Privacy Policy */}
                    {activeSection === 'privacy' && (
                        <article className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sticker border-4 border-brand-dark animate-fade-in">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-brand-orange p-3 rounded-2xl text-brand-dark border-2 border-brand-dark shadow-sm"><Lock size={32} /></div>
                                <h2 className="font-display text-4xl md:text-5xl uppercase leading-none">Privacy Policy</h2>
                            </div>
                            
                            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand-dark prose-p:text-slate-600 prose-p:font-medium prose-li:text-slate-600 prose-li:font-medium">
                                <p className="text-sm font-black text-brand-orange uppercase tracking-widest mb-8">Last Updated: March 2026</p>
                                <p>Hoop Heroes Ltd and Hoop Heroes Region 1 Ltd ("we", "our", or "us") are committed to protecting your personal data. This policy details how we collect, use, and store your information in accordance with the UK General Data Protection Regulation (UK GDPR).</p>
                                
                                <h3>1. Information We Collect</h3>
                                <p>We collect information to provide safe and effective coaching services. This includes:</p>
                                <ul>
                                    <li><strong>Parent/Guardian Details:</strong> Name, address, email, and phone number for billing and emergency contact.</li>
                                    <li><strong>Player Details:</strong> Name, date of birth, and gender to ensure age-appropriate coaching.</li>
                                    <li><strong>Medical Information:</strong> Details of allergies or medical conditions relevant to sports participation (collected via our secure booking partner, TeamUp).</li>
                                    <li><strong>Media:</strong> Photographs or videos of sessions (only with explicit consent).</li>
                                </ul>

                                <h3>2. How We Use Your Data</h3>
                                <ul>
                                    <li>To manage class bookings and memberships via <strong>TeamUp</strong>.</li>
                                    <li>To manage inquiries and customer relationships via <strong>HighLevel (GoHighLevel)</strong>.</li>
                                    <li>To communicate regarding schedule changes, cancellations, or renewals.</li>
                                    <li>To ensure the safety and wellbeing of players during sessions.</li>
                                    <li>To process payments securely.</li>
                                </ul>

                                <h3>3. Third-Party Platforms & Data Transfers</h3>
                                <p>We use trusted industry-standard platforms to provide our services. Your data is processed by:</p>
                                <ul>
                                    <li><strong>TeamUp:</strong> Our primary software for booking, attendance tracking, and membership management. TeamUp acts as a Data Processor, and your data is stored securely in accordance with their privacy standards.</li>
                                    <li><strong>HighLevel (GHL):</strong> Our platform for managing website inquiries, franchise requests, and careers applications. When you submit a form on our site, your data is processed by HighLevel and its <strong>LeadConnector</strong> infrastructure to facilitate communication and CRM services.</li>
                                    <li><strong>Stripe / GoCardless:</strong> For secure payment processing. We do not store full credit card details on our own servers.</li>
                                </ul>
                                <p>We do not sell your personal data. We only share information with these providers as necessary to fulfill our service contract with you.</p>

                                <h3>4. Your Rights</h3>
                                <p>Under the UK GDPR, you have the right to access, correct, or request deletion of your personal data. To exercise these rights, please contact us at <a href="mailto:privacy@hoopheroes.co.uk" className="text-brand-orange font-bold">privacy@hoopheroes.co.uk</a>.</p>
                            </div>
                        </article>
                    )}

                    {/* Cookie Policy */}
                    {activeSection === 'cookies' && (
                        <article className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sticker border-4 border-brand-dark animate-fade-in">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="bg-brand-dark p-3 rounded-2xl text-white border-2 border-brand-dark shadow-sm"><Eye size={32} /></div>
                                <h2 className="font-display text-4xl md:text-5xl uppercase leading-none">Cookie Policy</h2>
                            </div>
                            
                            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand-dark prose-p:text-slate-600 prose-p:font-medium prose-li:text-slate-600 prose-li:font-medium">
                                <p>Our website uses cookies to distinguish you from other users. This helps us provide you with a good experience when you browse our website and allows us to improve our site.</p>

                                <h3>What are cookies?</h3>
                                <p>A cookie is a small file of letters and numbers that we store on your browser or the hard drive of your computer if you agree. Cookies contain information that is transferred to your computer's hard drive.</p>

                                <h3>We use the following cookies:</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Strictly necessary cookies:</strong> These are required for the operation of our website (e.g., to log into secure areas).</li>
                                    <li><strong>Functionality cookies:</strong> These recognise you when you return to our website, enabling us to personalise content.</li>
                                    <li><strong>Analytical/Tracking cookies:</strong> We use Google Tag Manager (GTM) and Meta Pixel to understand how users find our site and interact with it. These are only activated if you click "Accept" on our cookie banner.</li>
                                </ul>
                                
                                <h3>Managing Cookies</h3>
                                <p>You can block cookies by activating the setting on your browser that allows you to refuse the setting of all or some cookies. However, if you use your browser settings to block all cookies (including essential cookies) you may not be able to access all or parts of our site.</p>
                            </div>
                        </article>
                    )}

                    {/* Safeguarding */}
                    {activeSection === 'safeguarding' && (
                        <article className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sticker border-4 border-brand-dark animate-fade-in">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="bg-green-500 p-3 rounded-2xl text-white border-2 border-brand-dark shadow-sm"><ShieldCheck size={32} /></div>
                                <h2 className="font-display text-4xl md:text-5xl uppercase leading-none">Safeguarding Policy</h2>
                            </div>
                            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand-dark prose-p:text-slate-600 prose-p:font-medium prose-li:text-slate-600 prose-li:font-medium">
                                <p className="text-sm font-black text-brand-orange uppercase tracking-widest mb-8">Version: 1.0 (01/08/2025)</p>
                                
                                <h3>1. Introduction</h3>
                                <p>At HoopHeroes, the safety and well-being of all children and young people (defined as anyone under 18 years of age) involved in our basketball activities is our absolute priority. We are committed to providing a safe, fun, and positive environment where every participant feels respected, valued, and protected from all forms of harm. We maintain a zero-tolerance approach to child abuse or maltreatment in any form.</p>

                                <h3>2. Policy Scope</h3>
                                <p>This policy is mandatory for all individuals involved in HoopHeroes's activities, including paid staff, volunteers, parents/guardians, participants, and spectators.</p>

                                <h3>3. Key Principles</h3>
                                <ul>
                                    <li><strong>Child's Welfare is Paramount:</strong> The safety and protection of the child are the overriding considerations.</li>
                                    <li><strong>The Voice of the Child:</strong> We ensure children's views are heard and considered.</li>
                                    <li><strong>Equal Protection for All:</strong> All young people have an equal right to protection from abuse.</li>
                                    <li><strong>Reporting is Everyone's Responsibility:</strong> Every individual has a moral and legal responsibility to report concerns.</li>
                                </ul>

                                <h3>4. Promoting Good Practice</h3>
                                <p>All staff and volunteers are expected to demonstrate exemplary behaviour, including prioritising welfare, working in an open environment, and maintaining appropriate boundaries.</p>

                                <h3>5. Recognising and Reporting Concerns</h3>
                                <p>We expect all individuals to report any concerns relating to "poor practice" or "abuse". If you have a concern, follow these steps: Stop and Listen, Listen Carefully, Minimal Questioning (TED), Reassure, Explain Next Steps, and Record.</p>

                                <h3>6. Designated Safeguarding Lead (DSL)</h3>
                                <p><strong>Name:</strong> Jacob Clarke<br />
                                <strong>Contact:</strong> <a href="mailto:jacob@hoopheroes.co.uk" className="text-brand-orange font-bold">jacob@hoopheroes.co.uk</a><br />
                                <strong>Phone:</strong> 07700 140 500</p>

                                <h3>7. Staffing and Supervision Ratios</h3>
                                <p>We maintain appropriate staffing ratios to ensure safety, with a minimum of two adults present during any activity involving children.</p>

                                <h3>8. Recruitment and Vetting</h3>
                                <p>All staff and volunteers are subject to identity verification, professional references, and enhanced DBS disclosures.</p>

                                <h3>9. Ensuring Privacy in Changing Rooms</h3>
                                <p>Supervision is provided where practical, with separate facilities for adults and children. No photography is permitted in changing areas.</p>

                                <h3>10. Late Collection & Missing Participants</h3>
                                <p>Clear procedures are in place for late collection and missing participants, including immediate notification of the head coach and welfare officer.</p>

                                <h3>11. Photography, Video, and Live Streaming</h3>
                                <p>HoopHeroes is committed to protecting young people from the inappropriate use of their images. Written consent is required for images taken at junior games or training.</p>

                                <h3>12. Positions of Trust</h3>
                                <p>It is against the law for someone in a position of trust to engage in sexual activity with a child in their care.</p>

                                <h3>13. Online Safety</h3>
                                <p>We educate young people on appropriate online behaviours and adhere to Basketball England's guidance on social media.</p>

                                <h3>14. Essential Contacts</h3>
                                <ul>
                                    <li><strong>Basketball England Safeguarding:</strong> 0300 600 1170</li>
                                    <li><strong>Childline:</strong> 0800 1111</li>
                                    <li><strong>NSPCC Helpline:</strong> 0808 800 5000</li>
                                </ul>
                            </div>
                        </article>
                    )}
                    
                    {/* Terms */}
                    {activeSection === 'terms' && (
                        <article className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sticker border-4 border-brand-dark animate-fade-in">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="bg-slate-700 p-3 rounded-2xl text-white border-2 border-brand-dark shadow-sm"><FileText size={32} /></div>
                                <h2 className="font-display text-4xl md:text-5xl uppercase leading-none">Membership T&Cs</h2>
                            </div>
                            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand-dark prose-p:text-slate-600 prose-p:font-medium prose-li:text-slate-600 prose-li:font-medium">
                                 <p className="text-sm font-black text-brand-orange uppercase tracking-widest mb-8">Last Updated: 01/01/2026</p>
                                 
                                 <p>Welcome to Hoop Heroes Ltd. (HH). By enrolling your child in our program, you agree to the following terms and conditions of membership:</p>

                                 <h3>1. Monthly Membership Payments</h3>
                                 <p>Membership fees are payable via automatic recurring card payment. All fees are paid in advance on the 1st of each month. Please note that we do not accept payment by direct debit, bank transfer, or cash.</p>
                                 
                                 <h3>2. Understanding Your Monthly Payments</h3>
                                 <p>Our billing structure spreads the cost of your child's membership evenly across the year. This ensures a consistent monthly fee that remains the same even when classes are not in session during school holidays.</p>

                                 <h3>3. Pro-Rated Payment Structure</h3>
                                 <ul>
                                     <li><strong>Termly Cost:</strong> £164 per term (3 terms per year).</li>
                                     <li><strong>Annual Total:</strong> £492 per year.</li>
                                     <li><strong>Monthly Payment:</strong> £41 per month (spread over 12 months).</li>
                                 </ul>

                                 <h3>4. Continuous Payment & Holidays</h3>
                                 <p>It is crucial not to cancel your recurring payment during the Summer, Christmas, or Easter holidays. Your membership fee covers year-round program expenses and secures your child's place.</p>

                                 <h3>5. Cancellation & Re-enrollment</h3>
                                 <ul>
                                     <li><strong>Notice Period:</strong> We require <strong>one month's notice</strong> before any changes or cancellations.</li>
                                     <li><strong>Re-enrollment Fees:</strong> Cancelling your payment during holiday breaks without prior notice will result in a re-enrollment fee.</li>
                                 </ul>

                                 <h3>6. Liability & Waiver</h3>
                                 <p>By participating in HH activities, parents/guardians acknowledge the physical risks associated with sports. HH cannot be held responsible for injuries or losses.</p>

                                 <h3>7. Member Code of Conduct</h3>
                                 <p>All members must use appropriate language and show respect at all HH sessions. Bullying or inappropriate behavior is not tolerated.</p>

                                 <h3>8. Communication</h3>
                                 <p>Please direct all feedback, billing queries, or administrative requests to <a href="mailto:basketball@hoopheroes.co.uk" className="text-brand-orange font-bold">basketball@hoopheroes.co.uk</a>.</p>
                            </div>
                        </article>
                    )}

                    {/* Code of Conduct */}
                    {activeSection === 'conduct' && (
                        <article className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sticker border-4 border-brand-dark animate-fade-in">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="bg-brand-orange p-3 rounded-2xl text-brand-dark border-2 border-brand-dark shadow-sm"><UserCheck size={32} /></div>
                                <h2 className="font-display text-4xl md:text-5xl uppercase leading-none">Code of Conduct</h2>
                            </div>
                            <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:text-brand-dark prose-p:text-slate-600 prose-p:font-medium prose-li:text-slate-600 prose-li:font-medium">
                                <p className="text-sm font-black text-brand-orange uppercase tracking-widest mb-8">Version: 1.0 (01/03/2026)</p>
                                
                                <h3>1. Introduction</h3>
                                <p>At Hoop Heroes, we believe basketball is more than just a game—it’s a platform for character building, community, and personal growth. To maintain our "Game Time over Screen Time" ethos, all members of our community are expected to uphold the following standards.</p>

                                <h3>2. Participants’ Code of Conduct (The Players)</h3>
                                <p>As a Hoop Hero, I represent my team, my coaches, and myself. I agree to:</p>
                                <ul>
                                    <li><strong>Respect the Game:</strong> Treat all teammates, opponents, coaches, and officials with respect. No foul language or bullying.</li>
                                    <li><strong>Play Hard, Play Fair:</strong> Give 100% effort in every drill and game. Follow the rules and accept decisions without complaining.</li>
                                    <li><strong>Be a Great Teammate:</strong> Encourage others when they make mistakes. Teamwork is as important as individual skill.</li>
                                    <li><strong>Commitment to Learning:</strong> Listen to coaches, stay focused, and be willing to try new skills.</li>
                                    <li><strong>Safety First:</strong> Use equipment properly and follow safety instructions.</li>
                                    <li><strong>Punctuality:</strong> Arrive on time and ready to play in appropriate kit.</li>
                                </ul>

                                <h3>3. Parents’ & Guardians’ Code of Conduct</h3>
                                <p>We value the support of the parents. To ensure your child gets the most out of their experience, we ask you to:</p>
                                <ul>
                                    <li><strong>Focus on Effort, Not Results:</strong> Encourage hard work and improvement rather than just winning.</li>
                                    <li><strong>Respect the Coaching Staff:</strong> Trust the coaches to manage the sessions. Address concerns privately at an appropriate time.</li>
                                    <li><strong>Model Sportsmanship:</strong> Be a positive role model in the stands. Do not shout abuse at officials or players.</li>
                                    <li><strong>Prioritise Wellbeing:</strong> Do not force an unwilling child to participate.</li>
                                    <li><strong>Safeguarding Cooperation:</strong> Ensure prompt drop-off and pick-up. Notify the club of any medical changes.</li>
                                    <li><strong>Digital Responsibility:</strong> Respect the privacy of other participants. Do not post photos/videos of other children without permission.</li>
                                </ul>

                                <h3>4. "Zero Tolerance" Policy</h3>
                                <p>Hoop Heroes maintains a zero-tolerance approach to physical violence, threats, discriminatory behavior, and bullying or harassment (including cyber-bullying). Failure to follow this Code may result in warnings, suspension, or removal from the program.</p>

                                <h3>5. Commitment</h3>
                                <p>By attending Hoop Heroes sessions, you are agreeing to abide by these principles. We are here to create the next generation of heroes—both on and off the court.</p>
                            </div>
                        </article>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};
