import { prisma } from './db';
import type { QuestionType, WorksheetItemType } from '@prisma/client';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ShuttleAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIContext {
  userId: string;
  orgId?: string | null;
}

// Cached models from API
let cachedModels: { id: string; name: string; plan: string }[] = [];
let modelsCacheTime = 0;
const MODELS_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

export interface ShuttleAIModel {
  id: string;
  name: string;
  plan: string;
}

export async function fetchAvailableModels(): Promise<ShuttleAIModel[]> {
  const now = Date.now();

  // Return cached models if still valid
  if (cachedModels.length > 0 && now - modelsCacheTime < MODELS_CACHE_TTL) {
    return cachedModels;
  }

  try {
    const apiKey = process.env.SHUTTLEAI_API_KEY || '';
    const response = await fetch('https://api.shuttleai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch ShuttleAI models:', response.statusText);
      return getDefaultModels();
    }

    const data = await response.json();

    // Parse models from API response
    const models = (data.data || [])
      .filter((m: any) => m.object === 'model')
      .map((m: any) => ({
        id: m.id,
        name: m.id.split('/').pop() || m.id,
        plan: m.plan || 'unknown'
      }))
      .sort((a: any, b: any) => {
        // Sort by plan tier (free < pro < premium) then by name
        const planOrder: Record<string, number> = { free: 0, pro: 1, premium: 2 };
        const aPlan = planOrder[a.plan] ?? 1;
        const bPlan = planOrder[b.plan] ?? 1;
        if (aPlan !== bPlan) return bPlan - aPlan;
        return a.name.localeCompare(b.name);
      });

    if (models.length > 0) {
      cachedModels = models;
      modelsCacheTime = now;
    }

    return models.length > 0 ? models : getDefaultModels();
  } catch (error) {
    console.error('Error fetching ShuttleAI models:', error);
    return getDefaultModels();
  }
}

function getDefaultModels(): ShuttleAIModel[] {
  return [
    { id: 'gpt-4o', name: 'GPT-4o', plan: 'pro' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', plan: 'free' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', plan: 'pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', plan: 'free' }
  ];
}

export class ShuttleAIService {
  private apiKey: string;
  private baseUrl = 'https://api.shuttleai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.SHUTTLEAI_API_KEY || '';
  }

  private async getModel(): Promise<string> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { id: 'singleton' }
      });
      return config?.aiModel || 'anthropic/claude-opus-4-1-20250805';
    } catch {
      return 'anthropic/claude-opus-4-1-20250805';
    }
  }

  private async logUsage(params: {
    type: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
    context?: AIContext;
  }): Promise<void> {
    if (!params.context?.userId) return;

    try {
      // Estimate cost (rough estimates, adjust based on actual pricing)
      const costPer1kInput = 0.001;
      const costPer1kOutput = 0.002;
      const estimatedCost =
        (params.inputTokens / 1000) * costPer1kInput +
        (params.outputTokens / 1000) * costPer1kOutput;

      await prisma.aIUsageLog.create({
        data: {
          type: params.type,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          totalTokens: params.totalTokens,
          cost: estimatedCost,
          duration: params.duration,
          success: params.success,
          error: params.error,
          metadata: params.metadata as any,
          userId: params.context.userId,
          orgId: params.context.orgId || undefined
        }
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  private async makeRequest(
    messages: Message[],
    maxTokens: number = 2000,
    options?: {
      model?: string;
      type?: string;
      context?: AIContext;
      metadata?: Record<string, unknown>;
    }
  ): Promise<string> {
    const selectedModel = options?.model || (await this.getModel());
    const startTime = Date.now();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();

      // Log failed request
      if (options?.context) {
        await this.logUsage({
          type: options.type || 'UNKNOWN',
          model: selectedModel,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          duration,
          success: false,
          error: error.substring(0, 500),
          metadata: options.metadata,
          context: options.context
        });
      }

      throw new Error(`ShuttleAI API error: ${error}`);
    }

    const data: ShuttleAIResponse = await response.json();

    // Log successful request
    if (options?.context) {
      await this.logUsage({
        type: options.type || 'UNKNOWN',
        model: selectedModel,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        duration,
        success: true,
        metadata: options.metadata,
        context: options.context
      });
    }

    return data.choices[0]?.message?.content || '';
  }

  private extractAndRepairJSON(response: string, expectArray: boolean = true): unknown {
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/, '');
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Continue to repair logic
    }

    const pattern = expectArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const jsonMatch = cleaned.match(pattern);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      jsonStr = jsonStr + '}'.repeat(openBraces - closeBraces);
    }

    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      jsonStr = jsonStr + ']'.repeat(openBrackets - closeBrackets);
    }

    jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

    return JSON.parse(jsonStr);
  }

  private detectProgrammingLanguage(question: string, topic: string): string {
    const text = `${question} ${topic}`.toLowerCase();
    
    // Language detection patterns
    const languagePatterns: [RegExp, string][] = [
      [/\b(python|py)\b/i, 'python'],
      [/\b(javascript|js|node\.?js)\b/i, 'javascript'],
      [/\b(typescript|ts)\b/i, 'typescript'],
      [/\b(java)\b(?!script)/i, 'java'],
      [/\b(c\+\+|cpp)\b/i, 'cpp'],
      [/\b(c#|csharp|c sharp)\b/i, 'csharp'],
      [/\b(html)\b/i, 'html'],
      [/\b(css)\b/i, 'css'],
      [/\b(sql)\b/i, 'sql'],
      [/\b(php)\b/i, 'php'],
      [/\b(ruby|rb)\b/i, 'ruby'],
      [/\b(go|golang)\b/i, 'go'],
      [/\b(rust)\b/i, 'rust'],
      [/\b(swift)\b/i, 'swift'],
      [/\b(kotlin)\b/i, 'kotlin'],
      [/\b(r\b|r programming)/i, 'r'],
      [/\b(bash|shell|sh)\b/i, 'bash'],
      [/\b(perl)\b/i, 'perl'],
      [/\b(scala)\b/i, 'scala'],
      [/\b(matlab)\b/i, 'matlab'],
    ];
    
    for (const [pattern, lang] of languagePatterns) {
      if (pattern.test(text)) {
        return lang;
      }
    }
    
    // Default to python if no specific language detected
    return 'python';
  }

  async generateTestQuestions(
    params: {
      topic: string;
      numberOfQuestions: number;
      questionTypes: string[];
      difficulty: 'easy' | 'medium' | 'hard';
      additionalInstructions?: string;
      totalPoints?: number | null;
      pointAllocation?: {
        strategy: 'equal' | 'difficulty' | 'length' | 'type';
        harderQuestionsMorePoints?: boolean;
        longerQuestionsMorePoints?: boolean;
        typeWeights?: Record<string, number>;
        customInstructions?: string;
      };
    },
    context?: AIContext
  ): Promise<
    Array<{
      type: QuestionType;
      question: string;
      options: string[] | null;
      correctAnswer: string;
      points: number;
      programmingLanguage?: string | null;
    }>
  > {
    const systemPrompt = `You are an expert test creator. Generate high-quality test questions.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. DO NOT include \`\`\`json or \`\`\` anywhere in your response
3. Start your response directly with [ and end with ]
4. No explanatory text before or after the JSON

IMPORTANT: For programming/coding questions, you MUST:
- Set type to "PROGRAMMING"
- Set programmingLanguage to the appropriate language (e.g., "javascript", "python", "java", "c", "cpp", "csharp", "html", "css", "sql", "typescript", etc.)
- Provide a clear question that asks students to write code
- The correctAnswer should contain a sample solution or key elements to look for`;

    // Build point allocation instructions
    let pointsInstruction = '- points: Point value 1-10 (number)';
    if (params.totalPoints && params.totalPoints > 0) {
      const avgPoints = Math.round(params.totalPoints / params.numberOfQuestions);
      const strategy = params.pointAllocation?.strategy || 'difficulty';
      
      let allocationGuidance = '';
      if (strategy === 'equal') {
        allocationGuidance = `Distribute points equally (approximately ${avgPoints} points each).`;
      } else if (strategy === 'difficulty') {
        if (params.pointAllocation?.harderQuestionsMorePoints !== false) {
          allocationGuidance = `Give MORE points to harder/complex questions (essay, long answer, programming get 1.5-2x more). Easier questions (multiple choice, true/false) get fewer points.`;
        } else {
          allocationGuidance = `Give MORE points to easier questions to encourage answering simpler ones. Harder questions get standard points.`;
        }
      } else if (strategy === 'length') {
        if (params.pointAllocation?.longerQuestionsMorePoints !== false) {
          allocationGuidance = `Give MORE points to questions requiring longer answers. Short answer questions get fewer points than essays.`;
        } else {
          allocationGuidance = `Give MORE points to questions with shorter expected answers. Concise answers should be rewarded more.`;
        }
      } else if (strategy === 'type' && params.pointAllocation?.typeWeights) {
        const weights = params.pointAllocation.typeWeights;
        const weightDescriptions = Object.entries(weights)
          .filter(([, w]) => w !== 1)
          .map(([t, w]) => `${t.replace('_', ' ')}: ${w}x`)
          .join(', ');
        allocationGuidance = `Apply type-based weights: ${weightDescriptions || 'equal weights'}.`;
      }
      
      // Add custom instructions if provided
      const customInstructions = params.pointAllocation?.customInstructions;
      if (customInstructions) {
        allocationGuidance += ` ADDITIONAL POINT ALLOCATION RULES: ${customInstructions}`;
      }
      
      pointsInstruction = `- points: Distribute the total ${params.totalPoints} points across all questions. ${allocationGuidance} Total must equal exactly ${params.totalPoints}. Average around ${avgPoints} points per question.`;
    }

    // Check if programming questions are included
    const includesProgramming = params.questionTypes.includes('PROGRAMMING');
    const programmingInstruction = includesProgramming 
      ? `\n- programmingLanguage: For PROGRAMMING type questions, specify the programming language (e.g., "python", "javascript", "java", "c", "cpp", "sql", etc.). Set to null for non-programming questions.`
      : '';

    const userPrompt = `Create EXACTLY ${params.numberOfQuestions} ${params.difficulty} difficulty test questions about: ${params.topic}

IMPORTANT: You MUST generate exactly ${params.numberOfQuestions} questions. Not more, not less.

Question types to include: ${params.questionTypes.join(', ')}
${params.additionalInstructions ? `Additional instructions: ${params.additionalInstructions}` : ''}

Return a JSON array with exactly ${params.numberOfQuestions} question objects. Each object has:
- type: One of "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER", "ESSAY", "FILL_IN_BLANK", "PROGRAMMING"
- question: The question text (string). For PROGRAMMING questions, clearly describe what code the student should write.
- options: Array of 4 strings (for MULTIPLE_CHOICE) or ["True", "False"] (for TRUE_FALSE) or null for other types
- correctAnswer: The correct answer (string). For PROGRAMMING questions, provide sample solution code or key elements to check for.${programmingInstruction}
${pointsInstruction}

${includesProgramming ? `For PROGRAMMING questions:
- Detect the appropriate programming language from the topic or context
- Ask students to write functions, algorithms, or code snippets
- The correctAnswer should contain working sample code
- Common languages: python, javascript, java, c, cpp, csharp, html, css, sql, typescript, php, ruby, go, rust, swift, kotlin` : ''}

CRITICAL: Return ONLY the JSON array with exactly ${params.numberOfQuestions} questions. No markdown formatting. No code blocks. Just pure JSON starting with [ and ending with ].`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const estimatedTokensPerQuestion = 350;
    const baseTokens = 2000;
    const calculatedTokens = baseTokens + params.numberOfQuestions * estimatedTokensPerQuestion;
    const maxTokens = Math.max(4000, Math.min(calculatedTokens, 16000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'TEST_GENERATION',
      context,
      metadata: { topic: params.topic, numberOfQuestions: params.numberOfQuestions }
    });
    let questions = this.extractAndRepairJSON(response, true) as Array<{
      type: QuestionType;
      question: string;
      options: string[] | null;
      correctAnswer: string;
      points: number;
      programmingLanguage?: string | null;
    }>;

    // Ensure we return exactly the requested number of questions
    if (questions.length > params.numberOfQuestions) {
      // Trim excess questions
      questions = questions.slice(0, params.numberOfQuestions);
    }

    // Normalize TRUE_FALSE questions to ensure correctAnswer matches options exactly
    // and detect/normalize programming questions
    questions.forEach((q: any) => {
      if (q.type === 'TRUE_FALSE') {
        // Ensure options are set correctly
        q.options = ['True', 'False'];
        // Normalize correctAnswer to match options exactly (case-insensitive check)
        if (q.correctAnswer?.toLowerCase() === 'true') {
          q.correctAnswer = 'True';
        } else if (q.correctAnswer?.toLowerCase() === 'false') {
          q.correctAnswer = 'False';
        }
      }
      
      // Normalize PROGRAMMING questions
      if (q.type === 'PROGRAMMING') {
        // Ensure programmingLanguage is set
        if (!q.programmingLanguage) {
          // Try to detect from question or topic
          q.programmingLanguage = this.detectProgrammingLanguage(q.question, params.topic);
        }
        // Normalize language to lowercase
        if (q.programmingLanguage) {
          q.programmingLanguage = q.programmingLanguage.toLowerCase();
        }
      }
    });

    // Recalculate points if totalPoints was specified to ensure correct distribution
    if (params.totalPoints && params.totalPoints > 0 && questions.length > 0) {
      const currentTotal = questions.reduce((sum, q) => sum + (q.points || 0), 0);
      if (currentTotal !== params.totalPoints) {
        // Redistribute points proportionally
        const scaleFactor = params.totalPoints / currentTotal;
        let distributed = 0;
        questions.forEach((q, i) => {
          if (i === questions.length - 1) {
            // Last question gets remainder to ensure exact total
            q.points = params.totalPoints! - distributed;
          } else {
            q.points = Math.round((q.points || 1) * scaleFactor);
            distributed += q.points;
          }
        });
      }
    }

    return questions;
  }

  async gradeAnswer(
    params: {
      question: string;
      correctAnswer: string;
      studentAnswer: string;
      questionType: string;
      points: number;
    },
    context?: AIContext
  ): Promise<{
    isCorrect: boolean;
    pointsAwarded: number;
    feedback: string;
  }> {
    const systemPrompt = `You are an expert grader. Evaluate student answers fairly and provide constructive feedback.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start with { and end with }
3. No explanatory text before or after`;

    const userPrompt = `Question: ${params.question}
Question Type: ${params.questionType}
Correct Answer: ${params.correctAnswer}
Student Answer: ${params.studentAnswer}
Max Points: ${params.points}

Return a JSON object with exactly these fields:
{
  "isCorrect": boolean,
  "pointsAwarded": number (0 to ${params.points}),
  "feedback": "detailed feedback string"
}

Return ONLY the JSON object. No markdown. No code blocks. Just pure JSON.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.makeRequest(messages, 500, {
      type: 'GRADING',
      context,
      metadata: { questionType: params.questionType }
    });
    const parsed = this.extractAndRepairJSON(response, false) as {
      isCorrect: boolean;
      pointsAwarded: number;
      feedback: string;
    };

    return {
      isCorrect: parsed.isCorrect || false,
      pointsAwarded: parsed.pointsAwarded || 0,
      feedback: parsed.feedback || 'No feedback provided'
    };
  }

  async gradeTestComprehensive(
    params: {
      testTitle: string;
      answers: Array<{
        id: string;
        question: string;
        correctAnswer: string;
        studentAnswer: string;
        questionType: string;
        points: number;
      }>;
      allowPartialCredit?: boolean;
      gradingHarshness?: number; // 0-100, where 0 is lenient and 100 is strict
    },
    context?: AIContext
  ): Promise<{
    gradedAnswers: Array<{
      id: string;
      isCorrect: boolean;
      pointsAwarded: number;
      feedback: string;
    }>;
    overallFeedback: string;
    totalScore: number;
    totalPoints: number;
  }> {
    const allowPartialCredit = params.allowPartialCredit !== false; // Default to true
    const harshness = params.gradingHarshness ?? 50; // Default to balanced

    const answersList = params.answers
      .map(
        (a, idx) => `QUESTION ${idx + 1}:
Question Text: ${a.question}
Type: ${a.questionType}
Max Points: ${a.points}
Correct Answer: ${a.correctAnswer}
Student Answer: ${a.studentAnswer}`
      )
      .join('\n\n');

    const totalPoints = params.answers.reduce((sum, a) => sum + a.points, 0);

    // Determine grading style based on harshness
    let gradingStyle = '';
    if (harshness <= 20) {
      gradingStyle = 'Be very lenient. Give generous partial credit for answers that show any understanding. Accept synonyms, minor spelling errors, and answers that are in the right direction.';
    } else if (harshness <= 40) {
      gradingStyle = 'Be lenient. Give partial credit for answers that demonstrate understanding even if not perfectly worded. Accept minor errors and reasonable interpretations.';
    } else if (harshness <= 60) {
      gradingStyle = 'Use balanced grading. Give partial credit when appropriate, but expect reasonably accurate and complete answers. Minor errors may result in small point deductions.';
    } else if (harshness <= 80) {
      gradingStyle = 'Be strict. Expect accurate and well-explained answers. Only give partial credit for answers that are substantially correct. Penalize vague or incomplete responses.';
    } else {
      gradingStyle = 'Be very strict. Require precise, complete, and accurate answers. Only award full points for exemplary responses. Be critical of any errors, omissions, or lack of clarity.';
    }

    const partialCreditInstruction = allowPartialCredit
      ? 'Award partial credit when appropriate based on how much of the answer is correct.'
      : 'Do NOT give partial credit. Award either full points (if completely correct) or zero points (if incorrect or incomplete).';

    const systemPrompt = `You are an expert teacher grading a test. ${gradingStyle}

${partialCreditInstruction}

SPECIAL INSTRUCTIONS FOR DIFFERENT QUESTION TYPES:

**Programming/Code Questions:**
- Focus on whether the logic and approach is correct, not just syntax
- Award substantial partial credit for correct algorithms with minor syntax errors
- Consider if the code would work with small fixes (typos, missing semicolons, etc.)
- Evaluate: correctness, efficiency, code style, and edge case handling
- Be lenient on language-specific syntax if the logic is sound

**Math Questions:**
- Award partial credit for correct methodology even if final answer is wrong
- Check for computational errors vs conceptual errors
- A correct approach with arithmetic mistake should get most of the points

**Essay/Long Answer Questions:**
- Evaluate: thesis clarity, supporting evidence, organization, and completeness
- Award credit for demonstrating understanding even if not perfectly articulated

For EACH question, provide specific, constructive feedback explaining:
- What the student got right
- What they got wrong (if anything)
- How they could improve their answer

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start with { and end with }
3. No explanatory text before or after`;

    const userPrompt = `Test: "${params.testTitle}"
Total Points Possible: ${totalPoints}

Please grade ALL of these student answers:

${answersList}

Return a JSON object with exactly this structure:
{
  "gradedAnswers": [
    { "id": 1, "isCorrect": boolean, "pointsAwarded": number, "feedback": "specific feedback for this question" }
  ],
  "overallFeedback": "overall performance summary and suggestions for improvement"
}

IMPORTANT:
- Each gradedAnswer must have specific, helpful feedback for that question
- Feedback should explain why points were awarded or deducted
- Overall feedback should summarize the student's performance and areas for improvement

Return ONLY the JSON object. No markdown. No code blocks. Just pure JSON.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const maxTokens = Math.min(8000, Math.max(2000, params.answers.length * 500));
    const response = await this.makeRequest(messages, maxTokens, {
      type: 'TEST_GRADING',
      context,
      metadata: { testTitle: params.testTitle, questionCount: params.answers.length, harshness, allowPartialCredit }
    });

    const parsed = this.extractAndRepairJSON(response, false) as {
      gradedAnswers: Array<{
        id: number;
        isCorrect: boolean;
        pointsAwarded: number;
        feedback: string;
      }>;
      overallFeedback: string;
    };

    let totalScore = 0;
    const mappedAnswers = params.answers.map((answer, idx) => {
      const result = parsed.gradedAnswers[idx] || parsed.gradedAnswers.find((r) => r.id === idx + 1);
      const isCorrect = result?.isCorrect || false;
      const pointsAwarded = Math.min(result?.pointsAwarded || 0, answer.points);
      const feedback = result?.feedback || 'No feedback provided';

      totalScore += pointsAwarded;

      return {
        id: answer.id,
        isCorrect,
        pointsAwarded,
        feedback
      };
    });

    return {
      gradedAnswers: mappedAnswers,
      overallFeedback: parsed.overallFeedback || '',
      totalScore,
      totalPoints
    };
  }

  async generateStudyGuide(
    params: {
      testTitle: string;
      testDescription: string;
      questions: Array<{
        question: string;
        type: string;
        correctAnswer: string;
        points: number;
      }>;
    },
    context?: AIContext
  ): Promise<string> {
    const systemPrompt = `You are an expert educator creating visually stunning, engaging study guides. Generate a comprehensive study guide with RICH HTML formatting and INLINE STYLES for beautiful presentation.

REQUIRED STYLING - Use these exact inline styles:

1. SECTION HEADERS - Use colored headers with icons (use emoji):
   <h2 style="color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; margin-top: 24px;">📚 Section Title</h2>
   <h3 style="color: #7c3aed; margin-top: 20px;">💡 Subsection Title</h3>

2. KEY CONCEPT BOXES - Blue highlighted boxes:
   <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin: 16px 0;">
     <strong style="color: #1e40af;">🔑 Key Concept:</strong>
     <p style="margin: 8px 0 0 0; color: #1e3a8a;">Content here...</p>
   </div>

3. TIP BOXES - Green helpful tips:
   <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px; margin: 16px 0;">
     <strong style="color: #065f46;">💪 Study Tip:</strong>
     <p style="margin: 8px 0 0 0; color: #064e3b;">Content here...</p>
   </div>

4. WARNING BOXES - Orange/red for common mistakes:
   <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin: 16px 0;">
     <strong style="color: #92400e;">⚠️ Watch Out:</strong>
     <p style="margin: 8px 0 0 0; color: #78350f;">Content here...</p>
   </div>

5. PRACTICE QUESTION BOXES - Purple for questions:
   <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 2px solid #8b5cf6; padding: 16px 20px; border-radius: 12px; margin: 16px 0;">
     <strong style="color: #6d28d9;">✏️ Practice Question:</strong>
     <p style="margin: 8px 0; color: #5b21b6;">Question text...</p>
     <details style="margin-top: 12px;">
       <summary style="color: #7c3aed; cursor: pointer; font-weight: 600;">Click to reveal answer</summary>
       <p style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; color: #4c1d95;">Answer here...</p>
     </details>
   </div>

6. DEFINITION LISTS - Styled terms:
   <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 8px 0; border: 1px solid #e2e8f0;">
     <strong style="color: #0f172a;">Term:</strong> <span style="color: #475569;">Definition...</span>
   </div>

7. NUMBERED STEPS - For processes:
   <div style="display: flex; gap: 12px; align-items: flex-start; margin: 12px 0;">
     <span style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</span>
     <p style="margin: 0; color: #334155;">Step description...</p>
   </div>

8. BULLET LISTS - Use styled bullets:
   <ul style="list-style: none; padding-left: 0;">
     <li style="padding: 8px 0; padding-left: 28px; position: relative;"><span style="position: absolute; left: 0; color: #3b82f6;">●</span> Item text</li>
   </ul>

CONTENT REQUIREMENTS:
- Start with an engaging introduction with a motivational message
- Cover ALL key topics from the test questions
- Include at least 3-5 practice questions (DIFFERENT from actual test questions)
- Add memory tricks, mnemonics, or visual associations where helpful
- End with a "Quick Review Checklist" using checkboxes: ☐
- Use emojis throughout to make it engaging (📌 🎯 ✨ 🧠 📝 ⭐ 🔍 💭)

IMPORTANT:
- DO NOT include exact test questions
- DO NOT reveal exact answers
- Create SIMILAR but DIFFERENT practice questions
- Return ONLY the HTML content (no <html>, <head>, or <body> tags)
- Make it visually BEAUTIFUL and ENGAGING for students`;

    const questionSummary = params.questions
      .map((q, idx) => `Question ${idx + 1} (${q.type}, ${q.points} pts): Topic - "${q.question.substring(0, 80)}..."`)
      .join('\n');

    const userPrompt = `Create a beautiful, engaging study guide for: "${params.testTitle}"
${params.testDescription ? `Description: ${params.testDescription}` : ''}

The test covers these ${params.questions.length} topics:
${questionSummary}

Generate a comprehensive, visually stunning study guide with:
1. 🎯 Welcome section with motivational intro
2. 📚 Key Concepts section with detailed explanations (use concept boxes)
3. 💡 Important Terms & Definitions
4. ✏️ Practice Questions section (create 4-6 NEW questions with hidden answers)
5. 💪 Study Tips & Strategies (use tip boxes)
6. ⚠️ Common Mistakes to Avoid (use warning boxes)
7. ☐ Quick Review Checklist at the end

Make it colorful, engaging, and helpful! Use all the styled boxes and formatting from the system prompt.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.makeRequest(messages, 6000, {
      type: 'STUDY_GUIDE',
      context,
      metadata: { testTitle: params.testTitle, questionCount: params.questions.length }
    });

    let cleaned = response.trim();
    if (cleaned.startsWith('```html')) {
      cleaned = cleaned.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return cleaned;
  }

  async generateWorksheetItems(
    params: {
      topic: string;
      subject: string;
      gradeLevel?: string;
      numberOfItems: number;
      itemTypes: string[];
      difficulty: 'easy' | 'medium' | 'hard';
      includeGraphs?: boolean;
    },
    context?: AIContext
  ): Promise<
    Array<{
      type: WorksheetItemType;
      content: string;
      imageUrl?: string;
      imageCaption?: string;
      options?: string[];
      answer?: string;
      hint?: string;
      difficulty?: string;
    }>
  > {
    const systemPrompt = `You are an expert worksheet creator specializing in educational materials for ${params.subject}.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start your response directly with [ and end with ]
3. No explanatory text before or after`;

    const userPrompt = `Create ${params.numberOfItems} ${params.difficulty} difficulty worksheet items for ${params.subject} about: ${params.topic}
${params.gradeLevel ? `Grade Level: ${params.gradeLevel}` : ''}

Item types to include: ${params.itemTypes.join(', ')}

Return a JSON array where each item object has:
- type: One of "PROBLEM", "INSTRUCTION", "GRAPH", "DIAGRAM", "TABLE", "FILL_IN_BLANK", "SHORT_ANSWER", etc.
- content: The main content/problem text (string)
- imageUrl: For GRAPH/DIAGRAM types, generate SVG code or null
- imageCaption: Caption for images (optional)
- options: Array of strings (for MULTIPLE_CHOICE) or null
- answer: The correct answer (optional)
- hint: A helpful hint (optional)
- difficulty: "easy", "medium", or "hard"

Return ONLY the JSON array.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const baseTokensPerItem = params.includeGraphs ? 600 : 300;
    const maxTokens = Math.max(4000, Math.min(1500 + params.numberOfItems * baseTokensPerItem, 16000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'WORKSHEET_GENERATION',
      context,
      metadata: { topic: params.topic, numberOfItems: params.numberOfItems }
    });
    const items = this.extractAndRepairJSON(response, true) as Array<{
      type: WorksheetItemType;
      content: string;
      imageUrl?: string;
      imageCaption?: string;
      options?: string[];
      answer?: string;
      hint?: string;
      difficulty?: string;
    }>;

    return items;
  }

  async generateClassSummary(
    params: {
      testTitle: string;
      testDescription?: string;
      submissions: Array<{
        studentName: string;
        score: number;
        totalPoints: number;
        answers: Array<{
          question: string;
          studentAnswer: string;
          correctAnswer: string;
          isCorrect: boolean;
          pointsAwarded: number;
          maxPoints: number;
        }>;
      }>;
    },
    context?: AIContext
  ): Promise<string> {
    if (params.submissions.length === 0) {
      return '<div><p>No submissions available to analyze yet.</p></div>';
    }

    const totalStudents = params.submissions.length;
    const avgScore = params.submissions.reduce((sum, s) => sum + s.score, 0) / totalStudents;
    const avgTotal = params.submissions[0]?.totalPoints || 0;
    const avgPercentage = avgTotal > 0 ? (avgScore / avgTotal) * 100 : 0;

    const systemPrompt = `You are an expert educator analyzing class performance. Generate a comprehensive, visually appealing HTML summary.

Create a beautiful, professional summary with:
- Color-coded sections (red for concerns, yellow for caution, green for strengths)
- Clear headings and subheadings
- Bullet points and lists for readability
- Highlight boxes for key insights
- Specific, actionable recommendations

Use these CSS classes:
- class="highlight-box" for yellow/important notes
- class="tip-box" for blue/helpful tips
- class="warning-box" for red/critical concerns
- class="success-box" for green/strengths`;

    const userPrompt = `Analyze this test performance and create an HTML summary:

Test: "${params.testTitle}"

Class Statistics:
- Total Students: ${totalStudents}
- Average Score: ${avgScore.toFixed(1)}/${avgTotal} (${avgPercentage.toFixed(1)}%)
- Highest Score: ${Math.max(...params.submissions.map((s) => s.score))}/${avgTotal}
- Lowest Score: ${Math.min(...params.submissions.map((s) => s.score))}/${avgTotal}

Generate an HTML summary with sections for:
1. Overall Performance
2. Areas Needing Attention
3. Class Strengths
4. Recommendations
5. Next Steps

Return ONLY the HTML content.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const maxTokens = Math.max(3000, Math.min(6000, totalStudents * 400));
    const response = await this.makeRequest(messages, maxTokens, {
      type: 'CLASS_SUMMARY',
      context,
      metadata: { testTitle: params.testTitle, studentCount: totalStudents }
    });

    let cleaned = response.trim();
    if (cleaned.startsWith('```html')) {
      cleaned = cleaned.replace(/^```html\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return cleaned;
  }

  // Method to generate flashcards for study sets
  async generateFlashcards(
    params: {
      topic: string;
      numberOfCards: number;
    },
    context?: AIContext
  ): Promise<Array<{ front: string; back: string }>> {
    const systemPrompt = `You are an expert educator creating flashcards for studying.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start your response directly with [ and end with ]
3. No explanatory text before or after`;

    const userPrompt = `Create ${params.numberOfCards} high-quality flashcards about: ${params.topic}

Return a JSON array where each flashcard object has:
- front: The term, question, or concept (string)
- back: The definition, answer, or explanation (string)

Make the flashcards educational, clear, and useful for studying.

Return ONLY the JSON array.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const maxTokens = Math.max(2000, Math.min(params.numberOfCards * 150, 8000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'FLASHCARD_GENERATION',
      context,
      metadata: { topic: params.topic, numberOfCards: params.numberOfCards }
    });

    const cards = this.extractAndRepairJSON(response, true) as Array<{
      front: string;
      back: string;
    }>;

    return cards;
  }
}

export const shuttleAI = new ShuttleAIService();
