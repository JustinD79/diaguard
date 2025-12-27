/**
 * Educational Q&A Service
 * FDA-SAFE: Provides educational nutrition information only
 * NEVER provides medical advice, diagnosis, or treatment recommendations
 */

export interface QAResponse {
  question: string;
  answer: string;
  category: 'nutrition' | 'food-facts' | 'carbs' | 'general' | 'outside-scope';
  relatedTopics: string[];
  sources?: string[];
  disclaimer: string;
  timestamp: string;
}

export interface QAHistory {
  id: string;
  userId: string;
  question: string;
  answer: string;
  category: string;
  timestamp: string;
}

export class EducationalQAService {
  private static readonly ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  private static readonly OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  /**
   * Ask an educational nutrition question
   */
  static async askQuestion(question: string): Promise<QAResponse> {
    try {
      // Check if question is in scope
      if (this.isOutOfScope(question)) {
        return this.generateOutOfScopeResponse(question);
      }

      // Call AI service
      const answer = await this.callAIForAnswer(question);

      // Categorize question
      const category = this.categorizeQuestion(question);

      // Extract related topics
      const relatedTopics = this.extractRelatedTopics(question, answer);

      return {
        question,
        answer,
        category,
        relatedTopics,
        disclaimer:
          'This is educational information only and does not constitute medical advice. Consult your healthcare provider for personalized guidance.',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in educational Q&A:', error);
      throw new Error('Failed to process question. Please try again.');
    }
  }

  /**
   * Call AI API with FDA-safe educational prompt
   */
  private static async callAIForAnswer(question: string): Promise<string> {
    const prompt = this.buildEducationalPrompt(question);

    if (this.ANTHROPIC_KEY) {
      return this.callClaude(prompt);
    } else if (this.OPENAI_KEY) {
      return this.callOpenAI(prompt);
    } else {
      return this.generateFallbackAnswer(question);
    }
  }

  /**
   * Build FDA-safe educational prompt
   */
  private static buildEducationalPrompt(question: string): string {
    return `You are a nutrition education assistant. Your role is to provide EDUCATIONAL INFORMATION ONLY about nutrition, food, and general dietary concepts.

CRITICAL RULES:
- NEVER provide medical advice, diagnosis, or treatment recommendations
- NEVER calculate or suggest insulin doses
- NEVER interpret blood glucose data or suggest target ranges
- NEVER recommend specific medications or supplements
- NEVER suggest dosing, timing, or changes to medications
- NEVER diagnose conditions or interpret symptoms
- NEVER use directive language like "you should do X" for health decisions
- ALWAYS include educational disclaimers
- If asked about medical topics, respond: "This is a medical question. Please consult your healthcare provider."

WHAT YOU CAN DO:
- Explain general nutrition concepts
- Provide factual information about food composition
- Explain what carbohydrates, proteins, fats, fiber are
- Describe how different foods are generally digested
- Explain glycemic index as an educational concept
- Share general nutrition education
- Describe food preparation methods and their effects on nutrition

User Question: "${question}"

Provide an educational response that follows all rules above. Be helpful and informative while staying strictly within educational bounds.`;
  }

  /**
   * Call Claude AI
   */
  private static async callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.ANTHROPIC_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Claude API error: ${JSON.stringify(data)}`);
    }

    return data.content[0].text;
  }

  /**
   * Call OpenAI
   */
  private static async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a nutrition education assistant. Provide educational information only. Never give medical advice.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data)}`);
    }

    return data.choices[0].message.content;
  }

  /**
   * Generate fallback answer when no API is available
   */
  private static generateFallbackAnswer(question: string): string {
    const category = this.categorizeQuestion(question);

    const fallbackResponses = {
      carbs: `Carbohydrates are one of the three main macronutrients (along with protein and fat). They're found in foods like grains, fruits, vegetables, and dairy products. The body breaks down carbs into glucose for energy. Different types of carbs are digested at different rates - simple carbs digest quickly, while complex carbs with fiber digest more slowly. This is general nutrition education. For personalized dietary guidance, please consult your healthcare provider or registered dietitian.`,

      nutrition: `Nutrition is a complex field that studies how food affects the body. A balanced diet typically includes a variety of foods from different food groups. The specific nutritional needs vary greatly between individuals based on many factors including age, activity level, health status, and personal goals. For personalized nutrition advice, please consult with a registered dietitian or healthcare provider.`,

      'food-facts': `Foods contain various nutrients including carbohydrates, proteins, fats, vitamins, minerals, and fiber. Each plays different roles in the body. The nutritional content of foods can vary based on preparation methods, freshness, and other factors. Reading nutrition labels can help you understand what's in your food. For specific dietary recommendations, consult a healthcare professional.`,

      general: `This is a nutrition education topic. While I can provide general educational information, specific dietary guidance should come from your healthcare provider or a registered dietitian who can consider your individual health status and needs.`,
    };

    return (
      fallbackResponses[category as keyof typeof fallbackResponses] ||
      fallbackResponses.general
    );
  }

  /**
   * Check if question is out of scope (asking for medical advice)
   */
  private static isOutOfScope(question: string): boolean {
    const medicalKeywords = [
      'diagnose',
      'cure',
      'treat',
      'prescription',
      'dosage',
      'insulin dose',
      'blood sugar target',
      'a1c goal',
      'ketones',
      'dka',
      'hypoglycemia symptoms',
      'medication',
      'drug',
      'supplement',
    ];

    const lowerQuestion = question.toLowerCase();
    return medicalKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Generate response for out-of-scope questions
   */
  private static generateOutOfScopeResponse(question: string): QAResponse {
    return {
      question,
      answer:
        'This question appears to be asking for medical advice, diagnosis, or treatment recommendations. I can only provide general nutrition education. Please consult your healthcare provider, doctor, or registered dietitian for personalized medical guidance. They can consider your specific health status, medications, and individual needs to provide appropriate recommendations.',
      category: 'outside-scope',
      relatedTopics: [
        'When to consult a healthcare provider',
        'The role of registered dietitians',
        'Finding diabetes education programs',
      ],
      disclaimer:
        'This service provides educational information only and cannot replace medical advice from qualified healthcare professionals.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Categorize question type
   */
  private static categorizeQuestion(question: string): QAResponse['category'] {
    const lowerQuestion = question.toLowerCase();

    if (
      lowerQuestion.includes('carb') ||
      lowerQuestion.includes('carbohydrate') ||
      lowerQuestion.includes('sugar')
    ) {
      return 'carbs';
    }

    if (
      lowerQuestion.includes('protein') ||
      lowerQuestion.includes('fat') ||
      lowerQuestion.includes('fiber') ||
      lowerQuestion.includes('vitamin') ||
      lowerQuestion.includes('mineral')
    ) {
      return 'nutrition';
    }

    if (
      lowerQuestion.includes('food') ||
      lowerQuestion.includes('eat') ||
      lowerQuestion.includes('ingredient')
    ) {
      return 'food-facts';
    }

    return 'general';
  }

  /**
   * Extract related topics from question and answer
   */
  private static extractRelatedTopics(question: string, answer: string): string[] {
    const topics: string[] = [];

    const keywordTopics: Record<string, string> = {
      carb: 'Understanding Carbohydrates',
      fiber: 'Dietary Fiber',
      protein: 'Protein in Diet',
      'glycemic index': 'Glycemic Index Explained',
      'whole grain': 'Whole Grains vs Refined Grains',
      vegetable: 'Vegetable Nutrition',
      fruit: 'Fruit and Natural Sugars',
    };

    const combined = (question + ' ' + answer).toLowerCase();

    Object.entries(keywordTopics).forEach(([keyword, topic]) => {
      if (combined.includes(keyword)) {
        topics.push(topic);
      }
    });

    // Limit to 3-5 topics
    return topics.slice(0, 5);
  }

  /**
   * Get common nutrition questions
   */
  static getCommonQuestions(): Array<{ question: string; category: string }> {
    return [
      { question: 'What are carbohydrates?', category: 'nutrition' },
      { question: 'What is the difference between simple and complex carbs?', category: 'carbs' },
      { question: 'What is dietary fiber?', category: 'nutrition' },
      { question: 'What is the glycemic index?', category: 'carbs' },
      { question: 'What foods are high in protein?', category: 'food-facts' },
      { question: 'How does cooking affect nutrition?', category: 'food-facts' },
      { question: 'What is net carbs?', category: 'carbs' },
      { question: 'What are macronutrients?', category: 'nutrition' },
      {
        question: 'What is the difference between natural and added sugars?',
        category: 'nutrition',
      },
      { question: 'What foods contain hidden carbs?', category: 'food-facts' },
    ];
  }

  /**
   * Generate educational summary
   */
  static generateSummary(responses: QAResponse[]): string {
    if (responses.length === 0) {
      return 'No questions asked yet. Start by asking a nutrition education question!';
    }

    const lines: string[] = [];
    lines.push(`📚 Your Learning Summary`);
    lines.push(`Total questions: ${responses.length}`);
    lines.push('');

    const categories = responses.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    lines.push('Topics explored:');
    Object.entries(categories).forEach(([category, count]) => {
      lines.push(`• ${category}: ${count} questions`);
    });

    lines.push('');
    lines.push('💡 Keep exploring nutrition education to learn more!');

    return lines.join('\n');
  }
}
