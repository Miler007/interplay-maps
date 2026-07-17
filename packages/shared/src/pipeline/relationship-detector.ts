import type { ExtractedRelationship, DetectedEntityType } from '../types';
import { RELATIONSHIP_PATTERNS } from '../constants';

export interface RelationshipDetectorStrategy {
  name: string;
  detect(text: string): ExtractedRelationship | null;
}

const KNOWN_TYPES: DetectedEntityType[] = ['CAJA', 'MUFFLE', 'CTO', 'SPLITTER', 'POSTE', 'NODO'];

function detectType(code: string): DetectedEntityType {
  const up = code.toUpperCase();
  if (up.startsWith('B') || up.startsWith('CAJ')) return 'CAJA';
  if (up.startsWith('M') || up.startsWith('MUF')) return 'MUFFLE';
  if (up.startsWith('CTO')) return 'CTO';
  if (up.startsWith('SPL')) return 'SPLITTER';
  if (up.startsWith('POS') || up.startsWith('P')) return 'POSTE';
  if (up.startsWith('NOD')) return 'NODO';
  return 'CAJA';
}

export class RegexRelationshipDetector implements RelationshipDetectorStrategy {
  name = 'regex-relationship-detector';

  detect(text: string): ExtractedRelationship | null {
    const lowered = text.toLowerCase();

    for (const { regex, relationType } of RELATIONSHIP_PATTERNS) {
      const match = lowered.match(regex);
      if (!match) continue;

      const groups = match.slice(1).filter(Boolean);
      if (groups.length === 1) {
        return {
          sourceCode: groups[0],
          sourceType: detectType(groups[0]),
          relationType,
          rawText: match[0],
          confidence: 0.75,
        };
      }
      if (groups.length >= 2) {
        return {
          sourceCode: groups[0],
          sourceType: detectType(groups[0]),
          targetCode: groups[1],
          targetType: detectType(groups[1]),
          relationType,
          rawText: match[0],
          confidence: 0.85,
        };
      }
    }
    return null;
  }
}

export class PatternRelationshipDetector implements RelationshipDetectorStrategy {
  name = 'pattern-relationship-detector';

  detect(text: string): ExtractedRelationship | null {
    const lowered = text.toLowerCase();

    const dropPattern = /drop\s+(?:desde|de)\s+(?:la\s*)?(\w[\w.\-]+)/i;
    const dropMatch = lowered.match(dropPattern);
    if (dropMatch) {
      return {
        sourceCode: dropMatch[1].toUpperCase(),
        sourceType: detectType(dropMatch[1]),
        relationType: 'ALIMENTADO_POR',
        targetCode: undefined,
        rawText: dropMatch[0],
        confidence: 0.7,
        description: `Drop desde ${dropMatch[1]}`,
      };
    }

    const feedPattern = /(\w[\w.\-]+)\s+(?:alimenta|conecta|abastece)\s+(?:a\s+)?(?:la\s*)?(\w[\w.\-]+)/i;
    const feedMatch = lowered.match(feedPattern);
    if (feedMatch) {
      return {
        sourceCode: feedMatch[1].toUpperCase(),
        sourceType: detectType(feedMatch[1]),
        targetCode: feedMatch[2].toUpperCase(),
        targetType: detectType(feedMatch[2]),
        relationType: 'ALIMENTA_A',
        rawText: feedMatch[0],
        confidence: 0.8,
        description: `${feedMatch[1]} alimenta ${feedMatch[2]}`,
      };
    }

    const fromToPattern = /(?:desde|de)\s+(?:la\s*)?(\w[\w.\-]+)\s+(?:a|hasta|hacia)\s+(?:la\s*)?(\w[\w.\-]+)/i;
    const fromToMatch = lowered.match(fromToPattern);
    if (fromToMatch) {
      return {
        sourceCode: fromToMatch[1].toUpperCase(),
        sourceType: detectType(fromToMatch[1]),
        targetCode: fromToMatch[2].toUpperCase(),
        targetType: detectType(fromToMatch[2]),
        relationType: 'CONECTADO_A',
        rawText: fromToMatch[0],
        confidence: 0.7,
        description: `${fromToMatch[1]} → ${fromToMatch[2]}`,
      };
    }

    return null;
  }
}

export class RelationshipDetectorOrchestrator {
  private strategies: RelationshipDetectorStrategy[];

  constructor(strategies?: RelationshipDetectorStrategy[]) {
    this.strategies = strategies || [
      new RegexRelationshipDetector(),
      new PatternRelationshipDetector(),
    ];
  }

  registerStrategy(strategy: RelationshipDetectorStrategy): void {
    this.strategies.push(strategy);
  }

  detectAll(text: string): ExtractedRelationship[] {
    const results: ExtractedRelationship[] = [];
    const seen = new Set<string>();

    for (const strategy of this.strategies) {
      try {
        const rel = strategy.detect(text);
        if (rel && rel.confidence > 0.4) {
          const key = `${rel.sourceCode || ''}-${rel.targetCode || ''}-${rel.relationType}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(rel);
          }
        }
      } catch {
        // skip failed strategy
      }
    }

    return results;
  }
}
