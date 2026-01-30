import { NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings';

export async function GET(req: Request) {
  try {
    const settings = await settingsManager.getSettings();
    const siteUrl = settings.wordpress_site_url?.trim();
    const secret = settings.wordpress_secret_key?.trim();

    if (!siteUrl) {
      return NextResponse.json({ error: 'WordPress site URL not configured' }, { status: 400 });
    }
    if (!secret) {
      return NextResponse.json({ error: 'WordPress secret key not configured' }, { status: 400 });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'today';

    const endpoint = new URL('/wp-json/sentinel/v1/stats', siteUrl);
    endpoint.searchParams.set('range', range);

    const upstream = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'X-Sentinel-Key': secret,
        'Accept': 'application/json',
      },
      // avoid caching between requests
      cache: 'no-store',
    });

    const text = await upstream.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `WordPress stats request failed: ${upstream.status} ${upstream.statusText}`, details: json },
        { status: 500 }
      );
    }

    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

