import type { ParsedMessage } from '../types';

const LINE_REGEX = /^\[?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[,.\s]?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?)\]?\s*[-:]\s*(.+?)[:]\s(.+)$/im;

const DATE_REGEX = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
const TIME_REGEX = /\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?/;

export function tokenizeWhatsAppExport(content: string): ParsedMessage[] {
  const lines = content.split(/\r?\n/);
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(LINE_REGEX);
    if (match) {
      messages.push({
        raw: line.trim(),
        date: match[1].trim(),
        time: match[2].trim(),
        sender: match[3].trim(),
        text: match[4].trim(),
      });
    } else {
      messages.push({ raw: line.trim(), text: line.trim() });
    }
  }
  return messages;
}

export function extractTextOnly(messages: ParsedMessage[]): string[] {
  return messages.map((m) => m.text).filter(Boolean);
}

export function hasDateOrTimePrefix(text: string): boolean {
  return DATE_REGEX.test(text) || TIME_REGEX.test(text);
}
