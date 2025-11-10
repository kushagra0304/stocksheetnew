# Neon Database Setup

Neon has been integrated into your Next.js project! Follow these steps to complete the setup:

## 1. Create Environment File

Create a `.env.local` file in the root of your project with the following content:

```env
DATABASE_URL=postgresql://neondb_owner:npg_hKIUx4pd6mHY@ep-noisy-base-a4gwws6z-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

## 2. Database Connection

The database connection is set up in `src/lib/db.ts`. You can use it in your code like this:

### In Server Components or API Routes:

```typescript
import { sql } from '@/lib/db';

// Simple query
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;

// With parameters
const users = await sql`SELECT * FROM users WHERE email = ${email}`;
```

### Example API Route:

```typescript
import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await sql`SELECT * FROM users`;
  return NextResponse.json(result);
}
```

## 3. Test the Connection

1. Make sure your `.env.local` file is created with the `DATABASE_URL`
2. Start your dev server: `npm run dev`
3. Visit: `http://localhost:3000/api/test-db`
4. You should see a successful database connection response

## 4. Your Neon Project Details

- **Project ID**: small-salad-31698493
- **Project Name**: stocksheet
- **Database**: neondb
- **Region**: us-east-1 (AWS)

## 5. Next Steps

- Create tables using SQL migrations
- Use the Neon MCP tools to manage your database
- Build your application with type-safe database queries

## Security Note

⚠️ The `.env.local` file is already in `.gitignore` and will not be committed to version control. Keep your database credentials secure!

