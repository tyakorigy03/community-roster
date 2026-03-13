import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const publicId = url.searchParams.get('id');
    const filename = url.searchParams.get('filename') || 'document.pdf';

    if (!publicId) {
      return new Response(JSON.stringify({ error: 'Missing required parameter: id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    /* ---------------- SECURE CLOUDINARY CONFIG (No Fallbacks) ---------------- */
    const config = {
      cloudName: Deno.env.get('CLOUDINARY_CLOUD_NAME')!,
      apiKey: Deno.env.get('CLOUDINARY_API_KEY')!,
      apiSecret: Deno.env.get('CLOUDINARY_API_SECRET')!,
    };

    const downloadUrl = await generateCloudinaryDownloadUrl(publicId, filename, config);

    return new Response(null, {
      status: 322, // Use 302 for redirect
      headers: { 'Location': downloadUrl, 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

async function generateCloudinaryDownloadUrl(publicId: string, filename: string, config: { cloudName: string; apiKey: string; apiSecret: string }): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { attachment: 'true', public_id: publicId, target_filename: filename, timestamp: timestamp.toString(), type: 'upload' };
  const sortedParams = Object.keys(paramsToSign).sort().map(key => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`).join('&');
  const stringToSign = `${sortedParams}${config.apiSecret}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `https://api.cloudinary.com/v1_1/${config.cloudName}/image/download?api_key=${config.apiKey}&attachment=true&public_id=${publicId}&target_filename=${encodeURIComponent(filename)}&timestamp=${timestamp}&type=upload&signature=${signature}`;
}
