import { AppError } from '../middleware/errorHandler';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?|context)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+|an?\s+)/i,
  /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|training|rules)/i,
  /system\s+prompt\s*:/i,
  /\bdan\b.*\bdo\s+anything\s+now\b/i,
  /jailbreak/i,
  /override\s+your\s+(instructions?|programming|rules)/i,
  /\[\s*system\s*\]/i,
  /<\s*system\s*>/i,
];

/**
 * Throws 422 if the message contains known prompt-injection patterns.
 * Not a silver bullet — adds a basic guard layer before LLM forwarding.
 */
export function assertContentPolicy(input: string): void {
  if (input.length > 10_000) {
    throw new AppError('Message exceeds maximum allowed length.', 422);
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new AppError('Message contains disallowed content.', 422);
    }
  }
}
