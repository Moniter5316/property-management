import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUsingMock } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (await isUsingMock()) {
      // Just a mock response since we don't have a complex mock DB implementation for clearance
      return NextResponse.json({ success: true });
    }

    const room = await prisma.room.update({
      where: { id },
      data: { status: 'VACANT' },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error('Error clearing room status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
