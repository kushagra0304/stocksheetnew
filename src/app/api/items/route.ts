import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch last 10 items
export async function GET() {
  try {
    const items = await sql`
      SELECT id, gsm, bill_number, size, rate, bf, shade, bought_from_mill, sold_to, purchase_bill_number, created_at
      FROM items
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Add new item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gsm, bill_number, size, rate, bf, shade, bought_from_mill, sold_to, purchase_bill_number } = body;

    // Validate required fields
    if (!gsm || !bill_number || !size || rate === undefined || rate === null) {
      return NextResponse.json(
        { success: false, error: 'GSM, Bill Number, Size, and Rate are required' },
        { status: 400 }
      );
    }

    // Insert new item
    const result = await sql`
      INSERT INTO items (gsm, bill_number, size, rate, bf, shade, bought_from_mill, sold_to, purchase_bill_number)
      VALUES (${gsm}, ${bill_number}, ${size}, ${rate}, ${bf || null}, ${shade || null}, ${bought_from_mill || null}, ${sold_to || null}, ${purchase_bill_number || null})
      RETURNING id, gsm, bill_number, size, rate, bf, shade, bought_from_mill, sold_to, purchase_bill_number, created_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Item added successfully',
    });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

