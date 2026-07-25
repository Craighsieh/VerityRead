import { describe, expect, it } from 'vitest';
import {
  getOllamaModelDescriptors,
  modelChoiceLabel,
  parseParameterBillions,
  recommendOllamaModel,
} from '@/providers/modelRecommendation';
import type { ProviderStatus } from '@/shared/types';

describe('Ollama model recommendation', () => {
  it('reads installed model metadata from a health result', () => {
    const status: ProviderStatus = {
      id: 'ollama',
      displayName: 'Ollama',
      healthy: true,
      availability: 'available',
      details: {
        modelInfo: [
          {
            name: 'gemma4:e4b',
            size: 3_200_000_000,
            parameterSize: '4.0B',
            family: 'gemma4',
          },
        ],
      },
    };

    expect(getOllamaModelDescriptors(status)).toEqual([
      {
        name: 'gemma4:e4b',
        size: 3_200_000_000,
        parameterSize: '4.0B',
        family: 'gemma4',
      },
    ]);
  });

  it('recommends a moderate generation model for an 8 GB device', () => {
    const models = [
      { name: 'qwen3:1.7b', parameterSize: '1.7B' },
      { name: 'gemma4:e4b', parameterSize: '4.0B' },
      { name: 'qwen3:14b', parameterSize: '14B' },
      { name: 'nomic-embed-text:latest', parameterSize: '137M' },
    ];

    const recommendation = recommendOllamaModel(models, 8);

    expect(recommendation?.model.name).toBe('gemma4:e4b');
    expect(recommendation?.reason).toContain('8 GB device');
    expect(modelChoiceLabel(models[1]!, recommendation)).toContain('Recommended');
    expect(modelChoiceLabel(models[0]!, recommendation)).toContain('Faster');
  });

  it('parses expert-size model tags', () => {
    expect(parseParameterBillions({ name: 'gemma4:e4b' })).toBe(4);
  });
});
