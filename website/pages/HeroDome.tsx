import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  ClipboardList,
  CloudRain,
  Droplets,
  FileText,
  GraduationCap,
  Heart,
  Layers,
  Loader2,
  Mail,
  Mountain,
  Package,
  Plug,
  PoundSterling,
  Ruler,
  School,
  ShieldCheck,
  Smile,
  Sun,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Logo } from '../components/Logo';

// Hero Dome: unlisted landing page for schools (hoopheroes.co.uk/hero-dome).
// Copy follows the schools deck and the KB "Head teacher concerns" sheet:
// no dates, no money values, no "first/only/founding" promises, no
// "no digging", nothing on school-day use beyond "the school day is yours".

const IMG = '/images/hero-dome';

const SPORT = {
  basketball: '#fba91a',
  pickleball: '#9bd13b',
  dodgeball: '#e63950',
};

const ROLES = [
  'Head teacher',
  'School business manager',
  'Governor or trustee',
  'PE lead',
  'Council or local authority',
  'Sports club',
  'Other',
];

const HEARD_FROM = [
  'A Hoop Heroes family',
  'Hoop Heroes got in touch',
  'Another school',
  'Social media',
  'Search engine',
  'Other',
];

const SectionTitle: React.FC<{ kicker?: string; title: string; light?: boolean; children?: React.ReactNode }> = ({
  kicker,
  title,
  light,
  children,
}) => (
  <div className="max-w-3xl mx-auto text-center mb-12">
    {kicker && (
      <p className={`font-bold uppercase tracking-widest text-sm mb-3 ${light ? 'text-brand-orange' : 'text-brand-orange'}`}>
        {kicker}
      </p>
    )}
    <h2 className={`font-display text-4xl md:text-6xl uppercase leading-none mb-4 ${light ? 'text-white' : 'text-brand-dark'}`}>
      {title}
    </h2>
    {children && (
      <div className={`text-lg font-medium leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>{children}</div>
    )}
  </div>
);

const Card: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; accent?: string }> = ({
  icon: Icon,
  title,
  children,
  accent = '#fba91a',
}) => (
  <div className="bg-white p-7 rounded-[2rem] border-4 border-brand-dark shadow-sticker h-full flex flex-col">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-brand-dark mb-5"
      style={{ backgroundColor: accent }}
    >
      <Icon size={28} className="text-brand-dark" strokeWidth={2.5} />
    </div>
    <h3 className="font-display text-2xl uppercase mb-2 text-brand-dark leading-tight">{title}</h3>
    <div className="text-slate-600 font-medium leading-relaxed">{children}</div>
  </div>
);

const Figure: React.FC<{ src: string; alt: string; caption?: string; className?: string }> = ({
  src,
  alt,
  caption,
  className = '',
}) => (
  <figure className={`rounded-[2rem] overflow-hidden border-4 border-brand-dark shadow-sticker bg-brand-dark ${className}`}>
    <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover aspect-video" />
    {caption && (
      <figcaption className="bg-brand-dark text-white text-sm font-bold uppercase tracking-wider px-5 py-3">{caption}</figcaption>
    )}
  </figure>
);

// The fly-through: muted, looping, and only fetched once it is near the screen so the page stays light.
const HeroDomeVideo: React.FC = () => {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || load) return;
    if (!('IntersectionObserver' in window)) {
      setLoad(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setLoad(true);
        io.disconnect();
      }
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [load]);
  useEffect(() => {
    if (load) ref.current?.play().catch(() => undefined);
  }, [load]);
  return (
    <figure className="rounded-[2rem] overflow-hidden border-4 border-brand-dark shadow-sticker bg-brand-dark mb-10">
      <video
        ref={ref}
        className="w-full aspect-video object-cover block"
        poster="/video/hero-dome-poster.jpg"
        muted
        loop
        playsInline
        controls
        preload="none"
        aria-label="Concept video: the Hero Dome being installed on a school playground, then a tour inside"
        src={load ? '/video/hero-dome.mp4' : undefined}
      />
      <figcaption className="bg-brand-dark text-white text-sm font-bold uppercase tracking-wider px-5 py-3">
        From empty playground to open: installation and a look inside. Concept visuals.
      </figcaption>
    </figure>
  );
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do we need planning permission?',
    a: 'Yes. The Dome stays up for longer than the 28 days a temporary structure is allowed without permission, so it needs a time-limited planning application. We prepare and pay for the planning application and consents, with your agreement at each stage, and give you a pack for your governors.',
  },
  {
    q: 'Will it disrupt the school?',
    a: 'We install during a school holiday, once planning and consents are in place. The canopy sits on its own containers on your existing playground. The accessible WC needs a water and drain connection, so we look at that with you on the site visit and plan any groundwork around your school.',
  },
  {
    q: 'Who uses it, and when?',
    a: 'The school day is yours. Hoop Heroes runs its sessions outside school hours: before school, after school, at weekends and in the holidays.',
  },
  {
    q: 'Will strangers be on site with our pupils?',
    a: 'Our sessions run outside school hours. Every coach is DBS checked, and our head coaches are first-aid and safeguarding trained. Access and safeguarding arrangements are agreed with your designated safeguarding lead.',
  },
  {
    q: "What's the catch?",
    a: 'We fund it because we run our own sessions there outside school hours. That is how it pays for itself.',
  },
  {
    q: 'Are we tied in for years?',
    a: "5 years, with the option to renew for 5 more. You can end it with 12 months' notice any time after year 3, and we review how it's going together every year.",
  },
  {
    q: "What if it doesn't work out?",
    a: 'At the end of the agreement we remove everything and make good your playground.',
  },
];

// Answers are always shown and in the page HTML, so they read without JavaScript (Integrator, 25 Nov 2026)
const Faq: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <div className="bg-white rounded-2xl border-4 border-brand-dark shadow-sticker overflow-hidden">
    <h3 className="px-6 pt-5 pb-2 font-display text-xl md:text-2xl uppercase text-brand-dark">{q}</h3>
    <p className="px-6 pb-6 text-slate-600 font-medium leading-relaxed">{a}</p>
  </div>
);

const inputClass =
  'w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors bg-white';
const labelClass = 'block text-xs font-black uppercase text-brand-dark mb-1 ml-1 tracking-widest';

const EnquiryForm: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    role: '',
    roleOther: '',
    organisation: '',
    town: '',
    email: '',
    phone: '',
    site: '',
    heardFrom: '',
    consent: false,
    website: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
      ? event.target.checked
      : event.target.value;
    setForm({ ...form, [key]: value });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('sending');
    try {
      const response = await fetch('/api/hero-dome-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || 'Sorry, something went wrong. Please try again, or email christie@hoopheroes.co.uk.');
        setStatus('idle');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Sorry, something went wrong. Please try again, or email christie@hoopheroes.co.uk.');
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="text-center py-10" role="status">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
          <CheckCircle size={40} />
        </div>
        <h3 className="font-display text-4xl text-brand-dark uppercase mb-3">Thank you</h3>
        <p className="text-slate-600 font-medium text-lg max-w-md mx-auto">
          We've got your enquiry. Christie, our Schools and Hero Dome Lead, will be in touch to book a 20-minute discovery
          call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate={false}>
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-bold" role="alert">
          {error}
        </div>
      )}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="hd-name" className={labelClass}>Your name</label>
          <input id="hd-name" required autoComplete="name" className={inputClass} value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label htmlFor="hd-role" className={labelClass}>Your role</label>
          <select id="hd-role" required className={inputClass} value={form.role} onChange={set('role')}>
            <option value="" disabled>Choose one</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {form.role === 'Other' && (
        <div>
          <label htmlFor="hd-role-other" className={labelClass}>What's your role?</label>
          <input id="hd-role-other" className={inputClass} value={form.roleOther} onChange={set('roleOther')} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="hd-org" className={labelClass}>School or organisation</label>
          <input id="hd-org" required autoComplete="organization" className={inputClass} value={form.organisation} onChange={set('organisation')} />
        </div>
        <div>
          <label htmlFor="hd-town" className={labelClass}>Town or postcode</label>
          <input id="hd-town" required autoComplete="postal-code" className={inputClass} value={form.town} onChange={set('town')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="hd-email" className={labelClass}>Email</label>
          <input id="hd-email" required type="email" autoComplete="email" className={inputClass} value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label htmlFor="hd-phone" className={labelClass}>Phone (optional)</label>
          <input id="hd-phone" type="tel" autoComplete="tel" className={inputClass} value={form.phone} onChange={set('phone')} />
        </div>
      </div>

      <div>
        <label htmlFor="hd-site" className={labelClass}>Tell us about your site (optional)</label>
        <textarea
          id="hd-site"
          rows={4}
          placeholder="For example: a flat playground or MUGA, roughly how big, and anything you'd love the Dome to do for your school."
          className={`${inputClass} resize-y`}
          value={form.site}
          onChange={set('site')}
        />
      </div>

      <div>
        <label htmlFor="hd-heard" className={labelClass}>How did you hear about us? (optional)</label>
        <select id="hd-heard" className={inputClass} value={form.heardFrom} onChange={set('heardFrom')}>
          <option value="">Choose one</option>
          {HEARD_FROM.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={form.consent}
          onChange={set('consent')}
          className="mt-1 w-5 h-5 accent-brand-orange shrink-0"
        />
        <span className="text-slate-600 font-medium text-sm leading-relaxed">
          I'm happy for Hoop Heroes to contact me about the Hero Dome. We'll only use these details for this enquiry; see
          our{' '}
          <a href="/policies?section=privacy" target="_blank" rel="noopener" className="underline font-bold text-brand-dark">privacy policy</a>.
        </span>
      </label>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-brand-dark text-white font-display text-2xl uppercase py-5 rounded-xl shadow-sticker hover:bg-brand-orange hover:text-brand-dark transition-all flex items-center justify-center gap-3 disabled:opacity-70"
      >
        {status === 'sending' ? (
          <><Loader2 className="animate-spin" size={24} /> Sending...</>
        ) : (
          <>Send my enquiry <ArrowRight size={24} /></>
        )}
      </button>
      <p className="text-center text-sm text-slate-500 font-medium">Nothing is binding. It's just the start of a conversation.</p>
    </form>
  );
};

export const HeroDome: React.FC = () => (
  <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-orange selection:text-brand-dark">
    {/* Hero */}
    {/* Standalone header: logo and one button, no links away from the page */}
    <header className="absolute top-0 inset-x-0 z-30">
      <div className="container mx-auto px-4 py-4 md:py-5 flex items-center justify-between gap-4">
        <Logo variant="light" />
        <a
          href="#enquire"
          className="bg-brand-orange text-brand-dark font-display text-base md:text-xl uppercase px-4 md:px-6 py-2 md:py-3 rounded-full border-2 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all whitespace-nowrap"
        >
          Register interest
        </a>
      </div>
    </header>
    <section className="relative pt-32 pb-28 md:pb-36 bg-brand-dark text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={`${IMG}/outside.jpg`} alt="" className="w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/70 via-brand-dark/50 to-brand-dark/90" />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-16 bg-white clip-wave-top z-10" />
      <div className="container mx-auto px-4 relative z-20 text-center">
        <div className="inline-block bg-brand-orange text-brand-dark px-5 py-2 rounded-lg font-display text-lg md:text-xl uppercase tracking-wide -rotate-2 mb-8 border-2 border-brand-dark shadow-sticker">
          An invitation to your school
        </div>
        <h1 className="font-display text-7xl md:text-9xl uppercase leading-none drop-shadow-lg">
          Hero <span className="text-brand-orange">Dome</span>
        </h1>
        <p className="font-display text-3xl md:text-4xl uppercase mt-2 mb-6">Your home court</p>
        <p className="text-xl md:text-2xl text-slate-200 max-w-2xl mx-auto font-medium leading-snug">
          A year-round, covered multi-sport court on your school playground. Installed, equipped and run by Hoop Heroes,
          at no cost to your school.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <a
            href="#enquire"
            className="bg-brand-orange text-brand-dark font-display text-xl md:text-2xl uppercase px-8 py-4 rounded-xl border-2 border-brand-dark shadow-sticker hover:shadow-sticker-hover hover:-translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
          >
            Register your interest <ArrowRight size={22} />
          </a>
          <a
            href="#look-inside"
            className="bg-white/10 backdrop-blur text-white font-display text-xl md:text-2xl uppercase px-8 py-4 rounded-xl border-2 border-white/40 hover:bg-white hover:text-brand-dark transition-all"
          >
            Look inside
          </a>
        </div>
        <p className="mt-8 text-xs uppercase tracking-widest text-slate-400 font-bold">
          Concept images. Subject to planning and consents.
        </p>
      </div>
    </section>

    {/* Problems */}
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle title="Sound familiar?" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card icon={CloudRain} title="Rain stops PE">Outdoor lessons get cancelled, and winter clubs are cut short by the dark.</Card>
          <Card icon={Building2} title="The hall is never free">Assemblies, lunch, clubs and PE all fight for one space.</Card>
          <Card icon={PoundSterling} title="No budget to build">New facilities cost tens of thousands, and PE funding can't pay for buildings.</Card>
          <Card icon={GraduationCap} title="PE confidence varies">Not every teacher feels sure teaching PE, and specialist coaches cost money.</Card>
        </div>
        <p className="text-center font-display text-3xl md:text-4xl uppercase mt-12 text-brand-dark leading-tight">
          What if all four went away, <span className="text-brand-orange">without costing your school a penny?</span>
        </p>
      </div>
    </section>

    {/* Look inside: the fly-through video, then stills and the key facts */}
    <section id="look-inside" className="py-16 md:py-20 bg-brand-light scroll-mt-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="Look inside" title="What goes on your playground">
          A steel-framed fabric canopy on its own containers, over a tiled sports floor. Covered, enclosed and lit, with
          reception at one end and kit storage at the other.
        </SectionTitle>
        <HeroDomeVideo />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            <Figure className="col-span-2" src={`${IMG}/mini.jpg`} alt="Concept render: children playing basketball inside the Hero Dome" caption="Inside: mini basketball" />
            <Figure src={`${IMG}/door.jpg`} alt="Concept render: the Hero Dome from outside with its roller door down" />
            <Figure src={`${IMG}/reception.jpg`} alt="Concept render: the reception and check-in area" />
          </div>
          <ul className="lg:col-span-2 space-y-4">
            {[
              [Ruler, 'Footprint', 'About 22 × 12 m (270 m²), roughly the size of a tennis court.'],
              [Sun, 'Covered, enclosed and LED lit', "With a 14.8 × 10 m court, so rain doesn't cancel sessions."],
              [Package, 'Secure storage', 'Dedicated storage for all the kit.'],
              [Smile, 'Planned reception and viewing area', 'With an accessible WC and step-free access onto the court.'],
              [Layers, 'On your existing playground', 'The canopy sits on its own containers.'],
              [Truck, 'Installed during a school holiday', 'Once planning and consents are in place. Fully removable, with your playground made good.'],
            ].map(([Icon, title, text]) => {
              const I = Icon as React.ElementType;
              return (
                <li key={title as string} className="flex gap-4 bg-white rounded-2xl border-2 border-brand-dark p-4">
                  <I size={26} className="text-brand-orange shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <p className="font-display text-xl uppercase leading-tight">{title as string}</p>
                    <p className="text-slate-600 font-medium">{text as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>

    {/* Sports */}
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="One space, many sports" title="Basketball first, and more">
          Basketball is our flagship. Roll the hoops away and the same court hosts pickleball and dodgeball, each with its
          own line colour.
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Basketball', colour: SPORT.basketball, img: 'threes.jpg', text: 'Mini court across the width, 3x3 on one hoop, and wheelchair basketball.' },
            { name: 'Pickleball', colour: SPORT.pickleball, img: 'pickle.jpg', text: 'Junior pickleball with portable nets.' },
            { name: 'Dodgeball', colour: SPORT.dodgeball, img: 'dodge.jpg', text: 'Soft foam balls, for all ages.' },
          ].map((sport) => (
            <div key={sport.name} className="rounded-[2rem] overflow-hidden border-4 border-brand-dark shadow-sticker bg-white flex flex-col">
              <img src={`${IMG}/${sport.img}`} alt={`Concept render: the Hero Dome set up for ${sport.name.toLowerCase()}`} loading="lazy" className="w-full aspect-video object-cover" />
              <div className="h-2" style={{ backgroundColor: sport.colour }} />
              <div className="p-6">
                <h3 className="font-display text-3xl uppercase mb-2">{sport.name}</h3>
                <p className="text-slate-600 font-medium">{sport.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-brand-dark text-white rounded-[2rem] border-4 border-brand-dark p-6 md:p-10 shadow-sticker">
          <div>
            <h3 className="font-display text-3xl md:text-4xl uppercase text-brand-orange mb-3">Built for everyone</h3>
            <p className="text-slate-300 font-medium text-lg leading-relaxed">
              Level, step-free access onto the court and an accessible WC in the reception, so wheelchair basketball can
              be part of the week, not an add-on.
            </p>
          </div>
          <Figure src={`${IMG}/wheelchair.jpg`} alt="Concept render: wheelchair 3x3 basketball in the Hero Dome" />
        </div>
      </div>
    </section>

    {/* Done for you */}
    <section className="py-16 md:py-20 bg-brand-light">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="For head teachers and governors" title="Done for you, from day one" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card icon={Sun} title="The Dome, installed">Covered, lit and enclosed. Free.</Card>
          <Card icon={School} title="The school day is yours">We run our sessions outside school hours.</Card>
          <Card icon={Package} title="Kit for every sport">Hoops, nets and balls, stored on site.</Card>
          <Card icon={Wrench} title="Upkeep and insurance">Maintenance, inspections and safety checks.</Card>
          <Card icon={Users} title="After-school clubs">Run, staffed and booked by us. No office admin.</Card>
          <Card icon={Heart} title="Holiday camps">For your families, run by our coaches.</Card>
          <Card icon={FileText} title="Planning and paperwork">Planning, consents and a pack for your governors.</Card>
          <Card icon={ShieldCheck} title="Safeguarding first">Every coach is DBS checked, and our head coaches are first-aid and safeguarding trained. Fully insured.</Card>
        </div>
        <p className="text-center text-slate-600 font-medium mt-8">
          Optional extras: PE lesson support and teacher CPD from our coaches, which may be eligible for PE and sport
          premium funding.
        </p>
        <div className="mt-12 bg-brand-orange rounded-[2rem] border-4 border-brand-dark shadow-sticker p-8 md:p-12 text-center">
          <p className="font-display text-8xl md:text-9xl leading-none text-brand-dark">£0</p>
          <p className="font-display text-2xl md:text-3xl uppercase text-brand-dark mt-2">to build, run or maintain</p>
          <p className="text-brand-dark font-bold text-lg mt-4 max-w-xl mx-auto">
            We fund it because we run our own sessions there outside school hours. That's the honest answer to "what's
            the catch?"
          </p>
        </div>
      </div>
    </section>

    {/* Site needs */}
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="Is your site a fit?" title="What your site needs">
          We check all of this together on a 30-minute site visit.
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card icon={Ruler} title="Space">A flat, hard area of about 22 × 12 m, such as a playground, MUGA or car park, with a little room around it.</Card>
          <Card icon={Layers} title="Surface">Tarmac or concrete, roughly level. The canopy sits on its containers rather than new foundations.</Card>
          <Card icon={Mountain} title="Height">About 8 m clear overhead: no cables, and any trees trimmed back.</Card>
          <Card icon={Truck} title="Access">Room for a lorry and a small crane on install day, and a route families can use out of hours without going through the school.</Card>
          <Card icon={Plug} title="Power">A supply nearby, from your school. We fit our own sub-meter and pay for the electricity we use.</Card>
          <Card icon={Droplets} title="Water and drainage">A connection nearby for the accessible WC. If there isn't one, we use a self-contained unit.</Card>
        </div>
      </div>
    </section>

    {/* Agreement + FAQ */}
    <section className="py-16 md:py-20 bg-brand-dark text-white relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <SectionTitle light kicker="Plain English" title="The agreement" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            ['How long', '5 years, with the option to renew for 5 more.'],
            ['Your way out', "A break with 12 months' notice, any time after year 3."],
            ['Annual review', "Every year we review how it's going, together."],
            ['At the end', 'We remove everything and make good your playground.'],
          ].map(([title, text]) => (
            <div key={title} className="bg-white/5 border-2 border-white/20 rounded-2xl p-6">
              <p className="font-display text-2xl uppercase text-brand-orange mb-2">{title}</p>
              <p className="text-slate-200 font-medium">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-400 font-medium mb-14">
          Rent: none, or a nominal amount. Nothing is binding until planning and the right consents are in place.
        </p>
        <SectionTitle light title="Your questions, answered" />
        <div className="max-w-3xl mx-auto space-y-4 text-brand-dark">
          {FAQS.map((faq) => (
            <Faq key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>

    {/* Community */}
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="Outside school hours" title="Good for your whole community">
          The Dome opens sport to people who often miss out. These are sessions we plan to run there.
        </SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['SEND sessions', 'Calm, adapted sessions for children with additional needs.'],
            ['Wheelchair basketball', 'A level, covered court that works for wheelchair users.'],
            ['Girls-only sessions', 'A space where girls build confidence in sport.'],
            ['Over-40s', 'Parents and grown-ups back on court.'],
            ['Community sessions', 'Open sessions so every family can give it a go.'],
            ['Holiday camps', 'Active, all-day camps in the school holidays.'],
          ].map(([title, text]) => (
            <div key={title} className="bg-brand-light rounded-2xl border-2 border-brand-dark p-5">
              <p className="font-display text-xl md:text-2xl uppercase leading-tight mb-1">{title}</p>
              <p className="text-slate-600 font-medium text-sm md:text-base">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Road to opening */}
    <section className="py-16 md:py-20 bg-brand-light">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="How it happens" title="The road to opening" />
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ['Discovery call', 'Twenty minutes: your school, your site and what you would love it to do.'],
            ['Site visit', 'Thirty minutes on your playground: space, access and power.'],
            ['Agree in principle', 'A short, non-binding letter, with a pack for your governors.'],
            ['Planning and consents', 'We prepare and pay for the planning application and consents, with your agreement at each stage.'],
            ['Install', 'During a school holiday, once planning and consents are in place.'],
            ['Open', 'Your Hero Dome, ready for your pupils and community.'],
          ].map(([title, text], index) => (
            <li key={title} className="bg-white rounded-[2rem] border-4 border-brand-dark shadow-sticker p-6 flex gap-4">
              <span className="font-display text-4xl text-brand-orange leading-none">{index + 1}</span>
              <div>
                <p className="font-display text-2xl uppercase leading-tight mb-1">{title}</p>
                <p className="text-slate-600 font-medium">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-center text-slate-500 font-medium mt-8">
          Every step depends on planning permission and the landowner's consent.
        </p>
      </div>
    </section>

    {/* About Hoop Heroes */}
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionTitle kicker="Who we are" title="Who are Hoop Heroes?" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            // figures checked by Jamie, 25 Nov 2026
            ['400', 'children aged 5 to 15 playing with us every week'],
            ['10', 'towns across Buckinghamshire, Oxfordshire, Hertfordshire and Berkshire'],
            ['2018', 'the year Hoop Heroes began'],
          ].map(([big, text]) => (
            <div key={text} className="bg-brand-dark text-white rounded-[2rem] border-4 border-brand-dark shadow-sticker p-8 text-center">
              <p className={`font-display text-brand-orange leading-none ${big.startsWith('[') ? 'text-3xl md:text-4xl' : 'text-6xl md:text-7xl'}`}>{big}</p>
              <p className="font-medium text-slate-300 mt-2">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-600 font-medium text-lg max-w-2xl mx-auto">
          Every coach is DBS checked, and our head coaches are first-aid and safeguarding trained. Fully insured.
        </p>
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <Figure src={`${IMG}/topdown.jpg`} alt="Concept render: the Hero Dome from above" />
          <div>
            <h3 className="font-display text-4xl md:text-5xl uppercase leading-none mb-4">
              One area, <span className="text-brand-orange">one Dome</span>
            </h3>
            <p className="text-slate-600 font-medium text-lg leading-relaxed">
              We place one Hero Dome in each area, so every Dome serves its whole local community. We're starting in
              Buckinghamshire and Oxfordshire.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Enquiry */}
    <section id="enquire" className="py-16 md:py-24 bg-brand-dark relative scroll-mt-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionTitle light kicker="Start the conversation" title="Register your interest">
          Tell us a little about your school or organisation and we'll be in touch to book a 20-minute discovery call.
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border-4 border-brand-dark shadow-sticker p-6 md:p-10 relative">
            <EnquiryForm />
          </div>
          <aside className="text-white space-y-6">
            <div className="bg-white/5 border-2 border-white/20 rounded-2xl p-6">
              <p className="font-display text-2xl uppercase text-brand-orange mb-1">Christie Lothamer</p>
              <p className="text-slate-300 font-medium text-sm mb-3">Schools and Hero Dome Lead</p>
              <a href="mailto:christie@hoopheroes.co.uk" className="inline-flex items-center gap-2 font-bold hover:text-brand-orange break-all">
                <Mail size={18} /> christie@hoopheroes.co.uk
              </a>
            </div>
            <div className="bg-white/5 border-2 border-white/20 rounded-2xl p-6">
              <p className="font-display text-2xl uppercase text-brand-orange mb-1">Jamie Stone</p>
              <p className="text-slate-300 font-medium text-sm mb-3">Founder</p>
              <a href="mailto:jamie@hoopheroes.co.uk" className="inline-flex items-center gap-2 font-bold hover:text-brand-orange break-all">
                <Mail size={18} /> jamie@hoopheroes.co.uk
              </a>
            </div>
            <div className="flex gap-3 text-slate-400 text-sm font-medium">
              <ClipboardList size={20} className="shrink-0" />
              <p>Partners, suppliers and funders are welcome to use the form too.</p>
            </div>
          </aside>
        </div>
        <p className="text-center text-xs uppercase tracking-widest text-slate-500 font-bold mt-12">
          Hero Dome is a concept, subject to planning and consents. Images are concept renders.
        </p>
      </div>
    </section>

    <footer className="bg-[#0d1a38] text-slate-400 text-sm font-medium">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
        <p>© Hoop Heroes Region 1 Limited</p>
        <a href="/policies?section=privacy" target="_blank" rel="noopener" className="underline hover:text-white">
          Privacy policy
        </a>
      </div>
    </footer>
  </div>
);
