import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// Hardcoded ENUM values from database schema
const SHADE_OPTIONS = ['GY', 'NS'] as const;

// Interface for company query result
interface CompanyResult {
  id: number;
  name: string;
}

// GET - Fetch ENUM options for shade, bought_from_mill, and sold_to
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');

    if (!field || !['shade', 'bought_from_mill', 'sold_to'].includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field parameter' },
        { status: 400 }
      );
    }

    // Return hardcoded ENUM values for shade
    if (field === 'shade') {
      return NextResponse.json({ success: true, data: [...SHADE_OPTIONS] });
    }

    // Query company table for bought_from_mill (mills) or sold_to (customers)
    let companies: CompanyResult[];
    if (field === 'bought_from_mill') {
      companies = await sql`
        SELECT id, name
        FROM company
        WHERE type = 'mill'
        ORDER BY name ASC
      ` as CompanyResult[];
    } else {
      // sold_to
      companies = await sql`
        SELECT id, name
        FROM company
        WHERE type = 'customer'
        ORDER BY name ASC
      ` as CompanyResult[];
    }

    // Return array of company names (for backward compatibility with existing frontend)
    const options = companies.map(c => c.name);

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

