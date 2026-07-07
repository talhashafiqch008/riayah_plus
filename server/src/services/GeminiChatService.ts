import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Aria, the AI health assistant for Riayah Plus HealthOS. 
You help clients and care providers with health questions, appointment guidance, care plan advice, 
and general wellness support in Qatar. Be empathetic, concise, and always recommend consulting 
a qualified healthcare professional for medical advice. Do not diagnose or prescribe. 
Respond in the user's language (Arabic or English).`;

export class GeminiChatService {
  private static activeSessions = new Map<string, ChatSession>();

  static async sendMessage(
    userId: string,
    conversationId: string,
    message: string
  ): Promise<string> {
    let session = GeminiChatService.activeSessions.get(conversationId);

    if (!session) {
      // Load conversation history
      const history = await GeminiChatService.loadHistory(conversationId);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      session = model.startChat({
        history,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        systemInstruction: SYSTEM_PROMPT,
      });
      GeminiChatService.activeSessions.set(conversationId, session);
    }

    try {
      const result = await session.sendMessage(message);
      const responseText = result.response.text();

      // Persist messages
      await prisma.message.createMany({
        data: [
          { conversationId, senderId: userId, content: message, type: 'text' },
          { conversationId, senderId: 'ai', content: responseText, type: 'ai_response' },
        ],
      });

      return responseText;
    } catch (err) {
      logger.error('Gemini API error', { conversationId, err });
      throw new Error('AI service temporarily unavailable. Please try again.');
    }
  }

  static async streamMessage(
    userId: string,
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let session = GeminiChatService.activeSessions.get(conversationId);

    if (!session) {
      const history = await GeminiChatService.loadHistory(conversationId);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      session = model.startChat({
        history,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        systemInstruction: SYSTEM_PROMPT,
      });
      GeminiChatService.activeSessions.set(conversationId, session);
    }

    const result = await session.sendMessageStream(message);
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      onChunk(text);
    }

    await prisma.message.createMany({
      data: [
        { conversationId, senderId: userId, content: message, type: 'text' },
        { conversationId, senderId: 'ai', content: fullText, type: 'ai_response' },
      ],
    });

    return fullText;
  }

  private static async loadHistory(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // last 20 messages for context
    });

    return messages.map(msg => ({
      role: msg.senderId === 'ai' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content ?? '' }],
    }));
  }

  static clearSession(conversationId: string): void {
    GeminiChatService.activeSessions.delete(conversationId);
  }
}
