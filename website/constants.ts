import { LocationData, DayOfWeek } from './types';

// NOTE: The bookingWidgetUrl uses the specific TeamUp URL with the venue ID filter.

export const LOCATIONS: LocationData[] = [
  {
    id: 'loc_bicester',
    name: 'Bicester',
    slug: 'bicester',
    address: 'Whitelands Academy, Hexham Road, Bicester OX26 1AY',
    displayDays: 'Saturdays',
    coordinates: { lat: 51.8856, lng: -1.1665 },
    phone: '07700 140 500',
    email: 'bicester@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/697288c02edc00cf60089781.jpg', 
    gallery: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800', 
        'https://images.unsplash.com/photo-1518407613690-d9fc990e795f?auto=format&fit=crop&q=80&w=800'
    ],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0', 
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=53603',
    headCoach: {
      name: 'Christie Lothamer',
      role: 'Head Coach',
      bio: 'Former BBL player dedicated to building fundamental skills in young athletes.',
      imageUrl: 'https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/69dca2fa982fd67a35c128e2.jpeg',
      quote: "Master the basics, become exceptional. I believe fundamentals unlock greatness—not just in basketball, but in character. I coach for development you can see on the court and growth that lasts far beyond it, making every session a moment your child looks forward to all week."
    },
    classes: [
      { id: 'c1_b', day: DayOfWeek.SATURDAY, time: '11:30 - 12:00', ageGroup: 'Rookies (Age 5-7)', venue: 'Main Sports Hall', spotsAvailable: 12 },
      { id: 'c2_b', day: DayOfWeek.SATURDAY, time: '12:00 - 12:45', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Main Sports Hall', spotsAvailable: 8 },
      { id: 'c3_b', day: DayOfWeek.SATURDAY, time: '12:45 - 13:30', ageGroup: 'Ballers (Age 12-15)', venue: 'Main Sports Hall', spotsAvailable: 5 },
    ],
    reviews: [
        { author: 'Sarah Jenkins', rating: 5, text: 'My son has gained so much confidence since joining Hoop Heroes Bicester. The coaches are fantastic!', relativeTime: '2 weeks ago' },
        { author: 'Mark Thompson', rating: 5, text: 'Great facilities at Whitelands and structured sessions. Highly recommend.', relativeTime: '1 month ago' },
        { author: 'Emma Louise', rating: 4, text: 'Fun environment, my daughter looks forward to it every Saturday.', relativeTime: '3 weeks ago' }
    ]
  },
  {
    id: 'loc_marlow',
    name: 'Marlow',
    slug: 'marlow',
    address: 'Redgrave Sports Centre, Wycombe Road, Marlow SL7 1JE',
    displayDays: 'Sundays',
    coordinates: { lat: 51.5758, lng: -0.7698 },
    phone: '07700 140 500',
    email: 'marlow@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69728b022b73e1f0bbf3bafd.jpg', 
    gallery: ['https://images.unsplash.com/photo-1628779238951-be2c9f2a59f4?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48473',
    headCoach: {
      name: 'Jay White',
      role: 'Head Coach',
      bio: 'Specialist in youth athletic development and team strategy.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/639813a7978abccc059e5c4c.jpeg?w=200&q=80&auto=format'
    },
    classes: [
      { id: 'c3', day: DayOfWeek.SUNDAY, time: '10:00 - 10:30', ageGroup: 'Rookies (Age 5-7)', venue: 'Gymnasium', spotsAvailable: 12 },
      { id: 'c4', day: DayOfWeek.SUNDAY, time: '10:30 - 11:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Gymnasium', spotsAvailable: 10 },
      { id: 'c4b', day: DayOfWeek.SUNDAY, time: '11:15 - 12:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Gymnasium', spotsAvailable: 8 },
    ],
    reviews: [
        { author: 'David Wright', rating: 5, text: 'Coach Sarah is amazing with the kids. Best basketball club in Marlow!', relativeTime: '1 week ago' },
        { author: 'Lisa P.', rating: 5, text: 'Both my boys attend and absolutely love it. Great skill development.', relativeTime: '2 months ago' }
    ]
  },
  {
    id: 'loc_holmer',
    name: 'Holmer Green',
    slug: 'holmer-green',
    address: 'Holmer Green Senior School, HP15 6SP',
    displayDays: 'Tuesdays',
    coordinates: { lat: 51.6667, lng: -0.7097 },
    phone: '07700 140 500',
    email: 'holmergreen@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6973177410cc277cf941ed76.jpg',
    gallery: ['https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48474,48651',
    scheduleNotice: "Term times only. During exams, Sir William Ramsey School, Hazlemere (HP15 7UB) is used as a backup. Please check the booking calendar below for up-to-date location details.",
    locationNotes: "IMPORTANT: During exams, Sir William Ramsey School, Rose Avenue, Hazlemere, HP15 7UB is used as a backup. Please check the booking calendar below for up-to-date location details.",
    headCoach: {
      name: 'Ben Cousin',
      role: 'Head Coach',
      bio: 'Passionate about creating a fun, inclusive environment for beginners.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060a7fd16d726a6869.png?w=200&q=80&auto=format'
    },
    classes: [
      { id: 'c5', day: DayOfWeek.TUESDAY, time: '17:30 - 18:15', ageGroup: 'Rookies (Age 5-7)', venue: 'Main Hall', spotsAvailable: 8 },
      { id: 'c5b', day: DayOfWeek.TUESDAY, time: '17:30 - 18:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Main Hall', spotsAvailable: 6 },
      { id: 'c5c', day: DayOfWeek.TUESDAY, time: '18:15 - 19:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Main Hall', spotsAvailable: 10 },
    ],
    reviews: [
        { author: 'Pauline K.', rating: 5, text: 'A wonderful local club. David is so patient with the little ones.', relativeTime: '3 weeks ago' },
        { author: 'James H.', rating: 4, text: 'Good exercise and fun games. My son sleeps well after the Tuesday session!', relativeTime: '1 month ago' }
    ]
  },
  {
    id: 'loc_wendover',
    name: 'Wendover',
    slug: 'wendover',
    address: 'John Colet School, Wharf Road, Wendover HP22 6HF',
    displayDays: 'Sundays',
    coordinates: { lat: 51.7663, lng: -0.7380 },
    phone: '07700 140 500',
    email: 'wendover@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69731819c1fa0c842f0269ba.jpg',
    gallery: ['https://images.unsplash.com/photo-1533561052665-769092b9c546?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=65944',
    mapQueryOverride: 'John Colet School, Wharf Road, Wendover HP22 6HF',
    googleMapsUrl: 'https://maps.app.goo.gl/685V8faPAYshtuXv5',
    locationNotes: 'From the car park, walk past the swimming pool and youth centre, through the gate to the Sports Hall.',
    headCoach: {
      name: 'Johnny Hayward',
      role: 'Head Coach',
      bio: 'Experienced coach specializing in fundamental mechanics and teamwork.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060708e46a13ca89fb.png?w=200&q=80&auto=format',
      quote: "I love coaching basketball because teamwork brings players together, helping them learn how to support each other both on and off the court."
    },
    classes: [
      { id: 'c10_w', day: DayOfWeek.SUNDAY, time: '09:00 - 09:30', ageGroup: 'Rookies (Age 5-7)', venue: 'John Colet School', spotsAvailable: 10 },
      { id: 'c10b_w', day: DayOfWeek.SUNDAY, time: '09:30 - 10:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'John Colet School', spotsAvailable: 8 },
      { id: 'c10c_w', day: DayOfWeek.SUNDAY, time: '10:15 - 11:00', ageGroup: 'Ballers (Age 12-15)', venue: 'John Colet School', spotsAvailable: 4 },
    ],
    reviews: [
        { author: 'Claire B.', rating: 5, text: 'My daughter started 3 weeks ago and loves it. Very organized.', relativeTime: '5 days ago' },
        { author: 'Tom Richards', rating: 5, text: 'Excellent coaching staff and facilities.', relativeTime: '2 weeks ago' },
        { author: 'Gemma S.', rating: 5, text: 'Perfect for beginners. No pressure, just fun basketball.', relativeTime: '1 month ago' }
    ]
  },
  {
    id: 'loc_tring',
    name: 'Tring',
    slug: 'tring',
    address: 'Tring Sports Centre, Tring School, Mortimer Hill, Tring HP23 5JD',
    displayDays: 'Sundays',
    coordinates: { lat: 51.7963, lng: -0.6623 },
    phone: '07700 140 500',
    email: 'tring@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6973181ad4fb90acfd48f411.jpg',
    gallery: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48475',
    headCoach: {
      name: 'Johnny Hayward',
      role: 'Head Coach',
      bio: 'Former national league player focused on developing agility and game intelligence.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060708e46a13ca89fb.png?w=200&q=80&auto=format',
      quote: "I love coaching basketball because teamwork brings players together, helping them learn how to support each other both on and off the court."
    },
    classes: [
      { id: 'c8', day: DayOfWeek.SUNDAY, time: '16:00 - 16:30', ageGroup: 'Rookies (Age 5-7)', venue: 'Sports Hall', spotsAvailable: 10 },
      { id: 'c9', day: DayOfWeek.SUNDAY, time: '16:30 - 17:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Sports Hall', spotsAvailable: 6 },
      { id: 'c9b', day: DayOfWeek.SUNDAY, time: '17:15 - 18:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Sports Hall', spotsAvailable: 8 },
    ],
    reviews: [
        { author: 'Rebecca W.', rating: 5, text: 'Tring has needed a club like this for ages! Thank you Hoop Heroes.', relativeTime: '2 weeks ago' },
        { author: 'Simon T.', rating: 5, text: 'Great energy from Marcus. The kids respect him and learn fast.', relativeTime: '3 weeks ago' }
    ]
  },
  {
    id: 'loc_aylesbury',
    name: 'Aylesbury',
    slug: 'aylesbury',
    address: 'The Mandeville School, Ellen Road, Aylesbury HP21 8ED',
    displayDays: 'Mondays',
    coordinates: { lat: 51.8103, lng: -0.8123 },
    phone: '07700 140 500',
    email: 'aylesbury@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69731819eb392b0f31c33b74.jpg',
    gallery: ['https://images.unsplash.com/photo-1518407613690-d9fc990e795f?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48411,53172,50233,65944',
    mapQueryOverride: "The Mandeville School, Aylesbury",
    headCoach: {
      name: 'Johnny Hayward',
      role: 'Head Coach',
      bio: 'Experienced coach specializing in fundamental mechanics and teamwork.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060708e46a13ca89fb.png?w=200&q=80&auto=format',
      quote: "I love coaching basketball because teamwork brings players together, helping them learn how to support each other both on and off the court."
    },
    classes: [
      { id: 'c10_m', day: DayOfWeek.MONDAY, time: '17:30 - 18:15', ageGroup: 'Rookies (Age 5-7)', venue: 'Main Sports Hall', spotsAvailable: 12 },
      { id: 'c10b_m', day: DayOfWeek.MONDAY, time: '17:30 - 18:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Main Sports Hall', spotsAvailable: 10 },
      { id: 'c10c_m', day: DayOfWeek.MONDAY, time: '18:15 - 19:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Main Sports Hall', spotsAvailable: 8 },
    ],
    reviews: [
        { author: 'Sarah J.', rating: 5, text: 'The Sunday morning sessions are brilliant. Starts the day off right!', relativeTime: '1 month ago' },
        { author: 'Mike L.', rating: 4, text: 'Good coaching, very inclusive.', relativeTime: '2 months ago' }
    ]
  },
  {
    id: 'loc_missenden',
    name: 'Great Missenden',
    slug: 'great-missenden',
    address: 'The Misbourne School, Misbourne Drive, Great Missenden HP16 0BN',
    displayDays: 'Mondays',
    coordinates: { lat: 51.7031, lng: -0.7089 },
    phone: '07700 140 500',
    email: 'missenden@hoopheroes.co.uk',
    heroImage: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6973181910cc27fcd442039b.jpg',
    gallery: ['https://images.unsplash.com/photo-1505666287802-931dc839ce8b?auto=format&fit=crop&q=80&w=800'],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48649',
    locationNotes: "Don't go down Whitefield lane/Misbourne Drive to the main school entrance. Instead stay on the London Road and look for the large gates which will be open for access to the sports hall.",
    headCoach: {
      name: 'Ben Cousin',
      role: 'Head Coach',
      bio: 'Energetic coach with a passion for making basketball fun for everyone.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060a7fd16d726a6869.png?w=200&q=80&auto=format'
    },
    classes: [
      { id: 'c11', day: DayOfWeek.MONDAY, time: '17:30 - 18:15', ageGroup: 'Rookies (Age 5-7)', venue: 'Sports Hall', spotsAvailable: 12 },
      { id: 'c12', day: DayOfWeek.MONDAY, time: '17:30 - 18:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Sports Hall', spotsAvailable: 8 },
      { id: 'c13', day: DayOfWeek.MONDAY, time: '18:15 - 19:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Sports Hall', spotsAvailable: 8 },
    ],
    reviews: [
        { author: 'Jenny M.', rating: 5, text: 'Alex is fantastic with the kids. Highly recommend!', relativeTime: '3 days ago' },
        { author: 'Robert C.', rating: 5, text: 'My son has made so many friends here.', relativeTime: '1 week ago' }
    ]
  },
  {
    id: 'loc_oxford',
    name: 'Oxford',
    slug: 'oxford',
    address: 'The Oxford Academy, Sandy Lane West, Littlemore, Oxford OX4 6JZ',
    coordinates: { lat: 51.723, lng: -1.218 },
    phone: '07700 140 500',
    email: 'oxford@hoopheroes.co.uk',
    heroImage: 'https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/6973181ad4fb90acfd48f411.jpg',
    gallery: [],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=65416',
    headCoach: {
      name: 'Paul Swanton',
      role: 'Head Coach',
      bio: 'Passionate about developing young athletes and building confidence on the court.',
      imageUrl: 'https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/69b58668bfc81f012817d2ee.png'
    },
    classes: [
      { id: 'c1_ox', day: DayOfWeek.SUNDAY, time: '10:00 - 10:30', ageGroup: 'Rookies (Age 5-7)', venue: 'Sports Hall', spotsAvailable: 12 },
      { id: 'c2_ox', day: DayOfWeek.SUNDAY, time: '10:30 - 11:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Sports Hall', spotsAvailable: 10 },
      { id: 'c3_ox', day: DayOfWeek.SUNDAY, time: '11:15 - 12:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Sports Hall', spotsAvailable: 8 },
    ],
    comingSoon: false,
    displayDays: 'Sundays',
    scheduleNotice: 'Classes run every Sunday during term time. Please check the booking calendar below for up to date information.',
    ghlTag: "Oxford Earlybird",
    startDate: '2026-05-03'
  },
  {
    id: 'loc_sandhurst',
    name: 'Sandhurst',
    slug: 'sandhurst',
    address: 'Sandhurst School, Owlsmoor Road, Sandhurst, Berkshire, GU47 0SD',
    coordinates: { lat: 51.3533, lng: -0.7816 },
    phone: '07700 140 500',
    email: 'sandhurst@hoopheroes.co.uk',
    heroImage: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=1920',
    gallery: [],
    actionVideoUrl: 'https://www.youtube-nocookie.com/embed/ENWlnbItCc0?si=80euwZHd7QVRV-Dg&controls=0',
    bookingWidgetUrl: 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=66611',
    locationNotes: "We run in the sports hall at Sandhurst School, Owlsmoor Road, Sandhurst, GU47 0SD. On site it's signposted Sandhurst Sports Centre – follow those signs, not the school ones.\n\nDon't go to the main school entrance or reception – it's closed on Sundays and there's no way through to the hall from there. Coming along Owlsmoor Road, the turning for the sports hall is on your right, just before the main school entrance. Follow the Sports Centre signs into the car park; the hall entrance is right there.\n\nParking is free and plentiful. Please arrive a few minutes early so your child can sign in with the coach before the session starts.",
    headCoach: {
      name: 'Coach Vern',
      role: 'Head Coach',
      bio: 'Passionate about teaching the fundamentals of basketball, developing young athletes, and fostering teamwork.',
      imageUrl: 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/69845c060708e4c2dcca89fc.png?w=200&q=80&auto=format',
      quote: "Passionate about teaching the fundamentals of basketball, encompassing Hoop heroes core values and developing life skills including teamwork, communication and confidence."
    },
    classes: [
      { id: 'c1_sh', day: DayOfWeek.SUNDAY, time: '09:00 - 09:30', ageGroup: 'Rookies (Age 5-7)', venue: 'Sports Hall', spotsAvailable: 10 },
      { id: 'c2_sh', day: DayOfWeek.SUNDAY, time: '09:30 - 10:15', ageGroup: 'Rising Stars (Age 8-11)', venue: 'Sports Hall', spotsAvailable: 10 },
      { id: 'c3_sh', day: DayOfWeek.SUNDAY, time: '10:15 - 11:00', ageGroup: 'Ballers (Age 12-15)', venue: 'Sports Hall', spotsAvailable: 8 },
    ],
    comingSoon: false,
    displayDays: 'Sundays',
    scheduleNotice: 'Classes run every Sunday during term time. Please check the booking calendar below for up to date information.',
    ghlTag: "Sandhurst Earlybird"
  }
];