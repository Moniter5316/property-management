import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getProperties, createProperty, updateProperty } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const properties = await getProperties();
    return NextResponse.json(properties);
  } catch (error: any) {
    console.error('Error fetching properties:', error);
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
    const { name, type, address, lightPricePerUnit, waterPricePerUnit, commonFee } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Property name and type are required' },
        { status: 400 }
      );
    }

    const result = await createProperty({
      name,
      type,
      address: address || null,
      lightPricePerUnit: lightPricePerUnit !== undefined ? Number(lightPricePerUnit) : undefined,
      waterPricePerUnit: waterPricePerUnit !== undefined ? Number(waterPricePerUnit) : undefined,
      commonFee: commonFee !== undefined ? Number(commonFee) : undefined,
    });

    return NextResponse.json({ success: true, property: result });
  } catch (error: any) {
    console.error('Error creating property:', error);
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
    const { id, name, address, lightPricePerUnit, waterPricePerUnit, commonFee } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing property id parameter' },
        { status: 400 }
      );
    }

    const result = await updateProperty(id, {
      name,
      address,
      lightPricePerUnit,
      waterPricePerUnit,
      commonFee,
    });

    return NextResponse.json({ success: true, property: result });
  } catch (error: any) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
