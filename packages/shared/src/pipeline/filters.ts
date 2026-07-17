import type { ParsedMessage } from '../types';
import { IGNORE_KEYWORDS } from '../constants';

const EMOJI_REGEX = /[\u2600-\u27BF\u2B50\uFE0F]/gu;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const REPLY_REGEX = /^[\s]*[¯|^~><].*$/m;
const FORWARD_REGEX = /reenviado|forwarded|forward|fwd/i;

export function isRelevantMessage(msg: ParsedMessage): boolean {
  const text = msg.text;

  if (!text || text.length < 4) return false;
  if (isSystemMessage(text)) return false;
  if (isMediaMessage(text)) return false;
  if (isForwardedMessage(text)) return false;
  if (isReplyMessage(text)) return false;
  if (hasOnlyIgnoreKeywords(text)) return false;
  if (isUrlOnly(text)) return false;

  return true;
}

export function cleanText(text: string): string {
  return text
    .replace(EMOJI_REGEX, '')
    .replace(URL_REGEX, '')
    .replace(REPLY_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSystemMessage(text: string): boolean {
  const patterns = [
    /messages and calls are end-to-end encrypted/i,
    /this message was edited/i,
    /omitted/i,
    /joined using this group/i,
    /left/i,
    /removed/i,
    /changed the group/i,
    /changed this group/i,
    /security code changed/i,
    /your security code/i,
    /created group/i,
    /added/i,
    /encrypted/i,
  ];
  return patterns.some((p) => p.test(text));
}

export function isMediaMessage(text: string): boolean {
  return /<media\s*omitted>/i.test(text) || /imagen|image|video|audio|documento?|sticker|gif|pegado|reemplazado/i.test(text);
}

export function isForwardedMessage(text: string): boolean {
  return FORWARD_REGEX.test(text);
}

export function isReplyMessage(text: string): boolean {
  return REPLY_REGEX.test(text) || text.startsWith('~') || text.startsWith('^') || text.startsWith('|') || /mensaje\s+citado/i.test(text);
}

export function hasOnlyIgnoreKeywords(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  return IGNORE_KEYWORDS.some((kw) => lowered === kw || lowered.startsWith(kw));
}

export function isUrlOnly(text: string): boolean {
  const cleaned = text.replace(URL_REGEX, '').trim();
  return cleaned.length === 0;
}

export function filterMessages(messages: ParsedMessage[]): ParsedMessage[] {
  return messages.filter(isRelevantMessage);
}
