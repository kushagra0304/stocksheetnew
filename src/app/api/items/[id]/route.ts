import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// DELETE - Delete a reel by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reel ID' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM reels
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reel deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting reel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

