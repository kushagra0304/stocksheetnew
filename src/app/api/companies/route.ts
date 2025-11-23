import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - List all companies (optionally filter by type)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'mill' or 'customer'

    let companies;
    if (type && (type === 'mill' || type === 'customer')) {
      companies = await sql`
        SELECT id, name, type, created_at, updated_at
        FROM company
        WHERE type = ${type}
        ORDER BY name ASC
      `;
    } else {
      companies = await sql`
        SELECT id, name, type, created_at, updated_at
        FROM company
        ORDER BY type ASC, name ASC
      `;
    }

    return NextResponse.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create new company
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type enum
    if (type !== 'mill' && type !== 'customer') {
      return NextResponse.json(
        { success: false, error: "Type must be either 'mill' or 'customer'" },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company name cannot be empty' },
        { status: 400 }
      );
    }

    // Check for duplicate name (database will also enforce this, but we can give a better error)
    const existing = await sql`
      SELECT id FROM company WHERE name = ${name.trim()}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    // Insert new company
    const result = await sql`
      INSERT INTO company (name, type)
      VALUES (${name.trim()}, ${type})
      RETURNING id, name, type, created_at, updated_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Company created successfully',
    });
  } catch (error) {
    console.error('Error creating company:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

