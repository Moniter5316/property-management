import { prisma } from './prisma';
import * as mockDb from './mockData';

// Helper to determine whether to use live database (Prisma) or mock database (in-memory)
// Use a cooldown-based cache so serverless lambdas can attempt reconnection periodically
const PROBE_COOLDOWN_MS = 30_000; // 30 seconds
let usePrismaStatus: boolean | null = null;
let lastProbeTime: number | null = null;

export async function isUsingMock(): Promise<boolean> {
  const now = Date.now();
  // Return cached result if cooldown hasn't elapsed (prevents locking and DB overload)
  if (usePrismaStatus !== null && lastProbeTime !== null && (now - lastProbeTime) < PROBE_COOLDOWN_MS) {
    return !usePrismaStatus;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('johndoe:randompassword')) {
    usePrismaStatus = false;
    lastProbeTime = now;
    return true;
  }

  try {
    // Attempt a fast query with a 2.5-second timeout
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500));
    const query = prisma.$queryRaw`SELECT 1`;
    await Promise.race([query, timeout]);
    usePrismaStatus = true;
    lastProbeTime = now;
    return false;
  } catch (err) {
    console.warn('⚠️ Prisma database connection failed. Falling back to local mock data.', err);
    usePrismaStatus = false;
    lastProbeTime = now;
    return true;
  }
}

// 1. Get properties
export async function getProperties() {
  if (await isUsingMock()) {
    return mockDb.getMockProperties();
  }
  return prisma.property.findMany({
    orderBy: { name: 'asc' },
  });
}

// 2. Get rooms with property, tenants, and bills
export async function getRooms(propertyId?: string) {
  if (await isUsingMock()) {
    return mockDb.getMockRooms(propertyId);
  }
  return prisma.room.findMany({
    where: propertyId ? { propertyId } : undefined,
    include: {
      property: true,
      tenants: {
        where: { endDate: null },
      },
      bills: {
        take: 3,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [
      { floor: 'asc' },
      { roomNumber: 'asc' },
    ],
  });
}

// 3. Get room by ID
export async function getRoomById(id: string) {
  if (await isUsingMock()) {
    return mockDb.getMockRoomById(id);
  }
  return prisma.room.findUnique({
    where: { id },
    include: {
      property: true,
      tenants: {
        where: { endDate: null },
      },
      bills: {
        take: 3,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// 4. Calculate Prorated Rent
export function calculateProratedRent(
  baseRent: number,
  startDate: Date,
  endDate: Date | null,
  month: number,
  year: number
): { daysOccupied: number; daysInMonth: number; rentCharged: number } {
  // Normalize dates to midnight to avoid hours mismatch
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0)); // last day of the month
  const daysInMonth = endOfMonth.getUTCDate();

  const tenantStart = new Date(Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  ));
  
  const tenantEnd = endDate 
    ? new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()))
    : null;

  // Determine occupied boundaries within this month
  const overlapStart = tenantStart > startOfMonth ? tenantStart : startOfMonth;
  let overlapEnd = endOfMonth;
  
  if (tenantEnd && tenantEnd < endOfMonth) {
    overlapEnd = tenantEnd;
  }

  if (overlapStart > endOfMonth || (tenantEnd && tenantEnd < startOfMonth)) {
    // Tenant did not stay in this month at all
    return { daysOccupied: 0, daysInMonth, rentCharged: 0 };
  }

  // Calculate days occupied
  const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
  const daysOccupied = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // If they stayed the whole month, charge full base rent (avoid float rounding issues)
  if (daysOccupied >= daysInMonth) {
    return { daysOccupied: daysInMonth, daysInMonth, rentCharged: baseRent };
  }

  // Prorated Rent formula: (baseRent / daysInMonth) * daysOccupied
  const rentCharged = Math.round((baseRent / daysInMonth) * daysOccupied * 100) / 100;
  return { daysOccupied, daysInMonth, rentCharged };
}

// 5. Get Bills for a specific month/year
export async function getBills(month: number, year: number, propertyId?: string) {
  if (await isUsingMock()) {
    return mockDb.getMockBills(month, year, propertyId);
  }
  return prisma.bill.findMany({
    where: {
      month,
      year,
      room: propertyId ? { propertyId } : undefined,
    },
    include: {
      room: {
        include: {
          property: true,
          tenants: {
            where: { endDate: null },
          },
        },
      },
    },
    orderBy: [
      { room: { floor: 'asc' } },
      { room: { roomNumber: 'asc' } },
    ],
  });
}

// 6. Create or update a bill with auto utility math and prorated rent
export async function saveBill(data: {
  roomId: string;
  month: number;
  year: number;
  previousLightMeter: number;
  currentLightMeter: number;
  lightPricePerUnit: number;
  previousWaterMeter: number;
  currentWaterMeter: number;
  waterPricePerUnit: number;
  commonFeeCharged?: number;
  depositCharged?: number;
  discount?: number;
  otherCharged?: number;
  occupantCount?: number;
  remark?: string | null;
  paymentSlipUrl?: string | null;
  status?: 'PAID' | 'UNPAID' | 'PENDING';
}) {
  const room = await getRoomById(data.roomId);
  if (!room) throw new Error('Room not found');

  const occupantCount = data.occupantCount !== undefined ? Number(data.occupantCount) : (room.occupantCount || 1);

  // Compute utility totals
  const lightUnits = data.currentLightMeter < data.previousLightMeter 
    ? (10000 - data.previousLightMeter) + data.currentLightMeter
    : data.currentLightMeter - data.previousLightMeter;
  const totalLightPrice = Math.round(lightUnits * data.lightPricePerUnit * 100) / 100;

  const waterUnits = data.currentWaterMeter < data.previousWaterMeter
    ? (10000 - data.previousWaterMeter) + data.currentWaterMeter
    : data.currentWaterMeter - data.previousWaterMeter;
  // BUSINESS LOGIC OVERHAUL: Always charge flat-rate per occupant for water, disregarding units.
  const totalWaterPrice = Math.round(occupantCount * data.waterPricePerUnit * 100) / 100;

  // Calculate prorated rent
  let proratedRentCharged = room.baseRent;
  const activeTenant = room.tenants?.[0];

  if (activeTenant) {
    const prorateInfo = calculateProratedRent(
      room.baseRent,
      activeTenant.startDate,
      activeTenant.endDate,
      data.month,
      data.year
    );
    proratedRentCharged = prorateInfo.rentCharged;
  } else {
    // If vacant, base rent is 0 for billing
    proratedRentCharged = 0;
  }

  // Configurations calculations
  const commonFeeCharged = data.commonFeeCharged !== undefined ? Number(data.commonFeeCharged) : (room.property?.commonFee ?? 100);
  const depositCharged = data.depositCharged !== undefined ? Number(data.depositCharged) : 0;
  let discount = data.discount !== undefined ? Number(data.discount) : 0;
  let otherCharged = data.otherCharged !== undefined ? Number(data.otherCharged) : 0;
  const remark = data.remark !== undefined ? data.remark : null;

  // Find if this is a new bill
  let existingBill: any = null;
  if (await isUsingMock()) {
    existingBill = mockDb.getMockBills(1, 2099, undefined).find((b: any) => b.roomId === data.roomId && b.month === data.month && b.year === data.year);
  } else {
    existingBill = await prisma.bill.findFirst({
      where: { roomId: data.roomId, month: data.month, year: data.year },
      orderBy: { createdAt: 'desc' }
    });
  }

  // BUSINESS LOGIC OVERHAUL: Auto carry-over Overpayments / Arrears
  if (!existingBill && room.bills && room.bills.length > 0) {
    // If we are generating a brand new bill, look at past bills for arrears/overpayments
    const pastBills = room.bills.filter((b: any) => b.id !== existingBill?.id && (['UNPAID', 'PARTIAL', 'PENDING'].includes(b.status) || b.paidAmount > b.totalAmount));
    const netBalance = pastBills.reduce((sum: number, b: any) => sum + (b.totalAmount - b.paidAmount), 0);
    
    if (netBalance < 0) {
      // Negative balance means they overpaid (Credit). Apply it as an automatic discount.
      discount += Math.abs(netBalance);
    } else if (netBalance > 0) {
      // Positive balance means they underpaid (Arrears). Auto-add to otherCharged.
      otherCharged += netBalance;
    }
  }

  const totalAmount = Math.max(0, Math.round((proratedRentCharged + totalLightPrice + totalWaterPrice + commonFeeCharged + depositCharged + otherCharged - discount) * 100) / 100);

  const billPayload = {
    month: data.month,
    year: data.year,
    previousLightMeter: data.previousLightMeter,
    currentLightMeter: data.currentLightMeter,
    lightPricePerUnit: data.lightPricePerUnit,
    totalLightPrice,
    previousWaterMeter: data.previousWaterMeter,
    currentWaterMeter: data.currentWaterMeter,
    waterPricePerUnit: data.waterPricePerUnit,
    totalWaterPrice,
    baseRentCharged: room.baseRent,
    proratedRentCharged,
    commonFeeCharged,
    depositCharged: data.depositCharged !== undefined ? data.depositCharged : (existingBill?.depositCharged || 0),
    discount,
    otherCharged,
    occupantCount,
    remark: data.remark !== undefined ? data.remark : (existingBill?.remark || null),
    totalAmount,
    status: data.status || existingBill?.status || 'UNPAID',
    paidAmount: existingBill?.paidAmount || 0, // BUSINESS LOGIC OVERHAUL: Preserve paidAmount
    paymentSlipUrl: data.paymentSlipUrl !== undefined ? data.paymentSlipUrl : (existingBill?.paymentSlipUrl || null),
    roomId: data.roomId,
    tenantId: activeTenant?.id || existingBill?.tenantId || null,
  };

  if (await isUsingMock()) {
    return mockDb.createMockBill(billPayload);
  }

  if (existingBill) {
    return prisma.bill.update({
      where: { id: existingBill.id },
      data: billPayload,
    });
  } else {
    return prisma.bill.create({
      data: billPayload,
    });
  }
}

// 7. Check-in tenant
export async function checkInTenant(
  roomId: string,
  tenantData: { name: string; phone: string; startDate: Date; depositAmount?: number },
  initialMeters: { lightMeter: number; waterMeter: number },
  occupantCount?: number
) {
  const occCount = occupantCount !== undefined ? Number(occupantCount) : 1;

  if (await isUsingMock()) {
    // Get room to read property rates
    const mockRoom = mockDb.getMockRoomById(roomId);
    const lightRate = mockRoom?.property?.lightPricePerUnit ?? 9;
    const waterRate = mockRoom?.property?.waterPricePerUnit ?? 100;

    // Update room status
    mockDb.updateMockRoom(roomId, { status: 'OCCUPIED', occupantCount: occCount });
    // Add tenant
    const tenant = mockDb.addMockTenant({
      name: tenantData.name,
      phone: tenantData.phone,
      startDate: tenantData.startDate,
      endDate: null,
      roomId,
    });

    // Create an initial placeholder bill for the check-in month to log the starting meters
    const checkInMonth = tenantData.startDate.getMonth() + 1;
    const checkInYear = tenantData.startDate.getFullYear();

    await saveBill({
      roomId,
      month: checkInMonth,
      year: checkInYear,
      previousLightMeter: initialMeters.lightMeter,
      currentLightMeter: initialMeters.lightMeter, // Same as previous on start
      lightPricePerUnit: lightRate,
      previousWaterMeter: initialMeters.waterMeter,
      currentWaterMeter: initialMeters.waterMeter, // Same as previous on start
      waterPricePerUnit: waterRate,
      occupantCount: occCount,
      depositCharged: tenantData.depositAmount || 0, // Log the initial deposit on the first bill
      commonFeeCharged: mockRoom?.property?.commonFee ?? 100, // BUSINESS LOGIC OVERHAUL: Missing Common Fee
      status: 'PENDING',
    });

    return { tenant, roomStatus: 'OCCUPIED' };
  }

  // Live Database Transaction
  return prisma.$transaction(async (tx: any) => {
    // 1. Update room
    await tx.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED', occupantCount: occCount },
    });

    // 2. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: tenantData.name,
        phone: tenantData.phone,
        startDate: tenantData.startDate,
        depositAmount: tenantData.depositAmount || 0,
        roomId,
      },
    });

    // 3. Create initial meter bill record
    const checkInMonth = tenantData.startDate.getMonth() + 1;
    const checkInYear = tenantData.startDate.getFullYear();

    // Fetch room with property to get dynamic utility rates
    const room = await tx.room.findUnique({
      where: { id: roomId },
      include: { property: true },
    });
    const baseRent = room?.baseRent || 0;
    const lightRate = room?.property?.lightPricePerUnit ?? 9;
    const waterRate = room?.property?.waterPricePerUnit ?? 100;

    // Prorated check-in rent
    const prorateInfo = calculateProratedRent(baseRent, tenantData.startDate, null, checkInMonth, checkInYear);
    const commonFeeCharged = room?.property?.commonFee ?? 100; // BUSINESS LOGIC OVERHAUL: Missing Common Fee

    const checkInBillPayload = {
      previousLightMeter: initialMeters.lightMeter,
      currentLightMeter: initialMeters.lightMeter,
      previousWaterMeter: initialMeters.waterMeter,
      currentWaterMeter: initialMeters.waterMeter,
      lightPricePerUnit: lightRate,
      waterPricePerUnit: waterRate,
      totalLightPrice: 0,
      totalWaterPrice: 0,
      baseRentCharged: baseRent,
      proratedRentCharged: prorateInfo.rentCharged,
      commonFeeCharged,
      depositCharged: tenantData.depositAmount || 0,
      occupantCount: occCount,
      totalAmount: prorateInfo.rentCharged + (tenantData.depositAmount || 0) + commonFeeCharged,
      status: 'PENDING',
      tenantId: tenant.id,
      paidAmount: 0,
    };

    const existingCheckInBill = await tx.bill.findFirst({
      where: { roomId, month: checkInMonth, year: checkInYear, tenantId: tenant.id }
    });

    if (existingCheckInBill) {
      await tx.bill.update({
        where: { id: existingCheckInBill.id },
        data: checkInBillPayload,
      });
    } else {
      await tx.bill.create({
        data: {
          ...checkInBillPayload,
          roomId,
          month: checkInMonth,
          year: checkInYear,
        },
      });
    }

    return { tenant, roomStatus: 'OCCUPIED' };
  });
}
// 8. Check-out tenant
export async function checkOutTenant(
  roomId: string,
  endDate: Date,
  finalMeters: { lightMeter: number; waterMeter: number },
  damageFee: number = 0,
  isForfeitDeposit: boolean = false
) {
  const room = await getRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const activeTenant = room.tenants?.[0];
  if (!activeTenant) throw new Error('No active tenant in this room');

  const checkOutMonth = endDate.getMonth() + 1;
  const checkOutYear = endDate.getFullYear();

  // Find previous meters (we can look at the active bill or previous bills)
  // Let's query the bill for the checkOutMonth or fallback
  let previousLightMeter = finalMeters.lightMeter;
  let previousWaterMeter = finalMeters.waterMeter;

  // Try to find the bill of checkout month or the latest bill
  const currentMonthBill = room.bills?.find((b: any) => b.month === checkOutMonth && b.year === checkOutYear);
  if (currentMonthBill) {
    previousLightMeter = currentMonthBill.previousLightMeter;
    previousWaterMeter = currentMonthBill.previousWaterMeter;
  } else if (room.bills && room.bills.length > 0) {
    previousLightMeter = room.bills[0].currentLightMeter;
    previousWaterMeter = room.bills[0].currentWaterMeter;
  }

  // Calculate prorated rent from start date to check out date
  const prorateInfo = calculateProratedRent(
    room.baseRent,
    activeTenant.startDate,
    endDate,
    checkOutMonth,
    checkOutYear
  );

  // Use property rates (fallback to safe defaults if property not loaded)
  const lightRate = (room as any).property?.lightPricePerUnit ?? 9;
  const waterRate = (room as any).property?.waterPricePerUnit ?? 100;

  // Meter Rollover Fix
  const lightUnits = finalMeters.lightMeter < previousLightMeter 
    ? (10000 - previousLightMeter) + finalMeters.lightMeter
    : finalMeters.lightMeter - previousLightMeter;
  const totalLightPrice = Math.round(lightUnits * lightRate * 100) / 100;

  const occupantCount = room.occupantCount || 1;
  const totalWaterPrice = Math.round(occupantCount * waterRate * 100) / 100;

  // Unpaid Arrears Integration
  const unpaidBills = room.bills?.filter((b: any) => ['UNPAID', 'PARTIAL', 'PENDING'].includes(b.status) && b.id !== currentMonthBill?.id) || [];
  const pastUnpaidBalance = unpaidBills.reduce((sum: number, b: any) => sum + (b.totalAmount - b.paidAmount), 0);

  // BUSINESS LOGIC OVERHAUL: Refunding Unpaid Deposits
  // Check if the deposit was actually paid in the first bill
  const checkInMonth = activeTenant.startDate.getMonth() + 1;
  const checkInYear = activeTenant.startDate.getFullYear();
  const firstBill = room.bills?.find((b: any) => b.month === checkInMonth && b.year === checkInYear);
  const isDepositPaid = firstBill ? !['UNPAID', 'PENDING'].includes(firstBill.status) : true;

  // Forfeit Deposit Logic + Unpaid Deposit Logic
  const depositAmount = (isForfeitDeposit || !isDepositPaid) ? 0 : ((activeTenant as any).depositAmount || 0);

  // BUSINESS LOGIC OVERHAUL: Missing Common Fee
  const commonFeeCharged = (room as any).property?.commonFee ?? 100;

  // Final bill calculation with deposit and damage fee
  const rawTotal = prorateInfo.rentCharged + totalLightPrice + totalWaterPrice + damageFee + pastUnpaidBalance + commonFeeCharged;
  const totalAmount = Math.round((rawTotal - depositAmount) * 100) / 100;

  // Refund Pending State
  const finalStatus = totalAmount < 0 ? 'REFUND_PENDING' : 'UNPAID';

  if (await isUsingMock()) {
    // Terminate tenant
    mockDb.terminateMockTenant(roomId, endDate);
    // Vacate room but set to CLEARANCE
    mockDb.updateMockRoom(roomId, { status: 'CLEARANCE' });
    
    // Clear old unpaid bills
    unpaidBills.forEach((b: any) => {
      mockDb.updateMockBill(b.id, { status: 'CLEARED' as any });
    });

    // Save final checkout bill
    const finalBill = mockDb.createMockBill({
      roomId,
      month: checkOutMonth,
      year: checkOutYear,
      previousLightMeter,
      currentLightMeter: finalMeters.lightMeter,
      lightPricePerUnit: lightRate,
      totalLightPrice,
      previousWaterMeter,
      currentWaterMeter: finalMeters.waterMeter,
      waterPricePerUnit: waterRate,
      totalWaterPrice,
      baseRentCharged: room.baseRent,
      proratedRentCharged: prorateInfo.rentCharged,
      commonFeeCharged, // BUSINESS LOGIC OVERHAUL: Missing Common Fee
      depositCharged: 0,
      discount: depositAmount, // Treat returned deposit as a discount on the final bill
      otherCharged: damageFee + pastUnpaidBalance, // Treat damage fee + arrears as otherCharged
      occupantCount: room.occupantCount || 1,
      remark: 'Final Bill (Check-out)',
      totalAmount,
      status: finalStatus as any,
      paidAmount: 0,
      paymentSlipUrl: null,
      tenantId: activeTenant.id,
    });

    return { finalBill, roomStatus: 'CLEARANCE' };
  }

  // Live Database Transaction
  return prisma.$transaction(async (tx: any) => {
    // 1. Terminate tenant
    await tx.tenant.update({
      where: { id: activeTenant.id },
      data: { endDate },
    });

    // 2. Set room to CLEARANCE (Wait for admin to clear the final bill)
    await tx.room.update({
      where: { id: roomId },
      data: { status: 'CLEARANCE' },
    });

    // 3. Clear old unpaid bills
    if (unpaidBills.length > 0) {
      await tx.bill.updateMany({
        where: { id: { in: unpaidBills.map((b: any) => b.id) } },
        data: { status: 'CLEARED' },
      });
    }

    // 4. Save final bill
    const existingFinalBill = await tx.bill.findFirst({
      where: { roomId, month: checkOutMonth, year: checkOutYear, tenantId: activeTenant.id }
    });

    const finalBillPayload = {
      previousLightMeter,
      currentLightMeter: finalMeters.lightMeter,
      lightPricePerUnit: lightRate,
      totalLightPrice,
      previousWaterMeter,
      currentWaterMeter: finalMeters.waterMeter,
      waterPricePerUnit: waterRate,
      totalWaterPrice,
      baseRentCharged: room.baseRent,
      proratedRentCharged: prorateInfo.rentCharged,
      commonFeeCharged, // BUSINESS LOGIC OVERHAUL: Missing Common Fee
      otherCharged: damageFee + pastUnpaidBalance,
      discount: depositAmount,
      occupantCount: room.occupantCount || 1,
      totalAmount,
      status: finalStatus,
      remark: 'Final Bill (Check-out)',
      tenantId: activeTenant.id,
    };

    let finalBill;
    if (existingFinalBill) {
      finalBill = await tx.bill.update({
        where: { id: existingFinalBill.id },
        data: finalBillPayload,
      });
    } else {
      finalBill = await tx.bill.create({
        data: {
          ...finalBillPayload,
          roomId,
          month: checkOutMonth,
          year: checkOutYear,
          paidAmount: 0,
        },
      });
    }

    return { finalBill, roomStatus: 'CLEARANCE' };
  });
}

// 9. Update mock bill directly (used in slip verification mock flow)
export function updateMockBill(billId: string, data: Partial<any>) {
  return mockDb.updateMockBill(billId, data);
}

// 10. Create new property
export async function createProperty(data: { 
  name: string; 
  type: 'BUILDING' | 'HOUSE'; 
  address: string | null;
  lightPricePerUnit?: number;
  waterPricePerUnit?: number;
  commonFee?: number;
}) {
  const payload = {
    name: data.name,
    type: data.type,
    address: data.address,
    lightPricePerUnit: data.lightPricePerUnit !== undefined ? Number(data.lightPricePerUnit) : 9,
    waterPricePerUnit: data.waterPricePerUnit !== undefined ? Number(data.waterPricePerUnit) : 100,
    commonFee: data.commonFee !== undefined ? Number(data.commonFee) : 100,
  };

  if (await isUsingMock()) {
    return mockDb.createMockProperty(payload);
  }
  return prisma.property.create({
    data: payload,
  });
}

// 11. Create new room
export async function createRoom(data: { roomNumber: string; floor: number; baseRent: number; propertyId: string; occupantCount?: number }) {
  if (await isUsingMock()) {
    return mockDb.createMockRoom(data);
  }
  return prisma.room.create({
    data: {
      roomNumber: data.roomNumber,
      floor: Number(data.floor),
      baseRent: Number(data.baseRent),
      occupantCount: data.occupantCount !== undefined ? Number(data.occupantCount) : 1,
      status: 'VACANT',
      propertyId: data.propertyId,
    },
  });
}

// 12. Reset database state
export async function resetDb(toEmpty: boolean) {
  if (await isUsingMock()) {
    mockDb.resetMockDb(toEmpty);
    return { success: true, isMock: true };
  }

  return prisma.$transaction(async (tx: any) => {
    await tx.bill.deleteMany();
    await tx.tenant.deleteMany();
    await tx.room.deleteMany();
    await tx.property.deleteMany();
    
    if (!toEmpty) {
      // Re-seed a single mock building for basic visual references
      const prop = await tx.property.create({
        data: {
          name: 'ตึกตัวอย่าง A (Demo Building)',
          type: 'BUILDING',
          address: 'กรุงเทพฯ ประเทศไทย',
        }
      });
      await tx.room.create({
        data: {
          roomNumber: '101',
          floor: 1,
          baseRent: 4000,
          status: 'VACANT',
          propertyId: prop.id,
        }
      });
    }
    return { success: true, isMock: false };
  });
}

// 12. Delete room
export async function deleteRoom(id: string) {
  if (await isUsingMock()) {
    return mockDb.deleteMockRoom(id);
  }
  return prisma.room.delete({
    where: { id },
  });
}

// 13. Update room
export async function updateRoom(id: string, data: { baseRent?: number; roomNumber?: string; floor?: number; occupantCount?: number }) {
  const payload = {
    baseRent: data.baseRent !== undefined ? Number(data.baseRent) : undefined,
    roomNumber: data.roomNumber,
    floor: data.floor !== undefined ? Number(data.floor) : undefined,
    occupantCount: data.occupantCount !== undefined ? Number(data.occupantCount) : undefined,
  };
  
  if (await isUsingMock()) {
    return mockDb.updateMockRoom(id, payload);
  }
  return prisma.room.update({
    where: { id },
    data: payload,
  });
}

// 14. Update property
export async function updateProperty(id: string, data: {
  name?: string;
  address?: string | null;
  lightPricePerUnit?: number;
  waterPricePerUnit?: number;
  commonFee?: number;
}) {
  const payload: any = {};
  if (data.name && data.name.trim() !== '') payload.name = data.name;
  if (data.address !== undefined) payload.address = data.address;
  if (data.lightPricePerUnit !== undefined) payload.lightPricePerUnit = Number(data.lightPricePerUnit);
  if (data.waterPricePerUnit !== undefined) payload.waterPricePerUnit = Number(data.waterPricePerUnit);
  if (data.commonFee !== undefined) payload.commonFee = Number(data.commonFee);

  if (await isUsingMock()) {
    return mockDb.updateMockProperty(id, payload);
  }
  return prisma.property.update({
    where: { id },
    data: payload,
  });
}

// 15. Get unmatched Payment Transactions
export async function getPaymentTransactions() {
  if (await isUsingMock()) {
    return mockDb.getMockPaymentTransactions().sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return prisma.paymentTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: { bill: { include: { room: true } } }
  });
}

// 16. Create a Payment Transaction (from Webhook)
export async function createPaymentTransaction(data: {
  slipId: string | null;
  transRef: string | null;
  amount: number;
  senderName: string | null;
  transDate: string | null;
  transTime: string | null;
  status: 'UNMATCHED' | 'MATCHED';
  slipImageUrl: string | null;
}) {
  if (await isUsingMock()) {
    return mockDb.createMockPaymentTransaction({ ...data, billId: null });
  }
  return prisma.paymentTransaction.create({
    data: { ...data, billId: null }
  });
}

// 17. Match Payment Transaction to a Bill
export async function matchPaymentTransaction(ptId: string, billId: string) {
  if (await isUsingMock()) {
    // BUSINESS LOGIC OVERHAUL: Pull actual pt amount.
    const originalPt = mockDb.getMockPaymentTransactions().find((p: any) => p.id === ptId);
    if (!originalPt) throw new Error('Payment transaction not found');
    const actualSlipAmount = originalPt.amount;

    const pt = mockDb.updateMockPaymentTransaction(ptId, { status: 'MATCHED', billId });
    // Search all rooms to find the bill since getMockBills filters by specific month/year
    const allRooms = mockDb.getMockRooms();
    const currentBill = allRooms.flatMap((r: any) => r.bills || []).find((b: any) => b.id === billId);
    if (!currentBill) throw new Error('Bill not found');
    
    const newPaidAmount = (currentBill.paidAmount || 0) + actualSlipAmount;
    // Server-Side Bill Status Validation
    const billStatus = newPaidAmount >= currentBill.totalAmount ? 'PAID' : 'PARTIAL';

    const bill = mockDb.updateMockBill(billId, { status: billStatus, paidAmount: newPaidAmount });
    return { pt, bill };
  }
  return prisma.$transaction(async (tx: any) => {
    // BUSINESS LOGIC OVERHAUL: Fetch real pt amount to prevent forgery
    const originalPt = await tx.paymentTransaction.findUnique({ where: { id: ptId } });
    if (!originalPt) throw new Error('Payment transaction not found');
    const actualSlipAmount = originalPt.amount;

    const originalBill = await tx.bill.findUnique({ where: { id: billId } });
    if (!originalBill) throw new Error('Bill not found');

    const pt = await tx.paymentTransaction.update({
      where: { id: ptId },
      data: { status: 'MATCHED', billId }
    });

    // Server-Side Bill Status Validation
    const expectedNewPaidAmount = originalBill.paidAmount + actualSlipAmount;
    const billStatus = expectedNewPaidAmount >= originalBill.totalAmount ? 'PAID' : 'PARTIAL';

    const bill = await tx.bill.update({
      where: { id: billId },
      data: { 
        status: billStatus, 
        paidAmount: { increment: actualSlipAmount } 
      }
    });
    return { pt, bill };
  });
}

