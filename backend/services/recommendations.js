// backend/services/recommendations.js
// Returns personalised well-being activity suggestions and music recommendations
// based on the canonical emotion label. These are general wellness suggestions,
// NOT medical advice or clinical recommendations.

const ACTIVITIES = {
  joy: [
    'Maintain your positive momentum — share your energy with someone you care about.',
    'Channel creativity: try journaling, drawing, or making music.',
    'Go for a walk and appreciate the environment around you.',
    'Celebrate small wins — acknowledge your progress today.',
    'Connect with a friend or family member to spread the positivity.',
  ],
  sadness: [
    'Write freely in your journal without judgment — expressing feelings is healthy.',
    'Take a gentle walk outdoors or do light stretching.',
    'Reach out to someone you trust and let them know how you feel.',
    'Practice self-compassion: treat yourself as you would a close friend.',
    'Try a warm cup of herbal tea and a comforting activity like reading.',
  ],
  anger: [
    'Take 5 deep breaths — inhale for 4 counts, hold for 4, exhale for 6.',
    'Step away from the situation briefly and return when calmer.',
    'Physical activity (brisk walking, stretching) can release tension.',
    'Write out what is bothering you to gain perspective.',
    'Practice progressive muscle relaxation for 5 minutes.',
  ],
  fear: [
    'Ground yourself: notice 5 things you can see, 4 you can touch, 3 you can hear.',
    'Break overwhelming tasks into the smallest possible next step.',
    'Slow, diaphragmatic breathing can reduce physiological anxiety.',
    'Talk to someone you trust about what feels uncertain.',
    'Remind yourself of past challenges you successfully navigated.',
  ],
  disgust: [
    'Create distance from the source of the feeling if it is safe to do so.',
    'Engage in a cleaning or organising activity to regain a sense of control.',
    'Mindful breathing can help regulate intense physical reactions.',
    'Reflect on what boundary or value was triggered — this can be informative.',
    'Distract with something sensory-pleasant: music, nature, or a favourite scent.',
  ],
  surprise: [
    'Give yourself a moment to process before reacting.',
    'Journal about the unexpected event to clarify your feelings.',
    'Talk to someone who might offer perspective on the situation.',
    'Focus on what you can control rather than the unexpected aspect.',
    'Practice mindful observation: sit quietly and let thoughts settle.',
  ],
  neutral: [
    'Maintain healthy daily routines: consistent sleep, meals, and movement.',
    'Use this stable moment for planning or goal-setting.',
    'Regular physical activity boosts mood and cognitive function.',
    'Practice brief daily mindfulness or meditation (even 5 minutes helps).',
    'Check in with a friend or engage in a hobby you enjoy.',
  ],
};

const MUSIC = {
  joy: {
    category: 'Uplifting & Celebratory',
    tracks: [
      { title: 'Happy – Pharrell Williams', url: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs' },
      { title: 'Walking on Sunshine – Katrina & The Waves', url: 'https://www.youtube.com/watch?v=iPUmE-tne5U' },
      { title: 'Good as Hell – Lizzo', url: 'https://www.youtube.com/watch?v=SmbmeOgGsOc' },
      { title: 'Can\'t Stop the Feeling – Justin Timberlake', url: 'https://www.youtube.com/watch?v=ru0K8uYEZWw' },
    ],
  },
  sadness: {
    category: 'Gentle & Comforting',
    tracks: [
      { title: 'The Night We Met – Lord Huron', url: 'https://www.youtube.com/watch?v=KtlgYxa6BMU' },
      { title: 'Fix You – Coldplay', url: 'https://www.youtube.com/watch?v=k4V3Mo61fJM' },
      { title: 'Skinny Love – Bon Iver', url: 'https://www.youtube.com/watch?v=ssdgFoHLwnk' },
      { title: 'Holocene – Bon Iver', url: 'https://www.youtube.com/watch?v=TWcyIpul8OE' },
    ],
  },
  anger: {
    category: 'Calming & Grounding',
    tracks: [
      { title: 'Breathe (2 AM) – Anna Nalick', url: 'https://www.youtube.com/watch?v=GZzJJeOovpE' },
      { title: 'Weightless – Marconi Union', url: 'https://www.youtube.com/watch?v=UfcAVejslrU' },
      { title: 'Bloom – The Paper Kites', url: 'https://www.youtube.com/watch?v=8DC8f2NN1Ys' },
      { title: 'White Flag – Joseph', url: 'https://www.youtube.com/watch?v=3cFSMGaFgG8' },
    ],
  },
  fear: {
    category: 'Reassuring & Peaceful',
    tracks: [
      { title: 'Safe and Sound – Taylor Swift', url: 'https://www.youtube.com/watch?v=uelHwf8o7_U' },
      { title: 'Everything\'s Not Lost – Coldplay', url: 'https://www.youtube.com/watch?v=vmlhNxYf6DA' },
      { title: 'Shelter – Porter Robinson & Madeon', url: 'https://www.youtube.com/watch?v=fzQ6gRAEoy0' },
      { title: 'Somewhere Only We Know – Keane', url: 'https://www.youtube.com/watch?v=Oalberto8QyX4' },
    ],
  },
  disgust: {
    category: 'Cleansing & Refreshing',
    tracks: [
      { title: 'Shake It Out – Florence + The Machine', url: 'https://www.youtube.com/watch?v=wiYTMjdl9Js' },
      { title: 'Dog Days Are Over – Florence + The Machine', url: 'https://www.youtube.com/watch?v=iWOyfLBYtuU' },
      { title: 'Bright Side of the Road – Van Morrison', url: 'https://www.youtube.com/watch?v=xYfHMNIRGNs' },
      { title: 'New Soul – Yael Naim', url: 'https://www.youtube.com/watch?v=EDwb9jOVRtU' },
    ],
  },
  surprise: {
    category: 'Curious & Exploratory',
    tracks: [
      { title: 'Redbone – Childish Gambino', url: 'https://www.youtube.com/watch?v=Kp7eSUU9oy8' },
      { title: 'Electric Feel – MGMT', url: 'https://www.youtube.com/watch?v=MmZexg8sxyk' },
      { title: 'Little Talks – Of Monsters and Men', url: 'https://www.youtube.com/watch?v=ghb6eDopW8I' },
      { title: 'Take On Me – a-ha', url: 'https://www.youtube.com/watch?v=djV11Xbc914' },
    ],
  },
  neutral: {
    category: 'Focus & Ambience',
    tracks: [
      { title: 'Experience – Ludovico Einaudi', url: 'https://www.youtube.com/watch?v=hN_q-_nGv4U' },
      { title: 'Comptine d\'un autre été – Yann Tiersen', url: 'https://www.youtube.com/watch?v=5NPvHToYQcA' },
      { title: 'Gymnopédie No. 1 – Erik Satie', url: 'https://www.youtube.com/watch?v=S-Xm7s9eGxU' },
      { title: 'Clair de Lune – Debussy', url: 'https://www.youtube.com/watch?v=CvFH_6DNRCY' },
    ],
  },
};

const FEEDBACK_TEMPLATES = {
  joy: 'Your emotional signals suggest a positive and energetic state. This is a great time to engage with activities you love and connect with others.',
  sadness: 'It appears you may be experiencing a period of low mood. This is a natural part of the human experience. Be kind to yourself and consider reaching out to someone you trust.',
  anger: 'Your signals indicate heightened emotional arousal. Taking brief breaks and grounding exercises can help restore a sense of calm and perspective.',
  fear: 'Your emotional patterns suggest some unease or apprehension. Grounding techniques and breaking tasks into small steps can help you feel more in control.',
  disgust: 'A sense of aversion or discomfort appears present. Creating space between yourself and the source of discomfort, and engaging in calming activities, may help.',
  surprise: 'Something unexpected may have affected you. Give yourself time to process before acting, and consider talking through the experience.',
  neutral: 'Your emotional state appears relatively balanced. This is a good time to maintain healthy habits and reflect on your goals.',
};

function getRecommendations(emotion) {
  const key = (emotion || 'neutral').toLowerCase();
  return {
    feedback: FEEDBACK_TEMPLATES[key] || FEEDBACK_TEMPLATES.neutral,
    activities: ACTIVITIES[key] || ACTIVITIES.neutral,
    music: MUSIC[key] || MUSIC.neutral,
    disclaimer:
      'These suggestions are for general well-being and self-reflection only. They are not medical advice. If you are experiencing significant distress, please consult a qualified mental health professional.',
  };
}

module.exports = { getRecommendations };
