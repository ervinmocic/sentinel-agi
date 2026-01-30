import { NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const settings = await settingsManager.getSettings();

    if (!settings.elevenlabs_api_key) {
      console.error("Missing voice provider API key in settings");
      return NextResponse.json({ error: 'Voice API key not configured' }, { status: 400 });
    }
    if (!settings.elevenlabs_voice_id) {
      console.error("Missing voice provider voice ID in settings");
      return NextResponse.json({ error: 'Voice ID not configured' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const voiceId = settings.elevenlabs_voice_id;
    const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
    url.searchParams.set('output_format', 'mp3_44100_128');

    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'xi-api-key': settings.elevenlabs_api_key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Voice provider API error:', errText); // Log to server console
      return NextResponse.json(
        { error: `Text-to-speech failed: ${upstream.status} ${upstream.statusText}`, details: errText },
        { status: 500 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
