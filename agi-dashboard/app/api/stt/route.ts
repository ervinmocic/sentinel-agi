import { NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const audioFile = incoming.get('audio') as unknown as Blob;
    
    if (!audioFile) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const settings = await settingsManager.getSettings();
    if (!settings.elevenlabs_api_key) {
      return NextResponse.json({ error: 'Voice API key not configured' }, { status: 400 });
    }

    const form = new FormData();
    form.append('model_id', 'scribe_v2');
    // @ts-ignore - Next runtime provides File in most environments
    const file = typeof File !== 'undefined'
      // @ts-ignore
      ? new File([audioFile], 'audio.webm', { type: (audioFile as any).type || 'audio/webm' })
      : audioFile;
    // @ts-ignore - undici FormData supports filename as 3rd param
    form.append('file', file as any, 'audio.webm');

    const upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': settings.elevenlabs_api_key,
      },
      body: form as any,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `Speech-to-text failed: ${upstream.status} ${upstream.statusText}`, details: errText },
        { status: 500 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error: any) {
    console.error('STT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
