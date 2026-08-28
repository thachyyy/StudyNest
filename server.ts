import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUsers } from './src/db/users.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ----------------------------------------------------
// Cloud SQL & Auth API Routes
// ----------------------------------------------------
app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, displayName, role } = req.body;
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ error: 'Missing UID from token' });
    }

    const user = await getOrCreateUser(
      uid,
      email || req.user?.email || 'user@example.com',
      displayName || req.user?.name,
      role || 'student'
    );
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Failed to sync user to Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allUsers = await getUsers();
    res.json({ success: true, users: allUsers });
  } catch (error: any) {
    console.error('Failed to fetch users from Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Initialize Gemini Client lazily or gracefully
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// API Route 1: Text -> Knowledge Tree & Keywords
// ----------------------------------------------------
app.post('/api/ai/text-to-tree', async (req, res) => {
  try {
    const { pastLesson, nextLesson, title, subject } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return fallback structured data if API key isn't provided
      return res.json({
        success: true,
        data: {
          learningGoals: [
            `Understand fundamental concepts of ${title || 'the lesson'}`,
            `Analyze key mechanisms and applications in ${subject || 'the course'}`,
            `Evaluate relationship between foundational topics and advanced applications`
          ],
          keywords: [
            {
              id: 'kw-gen-1',
              word: 'Core Mechanism',
              category: 'Foundation',
              definition: 'Primary biochemical or physical process driving system behavior.',
              suggestedPrompts: [
                'Explain how this core mechanism operates under normal conditions.',
                'What happens if an external bottleneck alters this reaction rate?'
              ]
            },
            {
              id: 'kw-gen-2',
              word: 'System Equilibrium',
              category: 'Dynamics',
              definition: 'Balanced state where forward and reverse rates or inputs/outputs equalize.',
              suggestedPrompts: [
                'How does the system restore equilibrium when perturbed?'
              ]
            }
          ],
          treeNodes: [
            {
              id: 'node-root',
              label: title || 'Topic Overview',
              category: 'core',
              description: 'Central concept encompassing lesson objectives.',
              childrenIds: ['node-c1', 'node-c2']
            },
            {
              id: 'node-c1',
              label: 'Foundational Principles',
              category: 'concept',
              description: 'Key rules and components.',
              parentId: 'node-root'
            },
            {
              id: 'node-c2',
              label: 'Advanced Applications',
              category: 'concept',
              description: 'Real-world scenarios and experiments.',
              parentId: 'node-root'
            }
          ]
        }
      });
    }

    const prompt = `Analyze the following educational lesson content and extract:
1. 3 concise learning goals
2. 3-5 critical keywords with categories, definitions, and 2 suggested prompts for students to ask an AI tutor
3. A hierarchical Knowledge Tree with a root node, concept child nodes, and detail sub-nodes.

Title: ${title}
Subject: ${subject}
Past Lesson context: ${pastLesson}
Upcoming Lesson content: ${nextLesson}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            learningGoals: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            keywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  word: { type: Type.STRING },
                  category: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  suggestedPrompts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'word', 'category', 'definition', 'suggestedPrompts']
              }
            },
            treeNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  keywordRef: { type: Type.STRING },
                  parentId: { type: Type.STRING },
                  childrenIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'label', 'category', 'description']
              }
            }
          },
          required: ['learningGoals', 'keywords', 'treeNodes']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Error in text-to-tree route:', err);
    res.status(500).json({ error: err.message || 'Failed to process text-to-tree' });
  }
});

// ----------------------------------------------------
// API Route 2: Student Chat with Prompt Coaching & Tutor AI
// ----------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { studentPrompt, keyword, lessonContext, chatHistory } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not configured
      const score = Math.min(100, Math.max(50, studentPrompt.length * 2 + (studentPrompt.includes('why') || studentPrompt.includes('how') ? 25 : 10)));
      return res.json({
        success: true,
        aiResponse: `That is a great inquiry about **${keyword || 'this topic'}**! In response to your question: "${studentPrompt}", consider how structure directly dictates biological/physical function. When conditions change, key components adapt to maintain system balance.`,
        promptEvaluation: {
          score,
          clarity: score > 80 ? 5 : 3,
          depth: score > 75 ? 4 : 2,
          critique: studentPrompt.length > 25 ? 'Well-formulated question targeting mechanisms.' : 'General query. Adding context will yield deeper insights.',
          improvementTip: studentPrompt.length > 25 ? 'Great prompt! Try incorporating cause-and-effect constraints.' : 'Include specific terms like "What happens if..." or compare two states.'
        }
      });
    }

    const systemInstruction = `You are a supportive, insightful Google Edu AI Tutor and Prompt Coach.
Your goals:
1. Evaluate the student's prompt quality (0-100 score, clarity 1-5, depth 1-5, short constructive critique, and 1 tip to improve the prompt).
2. Answer the student's question clearly, encouragingly, and rigorously based on the lesson context provided. Use Markdown formatting.
3. Keep the tone warm, academic, and interactive (Google Workspace / Gemini style).

Lesson Context: ${lessonContext || 'General Science Study'}
Keyword Focus: ${keyword || 'General'}`;

    const promptText = `Student's Question / Prompt: "${studentPrompt}"
Chat History: ${JSON.stringify(chatHistory || [])}

Please evaluate the student's prompt AND provide the educational answer in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiResponse: { type: Type.STRING },
            promptEvaluation: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                clarity: { type: Type.NUMBER },
                depth: { type: Type.NUMBER },
                critique: { type: Type.STRING },
                improvementTip: { type: Type.STRING }
              },
              required: ['score', 'clarity', 'depth', 'critique', 'improvementTip']
            }
          },
          required: ['aiResponse', 'promptEvaluation']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Error in chat route:', err);
    res.status(500).json({ error: err.message || 'Chat generation failed' });
  }
});

// ----------------------------------------------------
// API Route 3: Dynamic Quiz Generator
// ----------------------------------------------------
app.post('/api/ai/generate-quiz', async (req, res) => {
  try {
    const { lessonTitle, keywords, questionCount = 3 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        quiz: {
          id: `quiz-gen-${Date.now()}`,
          title: `${lessonTitle || 'Lesson'} Dynamic Quiz`,
          questions: [
            {
              id: 'q-gen-1',
              type: 'mcq',
              question: `Which component plays a primary role in ${keywords?.[0]?.word || 'this mechanism'}?`,
              options: [
                'Primary Reaction Complex',
                'Secondary Regulatory Loop',
                'Inert Boundary Layer',
                'External Dissipative Sink'
              ],
              correctAnswer: 0,
              explanation: 'The primary reaction complex facilitates energy conversion and substrate binding.',
              relatedKeyword: keywords?.[0]?.word || 'Core Mechanism'
            },
            {
              id: 'q-gen-2',
              type: 'essay',
              question: `Explain how energy efficiency is maintained across stages in ${lessonTitle || 'this system'}.`,
              correctAnswer: 'Energy is preserved through coupled biochemical or physical reactions.',
              explanation: 'Coupling exergonic and endergonic steps minimizes thermal dissipation.',
              relatedKeyword: keywords?.[1]?.word || 'Energy Flow'
            }
          ]
        }
      });
    }

    const prompt = `Generate a high-quality readiness quiz with ${questionCount} questions (mix of multiple choice and essay/practical questions) for high school students.
Lesson Title: ${lessonTitle}
Key Focus Keywords: ${JSON.stringify(keywords || [])}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  relatedKeyword: { type: Type.STRING }
                },
                required: ['id', 'type', 'question', 'explanation']
              }
            }
          },
          required: ['title', 'questions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      quiz: {
        id: `quiz-gen-${Date.now()}`,
        materialId: req.body.materialId || 'mat-1',
        title: parsed.title,
        questions: parsed.questions
      }
    });
  } catch (err: any) {
    console.error('Error in generate-quiz route:', err);
    res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
});

// ----------------------------------------------------
// API Route 4: Teacher Learning Analytics Evaluator
// ----------------------------------------------------
app.post('/api/ai/student-analytics', async (req, res) => {
  try {
    const { studentName, conversationLog } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        analytics: {
          overallPromptQualityScore: 82,
          prepAssessment: `${studentName || 'Student'} demonstrates good preparation with active prompt formulation.`,
          thinkingAnalysis: 'Shows clear logical progression from foundational recall to cause-and-effect questioning.',
          commonWeaknesses: ['Connecting organelle structure to chemical rates']
        }
      });
    }

    const prompt = `Analyze this conversation log between student "${studentName}" and AI Tutor.
Provide:
1. Overall prompt quality score (0-100)
2. Preparation assessment summary for the teacher
3. Deep thinking / reasoning depth analysis
4. List of common conceptual weaknesses detected.

Conversation log: ${JSON.stringify(conversationLog)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallPromptQualityScore: { type: Type.NUMBER },
            prepAssessment: { type: Type.STRING },
            thinkingAnalysis: { type: Type.STRING },
            commonWeaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['overallPromptQualityScore', 'prepAssessment', 'thinkingAnalysis', 'commonWeaknesses']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, analytics: parsed });
  } catch (err: any) {
    console.error('Error in student-analytics route:', err);
    res.status(500).json({ error: err.message || 'Analytics failed' });
  }
});

// Start Express server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Edu AI Learning Assistant server running on port ${PORT}`);
  });
}

startServer();
