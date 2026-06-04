import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getRooms, createRoom, deleteRoom, updateRoom } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';
import { z } from 'zod';

const roomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  propertyId: z.string().min(1, "Property ID is required"),
  floor: z.number().int().min(0),
  baseRent: z.number().nonnegative("Rent cannot be negative"),
  occupantCount: z.number().int().nonnegative("Occupant count cannot be negative").optional(),
});

export async function GET(request: Request) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId') || undefined;

    const rooms = await getRooms(propertyId);
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    
    const parseResult = roomSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createRoom(parseResult.data);

    return NextResponse.json({ success: true, room: result });
  } catch (error: any) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing room id parameter' },
        { status: 400 }
      );
    }

    await deleteRoom(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing room id parameter' },
        { status: 400 }
      );
    }

    const updateSchema = roomSchema.partial();
    const parseResult = updateSchema.safeParse(updateData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const result = await updateRoom(id, parseResult.data);
    return NextResponse.json({ success: true, room: result });
  } catch (error: any) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
