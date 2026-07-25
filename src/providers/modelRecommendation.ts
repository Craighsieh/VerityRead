import type { ProviderStatus } from '@/shared/types';

export interface OllamaModelDescriptor {
  name: string;
  size?: number;
  parameterSize?: string;
  family?: string;
}

export interface OllamaModelRecommendation {
  model: OllamaModelDescriptor;
  reason: string;
  deviceMemoryGb?: number;
}

const EMBEDDING_MARKERS = ['embed', 'nomic', 'minilm', 'bge-', 'e5-'];

export function getDeviceMemoryGb(): number | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === 'number' && memory > 0 ? memory : undefined;
}

export function getOllamaModelDescriptors(
  status: ProviderStatus | null,
): OllamaModelDescriptor[] {
  const details = status?.details;
  const modelInfo = details?.modelInfo;
  if (Array.isArray(modelInfo)) {
    return modelInfo.flatMap((candidate) => {
      if (
        typeof candidate !== 'object' ||
        candidate === null ||
        !('name' in candidate) ||
        typeof candidate.name !== 'string'
      ) {
        return [];
      }
      return [
        {
          name: candidate.name,
          size:
            'size' in candidate && typeof candidate.size === 'number'
              ? candidate.size
              : undefined,
          parameterSize:
            'parameterSize' in candidate && typeof candidate.parameterSize === 'string'
              ? candidate.parameterSize
              : undefined,
          family:
            'family' in candidate && typeof candidate.family === 'string'
              ? candidate.family
              : undefined,
        },
      ];
    });
  }

  const models = details?.models;
  return Array.isArray(models)
    ? models.flatMap((model) => (typeof model === 'string' ? [{ name: model }] : []))
    : [];
}

export function parseParameterBillions(model: OllamaModelDescriptor): number | undefined {
  const candidates = [model.parameterSize, model.name];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = /(?:^|[:_\-\s])e?(\d+(?:\.\d+)?)\s*b(?:$|[:_\-\s])/i.exec(candidate);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

function isEmbeddingModel(model: OllamaModelDescriptor): boolean {
  const haystack = `${model.name} ${model.family ?? ''}`.toLowerCase();
  return EMBEDDING_MARKERS.some((marker) => haystack.includes(marker));
}

function recommendationScore(
  model: OllamaModelDescriptor,
  deviceMemoryGb?: number,
): number {
  const parameterBillions = parseParameterBillions(model);
  const targetBillions =
    deviceMemoryGb == null ? 5 : deviceMemoryGb <= 8 ? 4 : deviceMemoryGb <= 16 ? 6 : 9;
  if (parameterBillions != null) {
    return parameterBillions <= targetBillions
      ? 100 - Math.abs(targetBillions - parameterBillions) * 4
      : 72 - (parameterBillions - targetBillions) * 7;
  }

  if (model.size != null) {
    const sizeGb = model.size / 1024 ** 3;
    const targetFileGb = deviceMemoryGb == null ? 4 : Math.max(2, deviceMemoryGb * 0.3);
    return sizeGb <= targetFileGb
      ? 80 - Math.abs(targetFileGb - sizeGb) * 3
      : 55 - (sizeGb - targetFileGb) * 5;
  }
  return 40;
}

export function recommendOllamaModel(
  models: OllamaModelDescriptor[],
  deviceMemoryGb = getDeviceMemoryGb(),
): OllamaModelRecommendation | null {
  const candidates = models.filter((model) => !isEmbeddingModel(model));
  if (!candidates.length) return null;
  const model = [...candidates].sort(
    (a, b) =>
      recommendationScore(b, deviceMemoryGb) - recommendationScore(a, deviceMemoryGb) ||
      a.name.localeCompare(b.name),
  )[0];
  if (!model) return null;

  const parameterBillions = parseParameterBillions(model);
  const sizeDescription =
    parameterBillions != null
      ? `${parameterBillions}B`
      : model.size != null
        ? `${(model.size / 1024 ** 3).toFixed(1)} GB`
        : 'a moderate installed model';
  return {
    model,
    deviceMemoryGb,
    reason: `Balanced local reading choice (${sizeDescription})${
      deviceMemoryGb ? ` for a ${deviceMemoryGb} GB device` : ''
    }.`,
  };
}

export function modelChoiceLabel(
  model: OllamaModelDescriptor,
  recommendation: OllamaModelRecommendation | null,
): string {
  if (!recommendation) return model.name;
  if (model.name === recommendation.model.name) {
    return `${model.name} — Recommended`;
  }

  const modelParameters = parseParameterBillions(model);
  const recommendedParameters = parseParameterBillions(recommendation.model);
  if (modelParameters != null && recommendedParameters != null) {
    return modelParameters < recommendedParameters
      ? `${model.name} — Faster`
      : `${model.name} — Higher capacity`;
  }
  if (model.size != null && recommendation.model.size != null) {
    return model.size < recommendation.model.size
      ? `${model.name} — Faster`
      : `${model.name} — Higher capacity`;
  }
  return model.name;
}
