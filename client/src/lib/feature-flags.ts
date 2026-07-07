export const AI_FEATURES = {
    geminiChat: import.meta.env.VITE_ENABLE_GEMINI_CHAT !== 'false',
    perplexity: import.meta.env.VITE_ENABLE_PERPLEXITY !== 'false',
    speechRecognition: import.meta.env.VITE_ENABLE_SPEECH !== 'false',
} as const;

export function isAIFeatureEnabled(feature: keyof typeof AI_FEATURES): boolean {
    return AI_FEATURES[feature];
}
