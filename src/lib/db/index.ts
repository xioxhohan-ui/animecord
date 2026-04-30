import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// We use a getter to lazily initialize the connection only when needed.
// This prevents the "No database connection string" error during Vercel builds.
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

// Create a proxy or a lazy-loaded DB instance
// Use a realistic dummy string to pass neon's validation during build
const dummy = 'postgresql://db_user:db_password@db_host.neon.tech/db_name?sslmode=require';

if (!connectionString && typeof window === 'undefined') {
  console.warn('⚠️ No database connection string found. Using build-time dummy fallback.');
}

export const db = drizzle(neon(connectionString || dummy), { schema });
