import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUsingMock } from '@/lib/dbService';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (await isUsingMock()) {
      // Return empty or mock bills for now since mockDb doesn't have a specific history function
      return NextResponse.json([]);
    }

    const bills = await prisma.bill.findMany({
      where: { roomId: id },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 3,
    });

    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching bill history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
