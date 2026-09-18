/** Own mode always uses a LUT's published image when available. */
export interface OwnStill {
  before: string | null;
  after: string;
}

export type Preview =
  | { kind: 'own'; before: string | null; after: string }
  | { kind: 'shared'; sampleId: string; before: string; after: string };

export interface PreviewInput {
  code: string;
  own: OwnStill | null;
  fallbackId: string;
  /** The before a look is compared against on a shared frame. */
  beforeFrame: (sampleId: string) => string;
}

export function sharedRender(sampleId: string, code: string): string {
  return `sample/${sampleId}/${code}.webp`;
}

export function choosePreview(input: PreviewInput): Preview {
  if (input.own) {
    return { kind: 'own', before: input.own.before, after: input.own.after };
  }
  return {
    kind: 'shared',
    sampleId: input.fallbackId,
    before: input.beforeFrame(input.fallbackId),
    after: sharedRender(input.fallbackId, input.code),
  };
}
