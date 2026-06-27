import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads a required environment variable and fails fast with a clear message
 * if it is missing. Catching this at boot is far nicer than a cryptic crash
 * the first time someone tries to save a document.
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Copy server/.env.example to server/.env and fill it in.'
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
