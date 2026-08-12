import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = body?.text ?? '';
    const target: string = body?.target ?? 'en';

    if (!text) return NextResponse.json({ translated: '' });

    try {
      // dynamic import of the installed 'translate' package
      const mod = await import('translate');
      // package may export default or be callable
      const translatePkg = (mod && (mod.default || mod)) as any;
      if (typeof translatePkg === 'function') {
        const translated = await translatePkg(text, { to: target });
        return NextResponse.json({ translated: translated ?? text });
      }
    } catch (err) {
      // fall through to libretranslate fallback
      console.warn('translate package failed, falling back to libretranslate', err);
    }

    // fallback: LibreTranslate public instance
    try {
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' }),
      });
      const d = await res.json();
      return NextResponse.json({ translated: d.translatedText || text });
    } catch (err) {
      console.error('libretranslate fallback failed', err);
      return NextResponse.json({ translated: text });
    }
  } catch (err) {
    console.error('translate route error', err);
    return NextResponse.json({ translated: '' }, { status: 500 });
  }
}
