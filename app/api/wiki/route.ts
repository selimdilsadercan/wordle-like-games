import { NextRequest } from 'next/server';

// Simple server-side proxy that fetches the HTML content for a Wikipedia
// article (Turkish Wikipedia) using the REST HTML endpoint and returns it
// as JSON. Default page is `Cem_Karaca` but a `title` query parameter is
// supported for testing.

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const title = (url.searchParams.get('title') || 'Cem_Karaca').trim();

    // Use the Wikipedia REST HTML endpoint which returns rendered HTML for the page
    const apiUrl = `https://tr.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(
      title
    )}`;

    const resp = await fetch(apiUrl, {
      headers: {
        Accept: 'text/html',
        'Api-User-Agent': 'Everydle/1.0 (local)',
      },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Wikipedia returned error', status: resp.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();

    // Return minimal JSON with title and html body. The client can decide how to
    // render this (dangerouslySetInnerHTML or server-side parsing).
    return new Response(JSON.stringify({ title, html }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const runtime = 'nodejs';
