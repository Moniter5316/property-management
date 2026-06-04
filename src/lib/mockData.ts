export interface Property {
  id: string;
  name: string;
  type: 'BUILDING' | 'HOUSE';
  address: string | null;
  lightPricePerUnit: number;
  waterPricePerUnit: number;
  commonFee: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  baseRent: number;
  status: 'VACANT' | 'OCCUPIED' | 'CLEARANCE';
  occupantCount: number;
  propertyId: string;
  createdAt: Date;
  updatedAt: Date;
  property?: Property;
  tenants?: Tenant[];
  bills?: Bill[];
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  startDate: Date;
  endDate: Date | null;
  roomId: string;
  depositAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bill {
  id: string;
  month: number;
  year: number;
  status: 'PAID' | 'UNPAID' | 'PENDING' | 'PARTIAL' | 'REFUND_PENDING' | 'REFUNDED' | 'CLEARED';
  paidAmount: number;
  previousLightMeter: number;
  currentLightMeter: number;
  lightPricePerUnit: number;
  totalLightPrice: number;
  previousWaterMeter: number;
  currentWaterMeter: number;
  waterPricePerUnit: number;
  totalWaterPrice: number;
  baseRentCharged: number;
  proratedRentCharged: number;
  commonFeeCharged: number;
  depositCharged: number;
  discount: number;
  otherCharged: number;
  occupantCount: number;
  remark: string | null;
  totalAmount: number;
  paymentSlipUrl: string | null;
  roomId: string;
  tenantId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  room?: Room;
}

export interface PaymentTransaction {
  id: string;
  slipId: string | null;
  transRef: string | null;
  amount: number;
  senderName: string | null;
  transDate: string | null;
  transTime: string | null;
  status: 'UNMATCHED' | 'MATCHED';
  slipImageUrl: string | null;
  billId: string | null;
  createdAt: Date;
  updatedAt: Date;
  bill?: Bill;
}

// In-memory mock database state
let properties: Property[] = [];
let rooms: Room[] = [];
let tenants: Tenant[] = [];
let bills: Bill[] = [];
let paymentTransactions: PaymentTransaction[] = [];
let isInitialized = false;

// Bind mock database state to globalThis to persist across Next.js dev server hot-reloads and shared across API routes
const globalForMock = globalThis as unknown as {
  mockProperties: Property[] | undefined;
  mockRooms: Room[] | undefined;
  mockTenants: Tenant[] | undefined;
  mockBills: Bill[] | undefined;
  mockPaymentTransactions: PaymentTransaction[] | undefined;
  mockIsInitialized: boolean | undefined;
};

function syncFromGlobal() {
  if (globalForMock.mockProperties) properties = globalForMock.mockProperties;
  if (globalForMock.mockRooms) rooms = globalForMock.mockRooms;
  if (globalForMock.mockTenants) tenants = globalForMock.mockTenants;
  if (globalForMock.mockBills) bills = globalForMock.mockBills;
  if (globalForMock.mockPaymentTransactions) paymentTransactions = globalForMock.mockPaymentTransactions;
  if (globalForMock.mockIsInitialized !== undefined) isInitialized = globalForMock.mockIsInitialized;
}

function syncToGlobal() {
  globalForMock.mockProperties = properties;
  globalForMock.mockRooms = rooms;
  globalForMock.mockTenants = tenants;
  globalForMock.mockBills = bills;
  globalForMock.mockPaymentTransactions = paymentTransactions;
  globalForMock.mockIsInitialized = isInitialized;
}

export function initializeMockData() {
  syncFromGlobal();
  if (isInitialized) return;

  // 1. Create properties
  const propA: Property = {
    id: 'prop-building-a',
    name: 'ตึก A (Building A)',
    type: 'BUILDING',
    address: '123/45 ถนนลาดพร้าว แขวงพลับพลา เขตวังทองหลาง กรุงเทพฯ 10310',
    lightPricePerUnit: 9,
    waterPricePerUnit: 100,
    commonFee: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const propB: Property = {
    id: 'prop-building-b',
    name: 'ตึก B (Building B)',
    type: 'BUILDING',
    address: '123/46 ถนนลาดพร้าว แขวงพลับพลา เขตวังทองหลาง กรุงเทพฯ 10310',
    lightPricePerUnit: 9,
    waterPricePerUnit: 100,
    commonFee: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const propHouse: Property = {
    id: 'prop-house-c',
    name: 'บ้านเดี่ยวสุขใจ (Cozy House)',
    type: 'HOUSE',
    address: '88/9 หมู่บ้านสุขสันต์ ซอยประเสริฐมนูกิจ 29 กรุงเทพฯ 10230',
    lightPricePerUnit: 9,
    waterPricePerUnit: 100,
    commonFee: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const prop238: Property = {
    id: 'prop-building-238',
    name: 'ตึก 238 (Building 238)',
    type: 'BUILDING',
    address: '238 ถนนพระราม 9 กรุงเทพฯ 10310',
    lightPricePerUnit: 9,
    waterPricePerUnit: 100,
    commonFee: 100,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  properties = [propA, propB, propHouse, prop238];

  // 2. Create Rooms for Building A (5 floors, 12 rooms per floor = 60 rooms)
  for (let floor = 1; floor <= 5; floor++) {
    for (let r = 1; r <= 12; r++) {
      const roomNum = `${floor}${r < 10 ? '0' + r : r}`;
      let baseRent = 3500 + floor * 300 + (r % 2 === 0 ? 100 : 0); // e.g. 3800 to 5100
      if (floor === 1 && r === 12) {
        baseRent = 3700; // Match screenshot room 112
      }
      const occupantCount = (roomNum === '112') ? 5 : 1;
      rooms.push({
        id: `room-a-${floor}-${r}`,
        roomNumber: roomNum,
        floor: floor,
        baseRent: baseRent,
        status: (floor + r) % 3 === 0 ? 'VACANT' : 'OCCUPIED',
        occupantCount: occupantCount,
        propertyId: propA.id,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    }
  }

  // 3. Create Rooms for Building B (4 floors, 10 rooms per floor = 40 rooms)
  for (let floor = 1; floor <= 4; floor++) {
    for (let r = 1; r <= 10; r++) {
      const roomNum = `${floor}${r < 10 ? '0' + r : r}`;
      const baseRent = 4000 + floor * 400 + (r % 2 === 0 ? 150 : 0);
      rooms.push({
        id: `room-b-${floor}-${r}`,
        roomNumber: roomNum,
        floor: floor,
        baseRent: baseRent,
        status: (floor + r) % 4 === 0 ? 'VACANT' : 'OCCUPIED',
        occupantCount: 1,
        propertyId: propB.id,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    }
  }

  // 4. Create single room for Cozy House
  rooms.push({
    id: 'room-house-1',
    roomNumber: 'House-1',
    floor: 1,
    baseRent: 15000,
    status: 'OCCUPIED',
    occupantCount: 3,
    propertyId: propHouse.id,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  // 5. Create Rooms for Building 238 (Floor 2: 212-224, Floor 3: 325-336)
  // Floor 2
  for (let r = 12; r <= 24; r++) {
    rooms.push({
      id: `room-238-2-${r}`,
      roomNumber: `2${r}`,
      floor: 2,
      baseRent: 4500,
      status: r % 3 === 0 ? 'VACANT' : 'OCCUPIED',
      occupantCount: 1,
      propertyId: prop238.id,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
  }

  // Floor 3
  for (let r = 25; r <= 36; r++) {
    rooms.push({
      id: `room-238-3-${r}`,
      roomNumber: `3${r}`,
      floor: 3,
      baseRent: 5000,
      status: r % 4 === 0 ? 'VACANT' : 'OCCUPIED',
      occupantCount: 1,
      propertyId: prop238.id,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
  }

  // 6. Generate Tenants for Occupied Rooms
  // Let's seed tenants for occupied rooms and some bills for May 2026 (all paid) and June 2026 (some paid, some unpaid, some pending)
  const tenantNames = [
    'สมชาย ใจดี', 'สมศรี รักเรียน', 'วิชัย รุ่งเรือง', 'นภา สว่างไสว', 'กิตติศักดิ์ มีสุข',
    'อนันต์ ยอดเยี่ยม', 'ดนัย ก้าวหน้า', 'ประพันธ์ มั่นคง', 'อรทัย งดงาม', 'พัชรา สวยเสมอ',
    'ธนา พารวย', 'กานต์ ทองแท้', 'ชลดา วารี', 'รุ่งโรจน์ สุริยา', 'เกษม สบายดี'
  ];

  rooms.forEach((room, index) => {
    if (room.status === 'OCCUPIED') {
      const tenantId = `tenant-${room.id}`;
      const name = tenantNames[index % tenantNames.length] + ` (ห้อง ${room.roomNumber})`;
      const phone = `081-234-56${(index % 90) + 10}`;
      
      // Start date some months ago, end date null
      const tenant: Tenant = {
        id: tenantId,
        name,
        phone,
        startDate: new Date('2025-06-01'),
        endDate: null,
        roomId: room.id,
        depositAmount: room.baseRent, // Usually deposit is equal to 1 month rent
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-01'),
      };
      tenants.push(tenant);

      // Create May 2026 bill (PAID)
      const prevLightMay = 100 + index * 5;
      const currLightMay = prevLightMay + 80 + (index % 40);
      const prevWaterMay = 50 + index * 2;
      const currWaterMay = prevWaterMay + 15 + (index % 10);
      
      const lightUnits = currLightMay - prevLightMay;
      const waterUnits = currWaterMay - prevWaterMay;
      const lightPrice = lightUnits * 9; // 9 THB per unit
      const waterPrice = waterUnits * 100; // 100 THB flat/unit representation
      const commonFeeChargedMay = 100;
      const totalAmountMay = room.baseRent + lightPrice + waterPrice + commonFeeChargedMay;

      // Modify May 2026 bill status for testing
      let statusMay: 'PAID' | 'UNPAID' | 'PARTIAL' = 'PAID';
      let paidAmountMay = totalAmountMay;
      let slipUrlMay: string | null = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300';

      // First 10 rooms have unpaid May bills
      if (index < 10) {
        statusMay = 'UNPAID';
        paidAmountMay = 0;
        slipUrlMay = null;
      }

      bills.push({
        id: `bill-may-${room.id}`,
        month: 5,
        year: 2026,
        status: statusMay,
        paidAmount: paidAmountMay,
        previousLightMeter: prevLightMay,
        currentLightMeter: currLightMay,
        lightPricePerUnit: 9,
        totalLightPrice: lightPrice,
        previousWaterMeter: prevWaterMay,
        currentWaterMeter: currWaterMay,
        waterPricePerUnit: 100,
        totalWaterPrice: waterPrice,
        baseRentCharged: room.baseRent,
        proratedRentCharged: room.baseRent,
        commonFeeCharged: commonFeeChargedMay,
        depositCharged: 0,
        discount: 0,
        otherCharged: 0,
        occupantCount: 1,
        remark: null,
        totalAmount: totalAmountMay,
        paymentSlipUrl: slipUrlMay,
        roomId: room.id,
        createdAt: new Date('2026-05-31'),
        updatedAt: new Date('2026-05-31'),
      });

      // For the first room only, simulate someone transferred the slip but the amount is wrong
      if (index === 0) {
        paymentTransactions.push({
          id: `pt-wrong-${room.id}`,
          slipId: `wrong-slip-${room.id}`,
          transRef: `REF${Math.floor(Math.random() * 1000000)}`,
          amount: totalAmountMay - 500, // Transferred 500 THB less than required
          senderName: tenant.name,
          transDate: '2026-06-02',
          transTime: '10:30',
          status: 'UNMATCHED', // Admin will see this and try to match it
          slipImageUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300',
          billId: null, // Not matched yet
          createdAt: new Date('2026-06-02T10:30:00Z'),
          updatedAt: new Date('2026-06-02T10:30:00Z'),
        });
      }

      // Create June 2026 bill (PAID, UNPAID, or PENDING)
      let prevLightJune = currLightMay;
      const isMetersFilled = index % 5 !== 0; // 80% are filled
      let currLightJune = isMetersFilled ? prevLightJune + 75 + (index % 35) : prevLightJune;
      let prevWaterJune = currWaterMay;
      let currWaterJune = isMetersFilled ? prevWaterJune + 12 + (index % 8) : prevWaterJune;

      let juneLightUnits = currLightJune - prevLightJune;
      let juneWaterUnits = currWaterJune - prevWaterJune;
      let juneLightPrice = juneLightUnits * 9;
      let juneWaterPrice = juneWaterUnits * 100;
      let commonFeeChargedJune = 100;
      let depositCharged = 0;
      let discount = 0;
      let occupantCount = 1;
      let remark: string | null = null;
      let billStatus: 'PAID' | 'UNPAID' | 'PENDING' | 'PARTIAL' = index % 2 === 0 ? 'PAID' : 'UNPAID';
      
      if (!isMetersFilled) {
        billStatus = 'PENDING';
      } else if (index % 3 === 0) {
        billStatus = 'PENDING';
      }

      // Special mockup for Room 112 (room-a-1-12) to match Excel screenshot exactly!
      if (room.roomNumber === '112' && room.propertyId === 'prop-building-a') {
        prevLightJune = 7346;
        currLightJune = 7346;
        juneLightUnits = 0;
        juneLightPrice = 0;
        prevWaterJune = 0;
        currWaterJune = 0;
        juneWaterUnits = 0;
        juneWaterPrice = 0;
        commonFeeChargedJune = 0;
        depositCharged = 0;
        discount = 3700; // room rent is 3,700, so net is 0!
        occupantCount = 5;
        remark = 'มาจาก 111 (5คน)';
        billStatus = 'PAID';
      }

      const totalAmountJune = Math.round((room.baseRent + juneLightPrice + juneWaterPrice + commonFeeChargedJune + depositCharged - discount) * 100) / 100;

      const paymentSlipUrl = billStatus === 'PAID' 
        ? 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300' 
        : billStatus === 'PENDING' && isMetersFilled
          ? 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?q=80&w=300'
          : null;

      bills.push({
        id: `bill-june-${room.id}`,
        month: 6,
        year: 2026,
        status: billStatus,
        paidAmount: billStatus === 'PAID' ? Math.max(0, totalAmountJune) : 0,
        previousLightMeter: prevLightJune,
        currentLightMeter: currLightJune,
        lightPricePerUnit: 9,
        totalLightPrice: juneLightPrice,
        previousWaterMeter: prevWaterJune,
        currentWaterMeter: currWaterJune,
        waterPricePerUnit: 100,
        totalWaterPrice: juneWaterPrice,
        baseRentCharged: room.baseRent,
        proratedRentCharged: room.baseRent,
        commonFeeCharged: commonFeeChargedJune,
        depositCharged,
        discount,
        otherCharged: 0,
        occupantCount,
        remark,
        totalAmount: Math.max(0, totalAmountJune),
        paymentSlipUrl,
        roomId: room.id,
        createdAt: new Date('2026-06-01'),
        updatedAt: new Date('2026-06-01'),
      });
    }
  });

  isInitialized = true;
  syncToGlobal();
}

// Getters and Mutators for Mock DB
export function getMockProperties() {
  initializeMockData();
  return properties;
}

export function getMockRooms(propertyId?: string) {
  initializeMockData();
  let result = rooms.map(r => ({
    ...r,
    property: properties.find(p => p.id === r.propertyId),
    tenants: tenants.filter(t => t.roomId === r.id && !t.endDate),
    bills: bills.filter(b => b.roomId === r.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3),
  }));
  if (propertyId) {
    result = result.filter(r => r.propertyId === propertyId);
  }
  return result;
}

export function getMockRoomById(id: string) {
  initializeMockData();
  const room = rooms.find(r => r.id === id);
  if (!room) return null;
  return {
    ...room,
    property: properties.find(p => p.id === room.propertyId),
    tenants: tenants.filter(t => t.roomId === room.id && !t.endDate),
    bills: bills.filter(b => b.roomId === room.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3),
  };
}

export function getMockBills(month: number, year: number, propertyId?: string) {
  initializeMockData();
  let activeBills = bills.filter(b => b.month === month && b.year === year);
  
  return activeBills.map(b => {
    const room = rooms.find(r => r.id === b.roomId)!;
    return {
      ...b,
      room: {
        ...room,
        property: properties.find(p => p.id === room.propertyId)!,
        tenants: tenants.filter(t => t.roomId === room.id && !t.endDate),
      }
    };
  }).filter(b => !propertyId || b.room.propertyId === propertyId);
}

export function updateMockBill(billId: string, data: Partial<Bill>) {
  initializeMockData();
  const idx = bills.findIndex(b => b.id === billId);
  if (idx === -1) return null;
  bills[idx] = { ...bills[idx], ...data, updatedAt: new Date() };
  syncToGlobal();
  return bills[idx];
}

export function updateMockRoom(roomId: string, data: Partial<Room>) {
  initializeMockData();
  const idx = rooms.findIndex(r => r.id === roomId);
  if (idx === -1) return null;
  rooms[idx] = { ...rooms[idx], ...data, updatedAt: new Date() };
  syncToGlobal();
  return rooms[idx];
}

export function updateMockProperty(propertyId: string, data: Partial<Property>) {
  initializeMockData();
  const idx = properties.findIndex(p => p.id === propertyId);
  if (idx === -1) return null;
  properties[idx] = { ...properties[idx], ...data, updatedAt: new Date() };
  syncToGlobal();
  return properties[idx];
}

export function createMockBill(data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>) {
  initializeMockData();
  const newBill: Bill = {
    ...data,
    paidAmount: data.paidAmount || 0,
    id: `bill-custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Replace if exists
  const existIdx = bills.findIndex(b => b.roomId === data.roomId && b.month === data.month && b.year === data.year);
  if (existIdx !== -1) {
    bills[existIdx] = { ...bills[existIdx], ...newBill };
  } else {
    bills.push(newBill);
  }
  syncToGlobal();
  return newBill;
}

export function addMockTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) {
  initializeMockData();
  const newTenant: Tenant = {
    ...tenant,
    id: `tenant-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  tenants.push(newTenant);
  syncToGlobal();
  return newTenant;
}

export function terminateMockTenant(roomId: string, endDate: Date) {
  initializeMockData();
  const activeTenant = tenants.find(t => t.roomId === roomId && !t.endDate);
  if (activeTenant) {
    activeTenant.endDate = endDate;
    activeTenant.updatedAt = new Date();
    syncToGlobal();
    return activeTenant;
  }
  return null;
}

export function createMockProperty(data: { 
  name: string; 
  type: 'BUILDING' | 'HOUSE'; 
  address: string | null;
  lightPricePerUnit?: number;
  waterPricePerUnit?: number;
  commonFee?: number;
}) {
  initializeMockData();
  const newProp: Property = {
    id: `prop-${Date.now()}`,
    name: data.name,
    type: data.type,
    address: data.address,
    lightPricePerUnit: data.lightPricePerUnit !== undefined ? data.lightPricePerUnit : 9,
    waterPricePerUnit: data.waterPricePerUnit !== undefined ? data.waterPricePerUnit : 100,
    commonFee: data.commonFee !== undefined ? data.commonFee : 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  properties.push(newProp);
  syncToGlobal();
  return newProp;
}

export function createMockRoom(data: { roomNumber: string; floor: number; baseRent: number; propertyId: string }) {
  initializeMockData();
  const newRoom: Room = {
    id: `room-${Date.now()}`,
    roomNumber: data.roomNumber,
    floor: Number(data.floor),
    baseRent: Number(data.baseRent),
    status: 'VACANT',
    occupantCount: 1,
    propertyId: data.propertyId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  rooms.push(newRoom);
  syncToGlobal();
  return newRoom;
}

export function deleteMockRoom(id: string) {
  initializeMockData();
  const roomIndex = rooms.findIndex(r => r.id === id);
  if (roomIndex === -1) return false;
  
  // Cascade delete bills and tenants
  bills = bills.filter(b => b.roomId !== id);
  tenants = tenants.filter(t => t.roomId !== id);
  rooms.splice(roomIndex, 1);
  syncToGlobal();
  return true;
}

export function resetMockDb(toEmpty: boolean) {
  properties = [];
  rooms = [];
  tenants = [];
  bills = [];
  paymentTransactions = [];
  isInitialized = true;
  syncToGlobal();
  if (!toEmpty) {
    isInitialized = false;
    initializeMockData();
  }
}

export function getMockPaymentTransactions() {
  initializeMockData();
  return paymentTransactions.map(pt => ({
    ...pt,
    bill: pt.billId ? bills.find(b => b.id === pt.billId) : undefined
  }));
}

export function createMockPaymentTransaction(data: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt' | 'bill'>) {
  initializeMockData();
  const newPt: PaymentTransaction = {
    ...data,
    id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  paymentTransactions.push(newPt);
  syncToGlobal();
  return newPt;
}

export function updateMockPaymentTransaction(ptId: string, data: Partial<PaymentTransaction>) {
  initializeMockData();
  const idx = paymentTransactions.findIndex(pt => pt.id === ptId);
  if (idx === -1) return null;
  paymentTransactions[idx] = { ...paymentTransactions[idx], ...data, updatedAt: new Date() };
  syncToGlobal();
  return paymentTransactions[idx];
}

