import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Example query - test database connection
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Database connection successful!',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

