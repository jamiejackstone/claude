import React from 'react';
import { Target, Heart, Smartphone, Zap, Trophy, Users } from 'lucide-react';
import { LOCATIONS } from '../constants';

export const Mission: React.FC = () => {
  // Use the specific URL requested for Jamie Stone's founder image
  const jamieStoneImage = "https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/655dd65f83afca15657be62a.jpeg";

  return (
    <div className="min-h-screen bg-white font-sans text-brand-dark selection:bg-brand-orange selection:text-brand-dark">
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-24 bg-brand-dark text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
            <img 
                src="https://images.unsplash.com/photo-1519861531473-9200263931a2?auto=format&fit=crop&q=80&w=1920" 
                className="w-full h-full object-cover" 
                alt="Hoop Heroes Mission" 
                loading="lazy"
            />
            <div className="absolute inset-0 bg-brand-dark/50 mix-blend-multiply"></div>
        </div>
        
        {/* Organic Wave Bottom */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-white clip-wave-top z-10"></div>

        <div className="container mx-auto px-4 relative z-20 text-center">
            <div className="inline-block bg-brand-orange text-brand-dark px-6 py-2 rounded-lg font-display text-xl uppercase tracking-wide transform -rotate-2 mb-8 border-2 border-brand-dark shadow-sticker">
                JOIN THE #10K🏀UK MOVEMENT
            </div>
            <h1 className="font-display text-6xl md:text-8xl uppercase mb-6 drop-shadow-lg leading-none">
                OUR <span className="text-brand-orange">MISSION</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-medium leading-tight">
                Our mission is to positively impact the lives of 10,000 children across the UK every single week through the power of basketball.
            </p>
        </div>
      </div>

      {/* The Big Goal Section */}
      <section className="pt-6 pb-12 md:pt-12 md:pb-16 bg-white relative">
        <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-12">
                    <div className="bg-brand-dark rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 text-white border-4 border-brand-dark shadow-sticker relative overflow-hidden flex flex-col justify-center min-h-0">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-orange rounded-full opacity-20 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="font-display text-5xl md:text-7xl text-brand-orange uppercase mb-1 leading-none tracking-tight">
                                10,000 Heroes
                            </h2>
                            <p className="text-xl md:text-2xl font-display text-white uppercase tracking-wide leading-tight">
                                in the UK playing basketball with us by the end of 2030
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-display text-3xl md:text-5xl uppercase mb-4 leading-tight text-brand-dark">
                            Why #10K🏀UK Matters
                        </h3>
                        <p className="text-lg text-slate-600 font-medium leading-relaxed">
                            At Hoop Heroes, we’ve always believed that we aren't just teaching basketball; we are building community, character, and growth. This movement is about more than sports—it's about the future of UK youth.
                        </p>
                    </div>
                </div>

                {/* The Why Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {[
                        { 
                            icon: Zap, 
                            title: "Character for Life", 
                            desc: "Equipping our 'Heroes' with values like Respect and Leadership that they carry long after leaving the court." 
                        },
                        { 
                            icon: Smartphone, 
                            title: "Combatting Screen Time", 
                            desc: "Providing a necessary physical outlet to move kids away from sedentary lifestyles and into active social development." 
                        },
                        { 
                            icon: Trophy, 
                            title: "Growing the World's Game", 
                            desc: "Basketball is the world's fastest-growing game. We're bridging the gap in the UK, opening doors to a global community." 
                        }
                    ].map((item, i) => (
                        <div key={i} className="bg-brand-light p-10 rounded-[2.5rem] border-4 border-brand-dark shadow-sticker hover:shadow-sticker-hover transition-all group flex flex-col h-full">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-2 border-brand-dark mb-6 transform group-hover:rotate-6 transition-transform shadow-sm">
                                <item.icon size={32} className="text-brand-orange" strokeWidth={3} />
                            </div>
                            <h3 className="font-display text-2xl uppercase mb-4 text-brand-dark leading-tight">{item.title}</h3>
                            <p className="text-slate-600 font-medium leading-relaxed flex-grow">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-brand-dark text-white relative overflow-hidden">
         {/* Top Wave */}
         <div className="absolute top-0 left-0 w-full h-16 bg-white clip-wave-bottom z-10"></div>
         
         <div className="container mx-auto px-4 relative z-20 mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <div className="inline-flex items-center gap-3 text-brand-orange font-bold uppercase tracking-wider mb-4">
                        <span className="w-12 h-1 bg-brand-orange rounded-full"></span>
                        A message from our founder
                    </div>
                    <h2 className="font-display text-5xl md:text-6xl uppercase mb-8 leading-none">
                        BECOME A <br/> <span className="text-brand-orange">HOOP HERO</span>
                    </h2>
                    
                    <div className="space-y-6 text-lg text-slate-300 leading-relaxed">
                        <p>
                            <strong className="text-white text-xl block mb-2">Join a nationwide movement dedicated to youth potential.</strong>
                        </p>
                        <p>
                            Watching our Heroes develop <span className="text-white font-bold">Confidence, Teamwork, and Perseverance</span> is why we do what we do. We believe every child has a Hero inside them, waiting to be unlocked through the right environment.
                        </p>
                        <p>
                            Choosing Hoop Heroes means choosing more than just a sports club. You're joining a supportive ecosystem where your child will be surrounded by positive role models and peers who champion character as much as skill.
                        </p>
                        <p>
                            Today, thousands of kids join us weekly to dribble, shoot, and make friends. We firmly believe that <em className="text-white">how you play the game is more important than the score</em>. Come and see the difference for yourself.
                        </p>
                    </div>
                    
                    <div className="mt-10 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-orange">
                            <img src={jamieStoneImage} alt="Jamie Stone" loading="lazy" />
                        </div>
                        <div>
                            <p className="text-brand-orange font-display uppercase text-xl font-style-italic">- Jamie Stone</p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">FOUNDER, HOOP HEROES</p>
                        </div>
                    </div>
                </div>

                <div className="order-1 lg:order-2 relative">
                    {/* Video Wrapper */}
                    <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500 bg-black aspect-video">
                        <iframe 
                            className="w-full h-full absolute inset-0"
                            src="https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0" 
                            title="A Message from Our Founder"
                            style={{ border: 0 }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </div>
                    {/* Decorative Element */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-orange rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
                </div>
            </div>
         </div>
         
         {/* Bottom Wave */}
         <div className="absolute bottom-0 left-0 w-full h-16 bg-white clip-wave-top z-10"></div>
      </section>

      <div className="h-12 bg-white"></div>
    </div>
  );
};