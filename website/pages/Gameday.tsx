import React from 'react';
import { Calendar, MapPin, Clock, Users, ArrowRight, Trophy, Activity, Heart, ShieldCheck } from 'lucide-react';

export const Gameday: React.FC = () => {
  const settings = ({
    nextDate: 'Sunday 12th April',
    times: '3:00 PM - 6:00 PM',
    location: 'John Colet School, Wendover',
    address: 'Wharf Road, Wendover HP22 6HF',
    ages: '8-15 (Split into leagues by age)',
    cost: '£30 per player',
    registrationCloses: 'Sunday 5th April',
    description: 'Experience the fast-paced excitement of 3x3 basketball with our small internal mini-tournament',
    registrationUrl: 'https://goteamup.com/p/6822945-hoop-heroes/courses/131282/',
    isLive: true
  });

  const REGISTRATION_URL = settings.registrationUrl;

  const faqs = [
    {
      question: "Where and when is the 3x3 Game day?",
      answer: settings.isLive ? `${settings.location} on ${settings.nextDate}, from ${settings.times}.` : "The date and location for our next event are currently being finalized. Join our mailing list or check back here soon!"
    },
    {
      question: "How much does it cost to enter?",
      answer: `Registration is ${settings.cost}.`
    },
    {
      question: "What age groups will be playing?",
      answer: settings.ages
    },
    {
      question: "Is the 3x3 Gameday only open to Hoop Heroes members?",
      answer: "Yes! Currently, only Hoop Heroes members can register for the 3x3 Gameday."
    },
    {
      question: "How many players on each team?",
      answer: "There will be 3 players on court plus one substitute per team."
    },
    {
      question: "How will I know which team my child is on?",
      answer: "Once all players have registered, we will create the teams. Your child will be assigned to their team at registration on the day."
    },
    {
      question: "Should parents/guardians stay and watch?",
      answer: "Yes! We expect parents/guardians to stay for the gameday, cheer the children on, and perhaps help out as a team Sponsor. Team Sponsors will make sure that one team is present and ready for their game time."
    },
    {
      question: "My child is 7, can they take part in the 3x3 Gameday?",
      answer: "Yes! The age ranges are just a guideline. If your child is slightly under 8 but is comfortable playing against older children, they are more than welcome to register."
    },
    {
      question: "Can my child play on the same team as their friends?",
      answer: "Whenever possible, we try to group children from the same locations and weekly classes together. However, we don't allow players to form their own pre-made teams, as we've found this can lead to unbalanced leagues. Our goal is to keep the games fair and fun for everyone!"
    },
    {
      question: "When do I need to register by?",
      answer: settings.isLive ? `Registration closes on ${settings.registrationCloses}. We recommend booking early as spots are limited!` : "Registration is not yet open for the next event. We will announce the registration deadline as soon as the event date is confirmed."
    }
  ];

  const benefits = [
    {
      title: "More Game Time",
      desc: "With only three players on each team, everyone gets more playing time and opportunities to showcase their skills. Each team will play multiple games against different teams.",
      icon: Clock,
      color: "bg-blue-500"
    },
    {
      title: "Improved Teamwork",
      desc: "In 3x3 basketball, teamwork is key. Playing with a smaller team helps players to develop better communication and collaboration skills.",
      icon: Users,
      color: "bg-brand-orange"
    },
    {
      title: "Enhanced Fitness",
      desc: "Playing basketball is a great way to stay fit and active. With 3x3 basketball, the fast-paced and intense nature of the game helps to improve cardiovascular endurance and muscle strength.",
      icon: Activity,
      color: "bg-green-500"
    },
    {
      title: "Fun & Social",
      desc: "Basketball is not just about winning or losing. It's also a great way to meet new people, make friends, and have fun. Our 3x3 basketball gameday provides the perfect platform for all of these.",
      icon: Heart,
      color: "bg-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-brand-dark">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
            <div className="absolute inset-0 bg-brand-dark/60 mix-blend-multiply z-10"></div>
            <img 
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1600" 
                alt="3x3 Basketball Action" 
                className="w-full h-full object-cover"
            />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-slate-50 clip-wave-top z-10"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-brand-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="container mx-auto px-4 relative z-20 text-center">
            <div className="inline-block transform -rotate-2 mb-6">
                <div className="bg-brand-orange text-brand-dark px-6 py-2 font-display text-xl uppercase tracking-wide shadow-sticker border-2 border-brand-dark rounded-lg">
                    EXCLUSIVE MEMBER EVENT
                </div>
            </div>
            
            <h1 className="font-display text-6xl md:text-8xl text-white mb-6 uppercase tracking-wide leading-none drop-shadow-lg">
                3x3 <span className="text-brand-orange">Gameday</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 mb-10 font-medium max-w-3xl mx-auto drop-shadow-md">
                {settings.description}
            </p>

            {settings.isLive ? (
              <>
                <a 
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-brand-orange hover:bg-yellow-400 text-brand-dark border-4 border-brand-dark px-10 py-4 rounded-full font-display text-2xl uppercase tracking-wide transition-all shadow-sticker hover:shadow-sticker-hover transform hover:-translate-y-1"
                >
                    REGISTER NOW <ArrowRight size={28} strokeWidth={3} />
                </a>
                <p className="text-white mt-4 font-bold text-sm uppercase tracking-wider opacity-80">
                    Registration closes {settings.registrationCloses}
                </p>
              </>
            ) : (
              <div className="inline-block transform -rotate-1">
                <div className="bg-blue-500 text-white px-10 py-4 rounded-full font-display text-2xl uppercase tracking-wide shadow-sticker border-4 border-brand-dark">
                  NEXT EVENT COMING SOON
                </div>
              </div>
            )}
        </div>
      </section>

      {/* EVENT DETAILS & VIDEO */}
      <section className="py-16 relative z-20">
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                
                {/* Details Card */}
                {settings.isLive ? (
                  <div className="bg-white rounded-[2.5rem] border-4 border-brand-dark shadow-sticker p-8 md:p-10 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                      <h2 className="font-display text-4xl uppercase mb-8 text-brand-dark border-b-4 border-slate-100 pb-4">Next Event Details</h2>
                      
                      <div className="space-y-6">
                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center border-2 border-brand-dark flex-shrink-0">
                                  <Calendar className="text-brand-orange" size={28} strokeWidth={2.5} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Date</p>
                                  <p className="text-xl font-bold text-brand-dark">{settings.nextDate}</p>
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center border-2 border-brand-dark flex-shrink-0">
                                  <Clock className="text-brand-orange" size={28} strokeWidth={2.5} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Time</p>
                                  <p className="text-xl font-bold text-brand-dark">{settings.times}</p>
                              </div>
                          </div>

                          <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center border-2 border-brand-dark flex-shrink-0 mt-1">
                                  <MapPin className="text-brand-orange" size={28} strokeWidth={2.5} />
                              </div>
                              <div className="flex-grow">
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Location</p>
                                  <p className="text-xl font-bold text-brand-dark mb-1">{settings.location}</p>
                                  <p className="text-slate-600 font-medium leading-snug mb-3">{settings.address}</p>
                                  <div className="rounded-xl overflow-hidden border-2 border-brand-dark h-32 w-full">
                                      <iframe 
                                          width="100%" 
                                          height="100%" 
                                          style={{ border: 0 }} 
                                          title={`${settings.location} Map`} 
                                          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${settings.location}, ${settings.address}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`} 
                                          loading="lazy"
                                      ></iframe>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center border-2 border-brand-dark flex-shrink-0">
                                  <Users className="text-brand-orange" size={28} strokeWidth={2.5} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ages</p>
                                  <p className="text-xl font-bold text-brand-dark">{settings.ages}</p>
                              </div>
                          </div>

                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center border-2 border-brand-dark flex-shrink-0">
                                  <Trophy className="text-brand-orange" size={28} strokeWidth={2.5} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Cost</p>
                                  <p className="text-xl font-bold text-brand-dark">{settings.cost}</p>
                              </div>
                          </div>
                      </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2.5rem] border-4 border-brand-dark shadow-sticker p-8 md:p-12 transform rotate-1 flex flex-col items-center text-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 border-4 border-brand-dark">
                      <Calendar className="text-blue-600" size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="font-display text-4xl uppercase mb-4 text-brand-dark">Next Event Loading...</h2>
                    <p className="text-slate-600 font-medium text-lg max-w-sm">
                      We're currently finalizing the date and venue for our next 3x3 Gameday. Check back soon for updates!
                    </p>
                    <div className="mt-8 px-6 py-2 bg-slate-100 rounded-full text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Coming Soon
                    </div>
                  </div>
                )}

                {/* Video Embed */}
                <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-brand-dark shadow-sticker aspect-video bg-brand-dark transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                    <iframe 
                        className="absolute inset-0 w-full h-full"
                        src="https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0&autoplay=1&mute=1&loop=1&playlist=ENWlnbItCc0" 
                        title="3x3 Gameday Action" 
                        style={{ border: 0 }} 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                    ></iframe>
                </div>

            </div>
        </div>
      </section>

      {/* WHAT IS IT & BENEFITS */}
      <section className="py-20 bg-brand-dark text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-10 bg-slate-50 clip-wave-bottom"></div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10 mt-10">
            <div className="text-center mb-16">
                <h2 className="font-display text-5xl md:text-6xl uppercase mb-6">What is a <span className="text-brand-orange">3x3 Gameday?</span></h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto font-medium">
                    Playing basketball is always fun, but 3x3 basketball adds a whole new level of excitement to the game! Here are a few benefits that you can enjoy by playing in our 3x3 basketball gameday.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {benefits.map((benefit, idx) => (
                    <div key={idx} className="bg-white text-brand-dark p-8 rounded-[2rem] border-4 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all duration-300 group">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border-4 border-brand-dark transform -rotate-3 group-hover:rotate-3 transition-transform ${benefit.color}`}>
                            <benefit.icon size={32} strokeWidth={2.5} className="text-white" />
                        </div>
                        <h3 className="font-display text-2xl uppercase mb-3">{benefit.title}</h3>
                        <p className="text-slate-600 font-medium leading-relaxed">{benefit.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-10 bg-slate-50 clip-wave-top"></div>
      </section>

      {/* GALLERY SECTION */}
      <section className="py-20 bg-slate-50 pb-10">
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
                <h2 className="font-display text-5xl md:text-6xl uppercase text-brand-dark mb-4">Action from our last <span className="text-brand-orange">Gameday</span></h2>
                <p className="text-slate-600 text-lg font-medium">Check out the highlights from our previous 3x3 tournament!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/684beea82809a956fb064bb7.jpeg",
                    "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/684beea8e3c4094b2bc7b7eb.jpeg",
                    "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/684beea807bcd3785d5c9dd2.jpeg",
                    "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/684beea807bcd3f1995c9dcb.jpeg"
                ].map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-4 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all duration-300 transform hover:-translate-y-1 group">
                        <img 
                            src={src} 
                            alt={`3x3 Gameday Action ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* FAQS */}
      <section className="py-20 bg-slate-50 pt-10">
        <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-16">
                <h2 className="font-display text-5xl md:text-6xl uppercase text-brand-dark mb-4">Frequently Asked Questions</h2>
                <p className="text-slate-600 text-lg font-medium">Everything you need to know about the 3x3 Gameday.</p>
            </div>

            <div className="space-y-6">
                {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-brand-dark shadow-sm hover:shadow-sticker transition-shadow duration-300">
                        <h3 className="font-display text-2xl uppercase text-brand-dark mb-3 flex items-start gap-3">
                            <span className="text-brand-orange">Q.</span> {faq.question}
                        </h3>
                        <p className="text-slate-600 font-medium text-lg leading-relaxed pl-8">
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-brand-orange text-center border-t-4 border-brand-dark">
        <div className="container mx-auto px-4">
            <h2 className="font-display text-5xl md:text-7xl uppercase text-brand-dark mb-6">Ready for some action?</h2>
            <p className="text-2xl font-bold text-brand-dark mb-10 max-w-2xl mx-auto">
                Don't miss out on this opportunity to be a part of our exciting 3x3 basketball gameday.
            </p>
            {settings.isLive ? (
              <>
                <a 
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-brand-dark text-white border-4 border-brand-dark px-12 py-5 rounded-full font-display text-2xl uppercase tracking-wide transition-all shadow-sticker hover:shadow-sticker-hover hover:-translate-y-1"
                >
                    REGISTER NOW <ArrowRight size={28} strokeWidth={3} />
                </a>
                <p className="text-brand-dark mt-6 font-bold text-sm uppercase tracking-wider">
                    Registration closes {settings.registrationCloses}
                </p>
              </>
            ) : (
              <div className="inline-block transform rotate-1">
                <div className="bg-brand-dark text-white px-12 py-5 rounded-full font-display text-2xl uppercase tracking-wide shadow-sticker border-4 border-brand-dark">
                  NEXT EVENT COMING SOON
                </div>
              </div>
            )}
        </div>
      </section>
    </div>
  );
};
