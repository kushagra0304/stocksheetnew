import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - List purchases with their reels
export async function GET() {
  try {
    const purchases = await sql`
      SELECT 
        p.id,
        p.purchase_bill_number,
        p.purchase_bill_date,
        p.company_id,
        c.name as bought_from_mill,
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
      INNER JOIN company c ON c.id = p.company_id
      LEFT JOIN reels r ON r.purchase_id = p.id
      GROUP BY p.id, p.purchase_bill_number, p.purchase_bill_date, p.company_id, c.name, p.created_at
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
    const { purchase_bill_number, purchase_bill_date, company_id, reels } = body;

    // Validate required fields
    if (!purchase_bill_number || !purchase_bill_date || !company_id) {
      return NextResponse.json(
        { success: false, error: 'Purchase Bill Number, Purchase Bill Date, and Company are required' },
        { status: 400 }
      );
    }

    // Validate company_id exists and is a mill
    const company = await sql`
      SELECT id, name, type FROM company WHERE id = ${company_id}
    `;

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 400 }
      );
    }

    if (company[0].type !== 'mill') {
      return NextResponse.json(
        { success: false, error: 'Selected company must be a mill' },
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

    // Check for duplicate reel numbers within this purchase
    // Exception: Skip uniqueness validation for "Malay Enterprise"
    const companyName = (company[0].name || '').trim().toLowerCase();
    const isMalayEnterprise = companyName === 'malay enterprise';
    
    if (!isMalayEnterprise) {
      const reelNumbers = reels.map(reel => (reel.reel_number || '').trim().toLowerCase()).filter(num => num !== '');
      const uniqueReelNumbers = new Set(reelNumbers);
      
      if (reelNumbers.length !== uniqueReelNumbers.size) {
        // Find duplicates
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        
        for (const num of reelNumbers) {
          if (seen.has(num)) {
            duplicates.add(num);
          } else {
            seen.add(num);
          }
        }
        
        const duplicateList = Array.from(duplicates).join(', ');
        return NextResponse.json(
          { 
            success: false, 
            error: `Duplicate reel numbers found: ${duplicateList}. Each reel number must be unique within a purchase.` 
          },
          { status: 400 }
        );
      }
    }

    // Create purchase and reels in a transaction
    const purchase = await sql`
      INSERT INTO purchases (purchase_bill_number, purchase_bill_date, company_id)
      VALUES (${purchase_bill_number}, ${purchase_bill_date}, ${company_id})
      RETURNING id, purchase_bill_number, purchase_bill_date, company_id, created_at
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

    // Return purchase with company name for backward compatibility
    const purchaseWithCompany = {
      ...purchase[0],
      bought_from_mill: company[0].name,
    };

    return NextResponse.json({
      success: true,
      data: {
        purchase: purchaseWithCompany,
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

