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
      creditMultiplier?: number; // Multiply token count for billing (e.g., 2x for file uploads)
    }
  ): Promise<string> {
    const selectedModel = options?.model || (await this.getModel());
    const startTime = Date.now();
    
    // Retry configuration
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

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
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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

        // Apply credit multiplier if specified (e.g., 2x for file uploads)
        const multiplier = options?.creditMultiplier || 1;
        const billedInputTokens = (data.usage?.prompt_tokens || 0) * multiplier;
        const billedOutputTokens = (data.usage?.completion_tokens || 0) * multiplier;
        const billedTotalTokens = (data.usage?.total_tokens || 0) * multiplier;

        // Log successful request
        if (options?.context) {
          await this.logUsage({
            type: options.type || 'UNKNOWN',
            model: selectedModel,
            inputTokens: billedInputTokens,
            outputTokens: billedOutputTokens,
            totalTokens: billedTotalTokens,
            duration,
            success: true,
            metadata: { ...options.metadata, creditMultiplier: multiplier },
            context: options.context
          });
        }

        return data.choices[0]?.message?.content || '';
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if this is a retryable error
        const isRetryable = 
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('socket') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('aborted') ||
          lastError.name === 'AbortError';

        if (!isRetryable || attempt === maxRetries - 1) {
          console.error(`ShuttleAI request failed (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);
          
          // Log the final failure
          if (options?.context) {
            const duration = Date.now() - startTime;
            await this.logUsage({
              type: options.type || 'UNKNOWN',
              model: selectedModel,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              duration,
              success: false,
              error: lastError.message.substring(0, 500),
              metadata: options.metadata,
              context: options.context
            });
          }
          
          throw lastError;
        }

        // Wait before retrying
        console.warn(`ShuttleAI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${retryDelays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('ShuttleAI request failed after all retries');
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
      sourceContent?: string; // Extracted text from uploaded file
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

    // Add source content instructions if provided
    const sourceContentInstruction = params.sourceContent 
      ? `\n\nSOURCE MATERIAL (Base questions on this content):
---
${params.sourceContent.slice(0, 8000)}${params.sourceContent.length > 8000 ? '\n\n[Content truncated...]' : ''}
---
IMPORTANT: Create questions that directly test knowledge from the source material above. Focus on key concepts, definitions, and important facts from this content.`
      : '';

    const userPrompt = `Create EXACTLY ${params.numberOfQuestions} ${params.difficulty} difficulty test questions about: ${params.topic}${sourceContentInstruction}

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
    const baseTokens = params.sourceContent ? 4000 : 2000; // More tokens if processing source content
    const calculatedTokens = baseTokens + params.numberOfQuestions * estimatedTokensPerQuestion;
    const maxTokens = Math.max(4000, Math.min(calculatedTokens, 16000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'TEST_GENERATION',
      context,
      metadata: { 
        topic: params.topic, 
        numberOfQuestions: params.numberOfQuestions,
        hasSourceContent: !!params.sourceContent 
      },
      creditMultiplier: params.sourceContent ? 2 : 1 // Double credits for file upload
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
      additionalInstructions?: string;
    },
    context?: AIContext
  ): Promise<string> {
    const systemPrompt = `You are an expert educator creating professional, well-designed study guides. Generate a comprehensive study guide using clean HTML with FontAwesome icons for visual appeal.

FORMATTING GUIDELINES - Use FontAwesome icons and styled boxes:

1. SECTION HEADERS with icons:
   <h2><i class="fas fa-book-open"></i> Introduction</h2>
   <h2><i class="fas fa-lightbulb"></i> Key Concepts</h2>
   <h2><i class="fas fa-list"></i> Important Terms</h2>
   <h2><i class="fas fa-pencil-alt"></i> Practice Questions</h2>
   <h2><i class="fas fa-star"></i> Study Tips</h2>
   <h2><i class="fas fa-exclamation-triangle"></i> Common Mistakes</h2>
   <h2><i class="fas fa-check-square"></i> Review Checklist</h2>

2. KEY CONCEPT boxes:
   <div class="key-concept">
     <strong><i class="fas fa-key"></i> Key Concept:</strong> Important information here...
   </div>

3. TIP boxes:
   <div class="tip">
     <strong><i class="fas fa-lightbulb"></i> Study Tip:</strong> Helpful advice here...
   </div>

4. WARNING boxes for common mistakes:
   <div class="warning">
     <strong><i class="fas fa-exclamation-circle"></i> Watch Out:</strong> Common mistake to avoid...
   </div>

5. DEFINITIONS - use definition lists:
   <dl>
     <dt><i class="fas fa-bookmark"></i> Term</dt>
     <dd>Definition of the term...</dd>
   </dl>

6. PRACTICE QUESTIONS:
   <div class="practice-question">
     <strong><i class="fas fa-question-circle"></i> Practice Question:</strong>
     <p>Question text here?</p>
     <details>
       <summary><i class="fas fa-eye"></i> Show Answer</summary>
       <p>Answer explanation here...</p>
     </details>
   </div>

7. CHECKLISTS for review:
   <ul class="checklist">
     <li><i class="far fa-square"></i> Item to review</li>
     <li><i class="far fa-square"></i> Another item</li>
   </ul>

8. Tables for comparisons:
   <table>
     <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>
     <tbody><tr><td>Data</td><td>Data</td></tr></tbody>
   </table>

9. NUMBERED STEPS:
   <ol class="steps">
     <li>First step</li>
     <li>Second step</li>
   </ol>

FONTAWESOME ICONS TO USE:
- <i class="fas fa-book-open"></i> for main sections/introduction
- <i class="fas fa-lightbulb"></i> for tips and ideas
- <i class="fas fa-key"></i> for key concepts
- <i class="fas fa-exclamation-triangle"></i> for warnings
- <i class="fas fa-exclamation-circle"></i> for caution
- <i class="fas fa-question-circle"></i> for questions
- <i class="fas fa-check-circle"></i> for correct/success
- <i class="fas fa-times-circle"></i> for incorrect/avoid
- <i class="fas fa-bookmark"></i> for definitions/terms
- <i class="fas fa-star"></i> for important points
- <i class="fas fa-arrow-right"></i> for implications
- <i class="fas fa-pencil-alt"></i> for practice
- <i class="fas fa-check-square"></i> for checklist headers
- <i class="far fa-square"></i> for unchecked items
- <i class="fas fa-graduation-cap"></i> for learning objectives
- <i class="fas fa-brain"></i> for memory tips

CONTENT REQUIREMENTS:
- Write in a clear, professional academic tone
- Cover ALL key topics from the test questions thoroughly
- Include 4-6 practice questions (DIFFERENT from actual test questions)
- Add helpful memory techniques or study strategies
- End with a review checklist
- Use FontAwesome icons to make it visually organized
- NO emojis - use FontAwesome icons instead

IMPORTANT:
- DO NOT include exact test questions
- DO NOT reveal exact answers from the test
- Create SIMILAR but DIFFERENT practice questions
- Return ONLY the HTML content (no <html>, <head>, or <body> tags)`;

    const questionSummary = params.questions
      .map((q, idx) => `Question ${idx + 1} (${q.type}, ${q.points} pts): Topic - "${q.question.substring(0, 80)}..."`)
      .join('\n');

    let userPrompt = `Create a professional study guide for: "${params.testTitle}"
${params.testDescription ? `Description: ${params.testDescription}` : ''}

The test covers these ${params.questions.length} topics:
${questionSummary}

Generate a comprehensive, well-organized study guide with FontAwesome icons:
1. <i class="fas fa-book-open"></i> Introduction - Brief overview using a key-concept box
2. <i class="fas fa-lightbulb"></i> Key Concepts - Detailed explanations with key-concept and tip boxes
3. <i class="fas fa-list"></i> Important Terms & Definitions - Use definition lists with bookmark icons
4. <i class="fas fa-pencil-alt"></i> Practice Questions - Create 4-6 questions using practice-question boxes with expandable answers
5. <i class="fas fa-star"></i> Study Tips - Use tip boxes with lightbulb icons
6. <i class="fas fa-exclamation-triangle"></i> Common Mistakes - Use warning boxes
7. <i class="fas fa-check-square"></i> Review Checklist - Use checklist with square icons`;

    if (params.additionalInstructions) {
      userPrompt += `\n\nAdditional Instructions from teacher:\n${params.additionalInstructions}`;
    }

    userPrompt += `\n\nUse FontAwesome icons throughout for a professional, organized look. No emojis.`;

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
      sourceContent?: string; // Extracted text from uploaded file
      additionalInstructions?: string;
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

    // Add source content instructions if provided
    const sourceContentInstruction = params.sourceContent 
      ? `\n\nSOURCE MATERIAL (Base worksheet items on this content):
---
${params.sourceContent.slice(0, 8000)}${params.sourceContent.length > 8000 ? '\n\n[Content truncated...]' : ''}
---
IMPORTANT: Create worksheet items that directly test and practice concepts from the source material above. Focus on key concepts, formulas, definitions, and important facts from this content.`
      : '';

    let userPrompt = `Create ${params.numberOfItems} ${params.difficulty} difficulty worksheet items for ${params.subject} about: ${params.topic}${sourceContentInstruction}
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
- difficulty: "easy", "medium", or "hard"`;

    if (params.additionalInstructions) {
      userPrompt += `\n\nAdditional Instructions from teacher:\n${params.additionalInstructions}`;
    }

    userPrompt += `\n\nReturn ONLY the JSON array.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const baseTokensPerItem = params.includeGraphs ? 600 : 300;
    const baseTokens = params.sourceContent ? 3000 : 1500; // More tokens for source content
    const maxTokens = Math.max(4000, Math.min(baseTokens + params.numberOfItems * baseTokensPerItem, 16000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'WORKSHEET_GENERATION',
      context,
      metadata: { 
        topic: params.topic, 
        numberOfItems: params.numberOfItems,
        hasSourceContent: !!params.sourceContent 
      },
      creditMultiplier: params.sourceContent ? 2 : 1 // Double credits for file upload
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
      additionalInstructions?: string;
    },
    context?: AIContext
  ): Promise<Array<{ front: string; back: string }>> {
    const systemPrompt = `You are an expert educator creating flashcards for studying.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start your response directly with [ and end with ]
3. No explanatory text before or after`;

    let userPrompt = `Create ${params.numberOfCards} high-quality flashcards about: ${params.topic}

Return a JSON array where each flashcard object has:
- front: The term, question, or concept (string)
- back: The definition, answer, or explanation (string)

Make the flashcards educational, clear, and useful for studying.`;

    if (params.additionalInstructions) {
      userPrompt += `\n\nAdditional Instructions from teacher:\n${params.additionalInstructions}`;
    }

    userPrompt += `\n\nReturn ONLY the JSON array.`;

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

  // Method to generate flashcards from existing content (test, worksheet, or study guide)
  async generateFlashcardsFromContent(
    params: {
      sourceContent: string;
      sourceName: string;
      numberOfCards: number;
      additionalInstructions?: string;
    },
    context?: AIContext
  ): Promise<Array<{ front: string; back: string }>> {
    const systemPrompt = `You are an expert educator creating flashcards from existing educational content.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start your response directly with [ and end with ]
3. No explanatory text before or after`;

    let userPrompt = `Create ${params.numberOfCards} high-quality flashcards based on this content from "${params.sourceName}":

---
${params.sourceContent.slice(0, 10000)}${params.sourceContent.length > 10000 ? '\n\n[Content truncated...]' : ''}
---

Create flashcards that help students study and memorize the key concepts, facts, and information from this content.

Return a JSON array where each flashcard object has:
- front: The term, question, or concept (string)
- back: The definition, answer, or explanation (string)

Make sure the flashcards:
- Cover the most important concepts from the source material
- Are accurate to the original content
- Are clear and easy to understand
- Are suitable for effective studying`;

    if (params.additionalInstructions) {
      userPrompt += `\n\nAdditional Instructions from teacher:\n${params.additionalInstructions}`;
    }

    userPrompt += `\n\nReturn ONLY the JSON array.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const maxTokens = Math.max(2000, Math.min(params.numberOfCards * 150, 8000));

    const response = await this.makeRequest(messages, maxTokens, {
      type: 'FLASHCARD_GENERATION',
      context,
      metadata: { 
        sourceName: params.sourceName, 
        numberOfCards: params.numberOfCards,
        fromExistingContent: true 
      },
      creditMultiplier: 2 // Double credits for content-based generation
    });

    const cards = this.extractAndRepairJSON(response, true) as Array<{
      front: string;
      back: string;
    }>;

    return cards;
  }
}

export const shuttleAI = new ShuttleAIService();
