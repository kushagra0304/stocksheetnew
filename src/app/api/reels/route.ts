import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - List reels with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchase_id');
    const saleId = searchParams.get('sale_id');
    const available = searchParams.get('available'); // 'true' to get only unsold reels

    // Build query based on filters
    let query;
    
    if (available === 'true') {
      // Available reels (unsold) - can optionally filter by purchase_id
      if (purchaseId) {
        query = sql`
          SELECT 
            r.id,
            r.reel_number,
            r.purchase_id,
            r.sale_id,
            r.gsm,
            r.size,
            r.size_unit,
            r.bf,
            r.weight,
            r.shade,
            r.rate,
            r.created_at,
            p.purchase_bill_number,
            p.purchase_bill_date,
            c.name as bought_from_mill
          FROM reels r
          INNER JOIN purchases p ON p.id = r.purchase_id
          INNER JOIN company c ON c.id = p.company_id
          WHERE r.sale_id IS NULL AND r.purchase_id = ${parseInt(purchaseId)}
          ORDER BY p.purchase_bill_date DESC
        `;
      } else {
        query = sql`
          SELECT 
            r.id,
            r.reel_number,
            r.purchase_id,
            r.sale_id,
            r.gsm,
            r.size,
            r.size_unit,
            r.bf,
            r.weight,
            r.shade,
            r.rate,
            r.created_at,
            p.purchase_bill_number,
            p.purchase_bill_date,
            c.name as bought_from_mill
          FROM reels r
          INNER JOIN purchases p ON p.id = r.purchase_id
          INNER JOIN company c ON c.id = p.company_id
          WHERE r.sale_id IS NULL
          ORDER BY p.purchase_bill_date DESC
        `;
      }
    } else if (purchaseId && saleId) {
      query = sql`
        SELECT 
          r.id,
          r.reel_number,
          r.purchase_id,
          r.sale_id,
          r.gsm,
          r.size,
          r.size_unit,
          r.bf,
          r.weight,
          r.shade,
          r.rate,
          r.created_at,
          p.purchase_bill_number,
          p.purchase_bill_date,
          c.name as bought_from_mill
        FROM reels r
        INNER JOIN purchases p ON p.id = r.purchase_id
        INNER JOIN company c ON c.id = p.company_id
        WHERE r.purchase_id = ${parseInt(purchaseId)} AND r.sale_id = ${parseInt(saleId)}
        ORDER BY r.created_at DESC
      `;
    } else if (purchaseId) {
      query = sql`
        SELECT 
          r.id,
          r.reel_number,
          r.purchase_id,
          r.sale_id,
          r.gsm,
          r.size,
          r.size_unit,
          r.bf,
          r.weight,
          r.shade,
          r.rate,
          r.created_at,
          p.purchase_bill_number,
          p.purchase_bill_date,
          c.name as bought_from_mill
        FROM reels r
        INNER JOIN purchases p ON p.id = r.purchase_id
        INNER JOIN company c ON c.id = p.company_id
        WHERE r.purchase_id = ${parseInt(purchaseId)}
        ORDER BY r.created_at DESC
      `;
    } else if (saleId) {
      query = sql`
        SELECT 
          r.id,
          r.reel_number,
          r.purchase_id,
          r.sale_id,
          r.gsm,
          r.size,
          r.size_unit,
          r.bf,
          r.weight,
          r.shade,
          r.rate,
          r.created_at,
          p.purchase_bill_number,
          p.purchase_bill_date,
          c.name as bought_from_mill
        FROM reels r
        INNER JOIN purchases p ON p.id = r.purchase_id
        INNER JOIN company c ON c.id = p.company_id
        WHERE r.sale_id = ${parseInt(saleId)}
        ORDER BY r.created_at DESC
      `;
    } else {
      query = sql`
        SELECT 
          r.id,
          r.reel_number,
          r.purchase_id,
          r.sale_id,
          r.gsm,
          r.size,
          r.size_unit,
          r.bf,
          r.weight,
          r.shade,
          r.rate,
          r.created_at,
          p.purchase_bill_number,
          p.purchase_bill_date,
          c.name as bought_from_mill
        FROM reels r
        INNER JOIN purchases p ON p.id = r.purchase_id
        INNER JOIN company c ON c.id = p.company_id
        ORDER BY r.created_at DESC
      `;
    }

    const reels = await query;
    
    return NextResponse.json({ success: true, data: reels });
  } catch (error) {
    console.error('Error fetching reels:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

