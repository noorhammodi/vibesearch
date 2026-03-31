import { pipeline } from '@xenova/transformers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embedder;
}

export async function getEmbedding(text: string) {
  const model = await getEmbedder();
  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  });

  return output.data;
}