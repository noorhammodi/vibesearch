import { NextResponse } from 'next/server';
import { rankResults } from '@/lib/ranking';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const results = await rankResults(prompt);

  return NextResponse.json({ results });
}