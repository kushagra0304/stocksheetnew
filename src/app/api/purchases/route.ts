import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// Hardcoded ENUM values for validation
const BOUGHT_FROM_MILL_OPTIONS = ['Deoria Paper Mills Ltd.', 'Ramaa Shyama Papers Pvt. Ltd.'] as const;

// GET - List purchases with their reels
export async function GET() {
  try {
    const purchases = await sql`
      SELECT 
        p.id,
        p.purchase_bill_number,
        p.purchase_bill_date,
        p.bought_from_mill,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'reel_number', r.reel_number,
              'gsm', r.gsm,
              'size', r.size,
              'size_unit', r.size_unit,
              'bf', r.bf,
              'weight', r.weight,
              'shade', r.shade,
              'rate', r.rate,
              'sale_id', r.sale_id,
              'created_at', r.created_at
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as reels
      FROM purchases p
      LEFT JOIN reels r ON r.purchase_id = p.id
      GROUP BY p.id, p.purchase_bill_number, p.purchase_bill_date, p.bought_from_mill, p.created_at
      ORDER BY p.created_at DESC
    `;
    
    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create purchase + reels
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchase_bill_number, purchase_bill_date, bought_from_mill, reels } = body;

    // Validate required fields
    if (!purchase_bill_number || !purchase_bill_date || !bought_from_mill) {
      return NextResponse.json(
        { success: false, error: 'Purchase Bill Number, Purchase Bill Date, and Bought From Mill are required' },
        { status: 400 }
      );
    }

    // Validate ENUM value
    if (!BOUGHT_FROM_MILL_OPTIONS.includes(bought_from_mill as typeof BOUGHT_FROM_MILL_OPTIONS[number])) {
      return NextResponse.json(
        { success: false, error: `Invalid bought_from_mill value. Must be one of: ${BOUGHT_FROM_MILL_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reels array
    if (!reels || !Array.isArray(reels) || reels.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one reel is required' },
        { status: 400 }
      );
    }

    // Validate each reel
    for (const reel of reels) {
      if (!reel.reel_number || !reel.gsm || !reel.size || !reel.size_unit || 
          reel.bf === undefined || reel.weight === undefined || !reel.shade) {
        return NextResponse.json(
          { success: false, error: 'All reel fields (reel_number, gsm, size, size_unit, bf, weight, shade) are required' },
          { status: 400 }
        );
      }
    }

    // Create purchase and reels in a transaction
    const purchase = await sql`
      INSERT INTO purchases (purchase_bill_number, purchase_bill_date, bought_from_mill)
      VALUES (${purchase_bill_number}, ${purchase_bill_date}, ${bought_from_mill})
      RETURNING id, purchase_bill_number, purchase_bill_date, bought_from_mill, created_at
    `;

    const purchaseId = purchase[0].id;

    // Insert reels (rate is not set during purchase, only during sale)
    const insertedReels = [];
    for (const reel of reels) {
      const result = await sql`
        INSERT INTO reels (purchase_id, reel_number, gsm, size, size_unit, bf, weight, shade)
        VALUES (${purchaseId}, ${reel.reel_number}, ${reel.gsm}, ${reel.size}, ${reel.size_unit}, 
                ${reel.bf}, ${reel.weight}, ${reel.shade})
        RETURNING id, reel_number, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
      `;
      insertedReels.push(result[0]);
    }

    return NextResponse.json({
      success: true,
      data: {
        purchase: purchase[0],
        reels: insertedReels,
      },
      message: 'Purchase and reels created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

