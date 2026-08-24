
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, ArrowRight, Smartphone, Mail, User, MapPin, AlignLeft, FileText, Info, Award, Clock, PoundSterling } from 'lucide-react';

interface JobDescription {
  title: string;
  location: string;
  salary: string;
  pattern: string;
  type: string;
  role: string;
  responsibilities: string[];
  requirements: string[];
  benefits?: string[];
}

const JOB_DESCRIPTIONS: Record<string, JobDescription> = {
  'Head Coach': {
    title: 'Head Coach (Basketball)',
    location: 'High Wycombe, Aylesbury and/or Bicester',
    salary: '£25 - £30p/h (DoE)',
    pattern: '2 hours per session',
    type: 'Part Time, Term Times only',
    role: 'You will lead on all aspects of delivery of engaging sessions, ensure safe, fun and compliant sessions and provide oversight, leadership, and development of Assistant Coaches. You\'ll have the opportunity to learn, grow and ultimately impart basketball knowledge and wisdom to the next generation.',
    responsibilities: [
      'Plan and deliver high-quality Coaching sessions to young people aged 5-13 years old',
      'Maintain session registers and ensure all students are present',
      'Prepare for each session and maintain progressive session plans',
      'Track students\' development and give feedback to help them reach goals',
      'Regularly review and update risk assessments',
      'Manage and support the development of Assistant Coaches',
      'Ensure all activity equipment is kept in good condition and stored safely',
      'Efficiently manage queries or problems from staff, parents, or agents',
      'Assess students\' standards and arrange suitable ability groups',
      'Take ownership for all students\' safety, welfare, and behaviour',
      'Report back to the Managing Director with session issues or successes',
      'Attend monthly Head Coach Zoom meetings'
    ],
    requirements: [
      'At least 2 years of basketball coaching experience',
      'Previous experience managing other coaches',
      'Full and clean DBS',
      'Ability to engage with young people and provide fun sessions',
      'Good basketball game knowledge and repertoire of skills games',
      'Good administration skills (risk assessments, session plans)',
      'Good industry knowledge and ability to stay abreast of news'
    ]
  },
  'Assistant Coach': {
    title: 'Assistant Coach (Basketball)',
    location: 'High Wycombe, Aylesbury and/or Bicester',
    salary: '£15p/h (DoE)',
    pattern: '1 hour 45 minutes per session',
    type: 'Part Time, Term Times only',
    role: 'You will support Head Coaches on all aspects of delivery of engaging sessions, ensure safe, fun and compliant sessions. In this role, you\'ll have the opportunity to learn, grow and ultimately impart basketball knowledge and wisdom to the next generation.',
    responsibilities: [
      'Support the Head Coach with planning and delivery of sessions',
      'Support with session registers',
      'Assist in preparing and concluding sessions (equipment deployment/retrieval)',
      'Support Head Coaches with review of risk assessments',
      'Ensure all activity equipment is kept in good condition and stored safely',
      'Support in the management of queries or problems',
      'Assess students\' standards and arrange suitable ability groups',
      'Take ownership for all students\' safety, welfare, and behaviour',
      'Report back to the Head Coach with any session issues or successes'
    ],
    requirements: [
      'At least 6 months of basketball coaching experience',
      'Full and clean DBS',
      'Ability to engage with young people and provide fun sessions',
      'Good basketball game knowledge and repertoire of skills games',
      'Good administration skills',
      'Good industry knowledge'
    ]
  },
  'Volunteer Coach': {
    title: 'Volunteer Assistant Coach',
    location: 'Various Hoop Heroes Locations',
    salary: 'Voluntary (Service-Linked Membership Credit)',
    pattern: 'Flexible, based on session availability',
    type: 'Voluntary, Term Times only',
    role: 'Support Head Coaches in delivering engaging basketball sessions for young people aged 5-13. This role serves as a primary talent pipeline for future paid employment through our "Growth from Within" philosophy. We proudly support Duke of Edinburgh (DofE) participants and provide outstanding junior assistant coaching opportunities.',
    responsibilities: [
      'Support the Head Coach with planning and delivery of high-quality coaching sessions',
      'Support with session registers',
      'Assist in preparing and concluding sessions (equipment deployment/retrieval)',
      'Adhere to Hoop Heroes Code of Conduct and directions of Head Coaches',
      'Submit availability monthly (7 days prior to sessions)',
      'Provide "Status Confirmation" 48 hours prior to first session of the week',
      'Notify Head Coach directly in the event of an unavoidable emergency',
      'Comply with health and safety, data protection, and safeguarding policies'
    ],
    requirements: [
      'Enhanced DBS check (where applicable; administrative cost covered by volunteer)',
      'Commitment to the "Hoop Heroes" curriculum and core values',
      'Reliability and professional commitment to the coaching pathway',
      'Ability to act as a positive role model for young people'
    ],
    benefits: [
      'One complimentary membership space for a child for each session assisted ("Credit" model)',
      'Ongoing mentorship from the Head Coach',
      'Access to proprietary [Hoop Heroes] coaching framework',
      'Priority interview for paid vacancies after 6 months of service',
      'Informal termly progress reviews on technical knowledge and session management',
      'Duke of Edinburgh (DofE) volunteering hours sign-off & supporting references',
      'Dedicated Junior Assistant Coaching pathways & certificates'
    ]
  }
};

export const Careers: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    about: '',
    source_location: 'Careers Global'
  });

  useEffect(() => {
    // Detect URL path for location tagging
    const path = window.location.pathname.split('/').filter(Boolean).pop() || 'Careers';
    setFormData(prev => ({ ...prev, source_location: path }));
  }, []);

  const handleApplyClick = (role: string) => {
    setSelectedRole(role);
    setIsModalOpen(true);
    setIsSubmitted(false);
    // Reset form when opening
    setFormData(prev => ({
      ...prev,
      name: '',
      email: '',
      phone: '',
      location: '',
      about: ''
    }));
  };

  const handleViewJD = (role: string) => {
    setSelectedRole(role);
    setIsJDModalOpen(true);
  };

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
          type: 'careers',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          about: formData.about,
          role: selectedRole
        })
      });

      const result = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        console.error('Submission failed:', result);
        setSubmitError(result.details || result.error || 'Failed to send application. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const jd = selectedRole ? JOB_DESCRIPTIONS[selectedRole] : null;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-dark">
      {/* Header Hero */}
      <div className="bg-brand-dark text-white pt-32 pb-24 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-pattern-grid"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-block bg-brand-orange text-brand-dark px-6 py-2 rounded-lg font-display text-xl uppercase transform -rotate-2 mb-6 border-2 border-brand-dark shadow-sticker">
            COACHING OPPORTUNITIES
          </div>
          <h1 className="font-display text-6xl md:text-8xl uppercase mb-6 drop-shadow-lg leading-none">
            JOIN THE <br /> <span className="text-brand-orange">TEAM</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-medium">
            Help us inspire the heroes of tomorrow. We are looking for passionate people to join our mission of impacting 10,000 children every single week through basketball.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-12 bg-white clip-wave-top"></div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl pb-20">
        <div className="grid grid-cols-1 gap-10">

          {/* Head Coach */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sticker border-4 border-brand-dark flex flex-col md:flex-row items-center justify-between gap-8 group hover:-translate-y-1 transition-all">
            <div className="flex-1">
              <div className="inline-block bg-brand-orange text-brand-dark px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                New Locations
              </div>
              <h3 className="font-display text-4xl text-brand-dark uppercase mb-4">Head Coach</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Help us expand Hoop Heroes across the UK! Head Coach opportunities are focused on launching programs in new territories and building local communities.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => handleViewJD('Head Coach')}
                className="px-8 py-3 bg-white text-brand-dark font-display text-lg uppercase rounded-xl border-2 border-brand-dark hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={20} /> View Details
              </button>
              <button
                onClick={() => handleApplyClick('Head Coach')}
                className="px-8 py-4 bg-brand-dark text-white font-display text-xl uppercase rounded-xl shadow-sticker group-hover:bg-brand-orange group-hover:text-brand-dark transition-colors border-2 border-brand-dark"
              >
                Apply Now
              </button>
            </div>
          </div>

          {/* Assistant Coach */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sticker border-4 border-brand-dark flex flex-col md:flex-row items-center justify-between gap-8 group hover:-translate-y-1 transition-all">
            <div className="flex-1">
              <div className="inline-block bg-brand-dark text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                Current Hubs
              </div>
              <h3 className="font-display text-4xl text-brand-dark uppercase mb-4">Assistant Coach</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Positions available at our current locations across the UK. Support our Head Coaches in delivering world-class basketball training.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => handleViewJD('Assistant Coach')}
                className="px-8 py-3 bg-white text-brand-dark font-display text-lg uppercase rounded-xl border-2 border-brand-dark hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={20} /> View Details
              </button>
              <button
                onClick={() => handleApplyClick('Assistant Coach')}
                className="px-8 py-4 bg-brand-dark text-white font-display text-xl uppercase rounded-xl shadow-sticker group-hover:bg-brand-orange group-hover:text-brand-dark transition-colors border-2 border-brand-dark"
              >
                Apply Now
              </button>
            </div>
          </div>

          {/* Volunteer Coach */}
          <div className="bg-brand-light p-10 rounded-[2.5rem] shadow-sticker border-4 border-brand-dark flex flex-col md:flex-row items-center justify-between gap-8 group hover:-translate-y-1 transition-all">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Volunteer & Learn
                </div>
                <div className="inline-block bg-brand-orange text-brand-dark px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-brand-dark">
                  DofE Approved
                </div>
              </div>
              <h3 className="font-display text-4xl text-brand-dark uppercase mb-4">Volunteer Coach</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium mb-4">
                Volunteer to support our sessions! Perfect for <strong>parents</strong> wanting to get involved (and receive a <strong>complimentary membership</strong> for their child), <strong>Duke of Edinburgh (DofE) candidates</strong> looking for volunteering placements, or young ballers seeking <strong>junior assistant coaching opportunities</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => handleViewJD('Volunteer Coach')}
                className="px-8 py-3 bg-white text-brand-dark font-display text-lg uppercase rounded-xl border-2 border-brand-dark hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={20} /> View Details
              </button>
              <button
                onClick={() => handleApplyClick('Volunteer Coach')}
                className="px-8 py-4 bg-brand-dark text-white font-display text-xl uppercase rounded-xl shadow-sticker group-hover:bg-blue-600 transition-colors border-2 border-brand-dark"
              >
                Get Involved
              </button>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center p-8 md:p-12 bg-brand-dark text-white rounded-[3rem] border-4 border-brand-dark shadow-sticker">
          <h2 className="font-display text-2xl md:text-4xl uppercase mb-4 leading-tight">Think you can help the team <br className="hidden md:block" /> in another way?</h2>
          <p className="text-slate-300 text-base md:text-lg mb-8 font-medium max-w-3xl mx-auto">
            If you have unique talents that could accelerate our #10K🏀UK mission, we want to hear from you. Whether you're a creative social storyteller, a school outreach expert, or have other specialized strengths—if you can help us grow, let's talk!
          </p>
          <a href="mailto:careers@hoopheroes.co.uk" className="text-brand-orange font-display text-xl md:text-3xl uppercase hover:underline decoration-4 break-words inline-block max-w-full">
            careers@hoopheroes.co.uk
          </a>
        </div>
      </div>

      {/* JOB DESCRIPTION MODAL */}
      {isJDModalOpen && jd && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-md transition-opacity">
          <div className="bg-white border-4 border-brand-dark rounded-[2.5rem] shadow-2xl p-6 md:p-10 max-w-3xl w-full relative animate-fade-in overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsJDModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors z-20"
            >
              <X size={24} className="text-brand-dark" />
            </button>

            <div className="mb-8">
              <div className="inline-block bg-brand-orange text-brand-dark px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                Job Specification
              </div>
              <h3 className="font-display text-4xl md:text-5xl text-brand-dark uppercase mb-4">{jd.title}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3 text-slate-600 font-bold">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-dark shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Location</p>
                    <p>{jd.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-dark shrink-0">
                    <PoundSterling size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Salary/Reward</p>
                    <p>{jd.salary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-dark shrink-0">
                    <Clock size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Working Pattern</p>
                    <p>{jd.pattern}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-brand-dark shrink-0">
                    <Award size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Job Type</p>
                    <p>{jd.type}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="font-display text-2xl text-brand-dark uppercase mb-3 flex items-center gap-2">
                    <Info size={24} className="text-brand-orange" /> The Role
                  </h4>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {jd.role}
                  </p>
                </section>

                <section>
                  <h4 className="font-display text-2xl text-brand-dark uppercase mb-3">Key Responsibilities</h4>
                  <ul className="space-y-3">
                    {jd.responsibilities.map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-600 font-medium leading-relaxed">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4 className="font-display text-2xl text-brand-dark uppercase mb-3">Experience & Qualifications</h4>
                  <ul className="space-y-3">
                    {jd.requirements.map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-600 font-medium leading-relaxed">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-dark shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {jd.benefits && (
                  <section className="bg-brand-light p-6 rounded-2xl border-2 border-brand-dark">
                    <h4 className="font-display text-2xl text-brand-dark uppercase mb-3">Benefits & Pathway</h4>
                    <ul className="space-y-3">
                      {jd.benefits.map((item, i) => (
                        <li key={i} className="flex gap-3 text-brand-dark font-bold leading-relaxed">
                          <CheckCircle size={18} className="text-brand-orange shrink-0 mt-1" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-10 pt-8 border-t-2 border-slate-100">
              <button
                onClick={() => {
                  setIsJDModalOpen(false);
                  handleApplyClick(selectedRole);
                }}
                className="flex-1 bg-brand-dark text-white font-display text-2xl uppercase py-4 rounded-xl shadow-sticker hover:bg-brand-orange hover:text-brand-dark transition-all"
              >
                Apply for this role
              </button>
              <button
                onClick={() => setIsJDModalOpen(false)}
                className="px-8 py-4 border-2 border-slate-200 text-slate-400 font-display text-xl uppercase rounded-xl hover:bg-slate-50 hover:text-brand-dark hover:border-brand-dark transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-md transition-opacity">
          <div className="bg-white border-4 border-brand-dark rounded-[2.5rem] shadow-2xl p-8 md:p-10 max-w-2xl w-full relative animate-fade-in overflow-y-auto max-h-[95vh]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={24} className="text-brand-dark" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-200">
                  <CheckCircle size={40} />
                </div>
                <h3 className="font-display text-3xl text-brand-dark uppercase mb-3">Application Sent!</h3>
                <p className="text-slate-600 font-medium mb-8">
                  Thank you for applying for the <strong>{selectedRole}</strong> role. Our team will review your details and be in touch shortly.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-brand-dark text-white font-display text-xl uppercase py-4 rounded-xl shadow-sticker hover:bg-brand-orange hover:text-brand-dark transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="font-display text-3xl text-brand-dark uppercase mb-2">Apply for {selectedRole}</h3>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Join the #10K🏀UK Movement</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Hidden location tracking */}
                  <input type="hidden" name="source_location" value={formData.source_location} />
                  
                  {submitError && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-bold animate-fade-in">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-brand-dark ml-2 tracking-widest">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          required
                          type="text"
                          placeholder="Your name"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-brand-dark ml-2 tracking-widest">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          required
                          type="email"
                          placeholder="name@example.com"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-brand-dark ml-2 tracking-widest">Phone Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          required
                          type="tel"
                          placeholder="Mobile number"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-brand-dark ml-2 tracking-widest">Preferred Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          required
                          type="text"
                          placeholder="e.g. Bicester, Oxford"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-brand-dark ml-2 tracking-widest">Tell us about yourself</label>
                    <div className="relative">
                      <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
                      <textarea
                        required
                        placeholder="Tell us about your experience and why you'd like to join the team..."
                        rows={4}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-orange outline-none font-bold text-brand-dark transition-colors resize-none"
                        value={formData.about}
                        onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      ></textarea>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-dark text-white font-display text-2xl uppercase py-5 rounded-xl shadow-sticker hover:bg-brand-orange hover:text-brand-dark transition-all flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none mt-4"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={24} /> Sending...</>
                    ) : (
                      <>Submit Application <ArrowRight size={24} /></>
                    )}
                  </button>
                </form>
                <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Details sent to careers@hoopheroes.co.uk
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
