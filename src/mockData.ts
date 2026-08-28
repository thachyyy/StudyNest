import { Material, Student, StudentConversation, Quiz, LearningAnalytics } from './types';

export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'mat-1',
    title: 'Photosynthesis & Cellular Respiration',
    subject: 'Biology 10',
    classGroup: 'Grade 10A',
    createdAt: '2026-07-28',
    pastLessonContent: 'Cell structure, organelle functions (chloroplasts, mitochondria), and ATP energy currency in biological systems.',
    nextLessonContent: `Photosynthesis is the process used by plants, algae, and certain bacteria to convert light energy into chemical energy stored in glucose.
It occurs in two main stages: Light-Dependent Reactions (in the thylakoid membrane) and the Calvin Cycle (Light-Independent Reactions in the stroma).
Key factors affecting the rate of photosynthesis include light intensity, carbon dioxide concentration, and ambient temperature.
Cellular respiration complements photosynthesis by breaking down glucose with oxygen to synthesize ATP through Glycolysis, the Krebs Cycle, and Electron Transport Chain.`,
    learningGoals: [
      'Understand the chemical inputs and outputs of light-dependent vs light-independent reactions.',
      'Explain how environmental factors (light, temperature, CO2) affect photosynthetic rate.',
      'Compare ATP yield between Photosynthesis and Cellular Respiration.'
    ],
    keywords: [
      {
        id: 'kw-1',
        word: 'Thylakoid Membrane',
        category: 'Cellular Structure',
        definition: 'Membrane-bound compartments inside chloroplasts where light-dependent reactions of photosynthesis occur.',
        suggestedPrompts: [
          'Explain why light-dependent reactions specifically take place on the thylakoid membrane.',
          'How does the proton gradient across the thylakoid membrane drive ATP synthase?'
        ],
        weakCount: 14
      },
      {
        id: 'kw-2',
        word: 'Calvin Cycle',
        category: 'Biochemical Process',
        definition: 'Light-independent reaction in stroma that uses ATP and NADPH to fix carbon dioxide into G3P/glucose.',
        suggestedPrompts: [
          'What happens to the Calvin Cycle if light is suddenly removed for 2 hours?',
          'Why is RuBisCO called both the most abundant and crucial enzyme in the Calvin Cycle?'
        ],
        weakCount: 18
      },
      {
        id: 'kw-3',
        word: 'ATP Synthase',
        category: 'Enzymes & Energy',
        definition: 'Enzyme that creates ATP from ADP and inorganic phosphate using energy from chemiosmosis.',
        suggestedPrompts: [
          'Describe how ATP Synthase acts like a molecular rotary motor.',
          'What happens if a toxin creates pores in the thylakoid membrane?'
        ],
        weakCount: 9
      },
      {
        id: 'kw-4',
        word: 'RuBisCO Enzyme',
        category: 'Enzymes & Energy',
        definition: 'Ribulose-1,5-bisphosphate carboxylase-oxygenase, fixing CO2 during Calvin Cycle.',
        suggestedPrompts: [
          'Why does photorespiration lower photosynthetic efficiency when RuBisCO binds oxygen instead of CO2?'
        ],
        weakCount: 22
      }
    ],
    treeNodes: [
      {
        id: 'node-root',
        label: 'Photosynthesis & Respiration System',
        category: 'core',
        description: 'The global bioenergetic cycle converting solar light into stored chemical energy and cellular ATP.',
        childrenIds: ['node-stage1', 'node-stage2', 'node-factors']
      },
      {
        id: 'node-stage1',
        label: 'Light-Dependent Reactions',
        category: 'concept',
        description: 'Occurs in Thylakoids. Converts H2O + Light into O2, ATP, NADPH.',
        keywordRef: 'Thylakoid Membrane',
        parentId: 'node-root',
        childrenIds: ['node-atp']
      },
      {
        id: 'node-stage2',
        label: 'Calvin Cycle (Light-Independent)',
        category: 'concept',
        description: 'Occurs in Stroma. Uses CO2, ATP, NADPH to produce Glucose.',
        keywordRef: 'Calvin Cycle',
        parentId: 'node-root',
        childrenIds: ['node-rubisco']
      },
      {
        id: 'node-factors',
        label: 'Environmental Rate Factors',
        category: 'concept',
        description: 'Light intensity, CO2 levels, and optimal enzyme temperature.',
        parentId: 'node-root'
      },
      {
        id: 'node-atp',
        label: 'Photophosphorylation via ATP Synthase',
        category: 'detail',
        description: 'Proton gradient drives rotational synthesis of ATP.',
        keywordRef: 'ATP Synthase',
        parentId: 'node-stage1'
      },
      {
        id: 'node-rubisco',
        label: 'Carbon Fixation by RuBisCO',
        category: 'detail',
        description: 'Fixing CO2 molecule onto RuBP starter substrate.',
        keywordRef: 'RuBisCO Enzyme',
        parentId: 'node-stage2'
      }
    ]
  },
  {
    id: 'mat-2',
    title: 'Newtonian Kinematics & Momentum',
    subject: 'Physics 11',
    classGroup: 'Grade 11B',
    createdAt: '2026-07-29',
    pastLessonContent: 'Vectors, scalar quantities, displacement vs distance, velocity and acceleration equations.',
    nextLessonContent: `Newton's Laws of Motion describe the relationship between a body and the forces acting upon it.
Newton's 1st Law (Inertia), 2nd Law (F = ma), and 3rd Law (Action-Reaction pairs).
Linear Momentum (p = mv) and Impulse (J = F * delta_t = delta_p).
Conservation of Momentum dictates that total momentum in an isolated system remains constant before and after collision.`,
    learningGoals: [
      'Apply F = ma to solve multi-body free-body force diagrams.',
      'Differentiate between elastic and inelastic collisions using conservation of momentum.',
      'Explain impulse as the integral area under a force-time graph.'
    ],
    keywords: [
      {
        id: 'kw-p1',
        word: 'Impulse-Momentum Theorem',
        category: 'Laws of Motion',
        definition: 'Impulse delivered to an object equals the change in its linear momentum.',
        suggestedPrompts: [
          'How do airbags use the Impulse-Momentum theorem to minimize collision impact force on drivers?'
        ],
        weakCount: 12
      },
      {
        id: 'kw-p2',
        word: 'Elastic vs Inelastic Collision',
        category: 'Conservation Laws',
        definition: 'Elastic collisions conserve both momentum and kinetic energy; inelastic collisions stick or lose KE to heat/sound.',
        suggestedPrompts: [
          'Why is kinetic energy lost in inelastic collisions even though total momentum is strictly conserved?'
        ],
        weakCount: 16
      }
    ],
    treeNodes: [
      {
        id: 'node-p-root',
        label: 'Classical Mechanics & Dynamics',
        category: 'core',
        description: 'Forces, inertia, and momentum conservation in macro physics.',
        childrenIds: ['node-p-laws', 'node-p-momentum']
      },
      {
        id: 'node-p-laws',
        label: 'Newton\'s 3 Laws',
        category: 'concept',
        description: 'Inertia, F=ma acceleration, and action-reaction pairs.',
        parentId: 'node-p-root'
      },
      {
        id: 'node-p-momentum',
        label: 'Linear Momentum & Impulse',
        category: 'concept',
        description: 'Mass in motion (p=mv) and force applied over time (J=F*dt).',
        keywordRef: 'Impulse-Momentum Theorem',
        parentId: 'node-p-root'
      }
    ]
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    name: 'An Minh',
    email: 'an.minh@school.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    classGroup: 'Grade 10A',
    prepProgressPercent: 85,
    prepStatus: 'completed',
    reviewStatus: 'ready',
    quizScore: 92,
    weakKeywords: ['RuBisCO Enzyme'],
    lastActive: '10 mins ago'
  },
  {
    id: 'stu-2',
    name: 'Bao Lam',
    email: 'bao.lam@school.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    classGroup: 'Grade 10A',
    prepProgressPercent: 45,
    prepStatus: 'in_progress',
    reviewStatus: 'needs_review',
    quizScore: 68,
    weakKeywords: ['Calvin Cycle', 'RuBisCO Enzyme'],
    lastActive: '1 hour ago'
  },
  {
    id: 'stu-3',
    name: 'Chi Mai',
    email: 'chi.mai@school.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    classGroup: 'Grade 10A',
    prepProgressPercent: 100,
    prepStatus: 'completed',
    reviewStatus: 'ready',
    quizScore: 98,
    weakKeywords: [],
    lastActive: '5 mins ago'
  },
  {
    id: 'stu-4',
    name: 'Duc Huy',
    email: 'duc.huy@school.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    classGroup: 'Grade 10A',
    prepProgressPercent: 20,
    prepStatus: 'in_progress',
    reviewStatus: 'needs_review',
    quizScore: 55,
    weakKeywords: ['Thylakoid Membrane', 'Calvin Cycle', 'RuBisCO Enzyme'],
    lastActive: '3 hours ago'
  },
  {
    id: 'stu-5',
    name: 'Elena Quan',
    email: 'elena.quan@school.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    classGroup: 'Grade 10A',
    prepProgressPercent: 0,
    prepStatus: 'not_started',
    reviewStatus: 'needs_review',
    quizScore: 0,
    weakKeywords: ['Thylakoid Membrane', 'ATP Synthase', 'Calvin Cycle'],
    lastActive: 'Yesterday'
  }
];

export const INITIAL_CONVERSATIONS: StudentConversation[] = [
  {
    id: 'conv-1',
    studentId: 'stu-1',
    studentName: 'An Minh',
    materialId: 'mat-1',
    lastUpdated: '10 mins ago',
    overallPromptQualityScore: 88,
    prepAssessment: 'Strong conceptual grasp. Asks targeted mechanism questions with clear constraints.',
    thinkingAnalysis: 'Student demonstrates deep curiosity regarding proton gradient mechanics and chemical stoichiometry in RuBisCO.',
    messages: [
      {
        id: 'msg-1',
        sender: 'student',
        text: 'Hi AI! Can you explain why light-dependent reactions take place specifically on the thylakoid membrane instead of the fluid stroma?',
        timestamp: '10:15 AM',
        keywordFocus: 'Thylakoid Membrane',
        promptEvaluation: {
          score: 85,
          clarity: 5,
          depth: 4,
          critique: 'Specific question targeting cellular spatial organization vs metabolic function.',
          improvementTip: 'Good job! You could add a comparison with mitochondrial cristae to deepen the synthesis.'
        }
      },
      {
        id: 'msg-2',
        sender: 'ai',
        text: 'Great question, An Minh! The thylakoid membrane houses protein complexes like Photosystems I & II, electron transport chains, and ATP Synthase in a concentrated lipid bilayer. This membrane separates the lumen from the stroma, creating an enclosed compartment needed to build up a high concentration of protons (H+). When protons rush through ATP Synthase back into the stroma, that chemiosmotic flow generates ATP!',
        timestamp: '10:16 AM'
      },
      {
        id: 'msg-3',
        sender: 'student',
        text: 'Ah! So if the thylakoid membrane had tiny leaks, protons would leak back into the stroma without passing through ATP Synthase, stopping ATP creation?',
        timestamp: '10:18 AM',
        keywordFocus: 'ATP Synthase',
        promptEvaluation: {
          score: 92,
          clarity: 5,
          depth: 5,
          critique: 'Excellent hypothesis testing! Applies cause-and-effect reasoning to uncoupling membrane integrity.',
          improvementTip: 'Top tier prompt. This tests functional boundary conditions effectively.'
        }
      },
      {
        id: 'msg-4',
        sender: 'ai',
        text: 'Spot on! That uncoupling process collapses the electrochemical proton gradient. Light energy would still excite electrons and split water, but without proton accumulation across an intact thylakoid membrane, ATP Synthase cannot rotate to synthesize ATP.',
        timestamp: '10:19 AM'
      }
    ]
  },
  {
    id: 'conv-2',
    studentId: 'stu-2',
    studentName: 'Bao Lam',
    materialId: 'mat-1',
    lastUpdated: '1 hour ago',
    overallPromptQualityScore: 58,
    prepAssessment: 'Needs guidance on prompt specificity. Tends to ask broad "explain Calvin cycle" queries without context.',
    thinkingAnalysis: 'Superficial recall. Student struggles to connect light reaction outputs (ATP/NADPH) as inputs to Calvin Cycle.',
    messages: [
      {
        id: 'msg-201',
        sender: 'student',
        text: 'What is Calvin cycle?',
        timestamp: '09:05 AM',
        keywordFocus: 'Calvin Cycle',
        promptEvaluation: {
          score: 55,
          clarity: 3,
          depth: 2,
          critique: 'Very generic search-style query.',
          improvementTip: 'Try asking: "What are the 3 main phases of the Calvin Cycle and what chemicals enter/exit each stage?"'
        }
      },
      {
        id: 'msg-202',
        sender: 'ai',
        text: 'The Calvin Cycle is the light-independent stage of photosynthesis occurring in the stroma of chloroplasts. It uses carbon dioxide from the air along with ATP and NADPH generated during light reactions to synthesize glucose precursor molecules (G3P).',
        timestamp: '09:06 AM'
      }
    ]
  }
];

export const INITIAL_QUIZ: Quiz = {
  id: 'quiz-1',
  materialId: 'mat-1',
  title: 'Photosynthesis & Respiration Readiness Check',
  questions: [
    {
      id: 'q-1',
      type: 'mcq',
      question: 'Where do the light-dependent reactions of photosynthesis primarily occur inside the plant cell?',
      options: [
        'Stroma of the Chloroplast',
        'Thylakoid Membrane of the Chloroplast',
        'Mitochondrial Matrix',
        'Cytoplasm'
      ],
      correctAnswer: 1,
      explanation: 'Light-dependent reactions rely on membrane-bound chlorophyll photocomplexes and electron transport chains embedded in the Thylakoid Membrane.',
      relatedKeyword: 'Thylakoid Membrane'
    },
    {
      id: 'q-2',
      type: 'mcq',
      question: 'What crucial enzyme fixes inorganic CO2 into organic carbon substrate in the Calvin Cycle?',
      options: [
        'ATP Synthase',
        'RuBisCO',
        'DNA Polymerase',
        'Amylase'
      ],
      correctAnswer: 1,
      explanation: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) catalyzes the initial step of carbon fixation in the Calvin Cycle.',
      relatedKeyword: 'RuBisCO Enzyme'
    },
    {
      id: 'q-3',
      type: 'essay',
      question: 'Hypothesize what happens to Calvin Cycle activity if a plant is placed in total darkness for 24 hours, even if abundant CO2 is provided.',
      correctAnswer: 'Calvin cycle stalls because it depends on NADPH and ATP continually produced by light-dependent reactions.',
      explanation: 'Even though Calvin cycle reactions are "light-independent", they strictly require steady supplies of ATP and NADPH generated during photophosphorylation.',
      relatedKeyword: 'Calvin Cycle'
    }
  ]
};

export const INITIAL_ANALYTICS: LearningAnalytics = {
  prepCompletionRate: 60,
  avgQuizScore: 78.2,
  totalStudents: 28,
  commonMistakes: [
    { title: 'Confusing Stroma (Calvin Cycle) with Thylakoid Lumen', count: 12, category: 'Cellular Geography' },
    { title: 'Assuming Calvin Cycle runs endlessly without ATP from Light reactions', count: 15, category: 'Biochemical Coupling' },
    { title: 'Misinterpreting RuBisCO photorespiration under high heat', count: 9, category: 'Enzymatic Efficiency' }
  ],
  weakKeywordsStats: [
    { word: 'RuBisCO Enzyme', category: 'Enzymes & Energy', weakStudentsCount: 18, percentage: 64 },
    { word: 'Calvin Cycle', category: 'Biochemical Process', weakStudentsCount: 14, percentage: 50 },
    { word: 'Thylakoid Membrane', category: 'Cellular Structure', weakStudentsCount: 9, percentage: 32 },
    { word: 'ATP Synthase', category: 'Enzymes & Energy', weakStudentsCount: 6, percentage: 21 }
  ],
  recentActivity: [
    { id: 'act-1', studentName: 'An Minh', action: 'Completed preparation chat on "Thylakoid Membrane"', timestamp: '10 mins ago' },
    { id: 'act-2', studentName: 'Chi Mai', action: 'Scored 98/100 on Readiness Quiz', timestamp: '25 mins ago' },
    { id: 'act-3', studentName: 'Bao Lam', action: 'Asked AI Chatbot for prompt improvements on Calvin Cycle', timestamp: '1 hour ago' },
    { id: 'act-4', studentName: 'Duc Huy', action: 'Explored Knowledge Tree node "Light-Dependent Reactions"', timestamp: '2 hours ago' }
  ]
};
