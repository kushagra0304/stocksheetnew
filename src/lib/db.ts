import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a Neon serverless SQL client
// Use it with template literals: sql`SELECT * FROM users WHERE id = ${id}`
export const sql = neon(process.env.DATABASE_URL);

