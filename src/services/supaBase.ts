const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xaglgjnqbwyissbbukff.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z4WLplTN-tI1WAGdxTn79g_BFHaT1As';

export interface SupabaseUploadInput {
  bucket: string;
  objectPath: string;
  file: File;
  upsert?: boolean;
  accessToken?: string;
}

export const uploadToSupabaseStorage = async (input: SupabaseUploadInput): Promise<string> => {
  const endpoint = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(input.bucket)}/${input.objectPath}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      ...(input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : {}),
      'x-upsert': input.upsert ? 'true' : 'false',
      'Content-Type': input.file.type || 'application/octet-stream',
    },
    body: input.file,
  });

  if (!response.ok) {
    let details = response.statusText;
    try {
      const payload = await response.json() as { error?: string; message?: string };
      details = payload.error || payload.message || details;
    } catch {
      // no-op
    }
    throw new Error(`No se pudo subir archivo a Supabase Storage: ${details}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(input.bucket)}/${input.objectPath}`;
};