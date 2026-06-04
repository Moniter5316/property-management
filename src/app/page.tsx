'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Home, 
  UserPlus, 
  UserMinus, 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Printer, 
  Gauge, 
  Zap, 
  Droplet, 
  Coins, 
  TrendingUp, 
  Search,
  Check,
  ChevronRight,
  Database,
  ArrowLeft
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

import CheckInModal from '@/components/modals/CheckInModal';
import CheckOutModal from '@/components/modals/CheckOutModal';
import BillMetersModal from '@/components/modals/BillMetersModal';
import SlipVerificationModal from '@/components/modals/SlipVerificationModal';
import EditRoomModal from '@/components/modals/EditRoomModal';
import BillHistoryPanel from '@/components/BillHistoryPanel';


// Type definitions matching backend
interface Property {
  id: string;
  name: string;
  type: 'BUILDING' | 'HOUSE';
  address: string | null;
  lightPricePerUnit?: number;
  waterPricePerUnit?: number;
  commonFee?: number;
}

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  baseRent: number;
  status: 'VACANT' | 'OCCUPIED' | 'CLEARANCE';
  occupantCount: number;
  propertyId: string;
  property?: Property;
  tenants?: any[];
  bills?: any[];
}

interface Bill {
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
  room?: Room;
  createdAt: string | Date;
}

// Helper to convert number to Thai Baht text
function bahtText(num: number): string {
  if (num === 0) return 'ศูนย์บาทถ้วน';
  
  const numberText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const unitText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  // Format to two decimal places
  const str = num.toFixed(2);
  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  let bahtStr = '';
  
  // Helper for converting digit chunks
  const convertChunk = (digits: string): string => {
    let chunkStr = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(digits[i]);
      const position = len - 1 - i;
      if (digit !== 0) {
        if (position === 0 && digit === 1 && len > 1) {
          // Rule for 'เอ็ด'
          chunkStr += 'เอ็ด';
        } else if (position === 1 && digit === 2) {
          // Rule for 'ยี่'
          chunkStr += 'ยี่' + unitText[position];
        } else if (position === 1 && digit === 1) {
          // Rule for 'สิบ'
          chunkStr += unitText[position];
        } else {
          chunkStr += numberText[digit] + unitText[position];
        }
      }
    }
    return chunkStr;
  };
  
  // Handle integer part with potential millions
  const integerLen = integerPart.length;
  if (integerLen > 6) {
    // If over 1 million
    const millionPart = integerPart.slice(0, integerLen - 6);
    const lowerPart = integerPart.slice(integerLen - 6);
    bahtStr += convertChunk(millionPart) + 'ล้าน' + convertChunk(lowerPart);
  } else {
    bahtStr += convertChunk(integerPart);
  }
  
  if (bahtStr !== '') {
    bahtStr += 'บาท';
  }
  
  // Handle decimal part (Stang)
  if (parseInt(decimalPart) === 0) {
    bahtStr += 'ถ้วน';
  } else {
    let stangStr = '';
    const len = decimalPart.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(decimalPart[i]);
      const position = len - 1 - i;
      if (digit !== 0) {
        if (position === 0 && digit === 1 && len > 1) {
          stangStr += 'เอ็ด';
        } else if (position === 1 && digit === 2) {
          stangStr += 'ยี่' + unitText[position];
        } else if (position === 1 && digit === 1) {
          stangStr += unitText[position];
        } else {
          stangStr += numberText[digit] + unitText[position];
        }
      }
    }
    bahtStr += stangStr + 'สตางค์';
  }
  
  return bahtStr;
}

// Helper to format bill dates for Thai billing receipt
function getThaiBillDateString(month: number, year: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const yearBE = year + 543;
  const yearBE2Digit = yearBE % 100;
  
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  
  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const monthName = thaiMonths[month - 1];
  const monthNameShort = thaiMonthsShort[month - 1];
  
  return {
    fullDate: `วันที่ ${lastDay} ${monthName} ${yearBE2Digit}`,
    subText: `(ค่าเช่า ${monthNameShort} ${yearBE2Digit} )`,
    yearBE
  };
}

export default function Dashboard() {
  // Global States
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(true);
  const [activePropertyId, setActivePropertyId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default to June
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [unmatchedSlips, setUnmatchedSlips] = useState<any[]>([]);
  
  // View states
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isWalkingMeterMode, setIsWalkingMeterMode] = useState(false);

  // Modals state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalType, setModalType] = useState<'check-in' | 'check-out' | 'meters' | 'slip' | 'details' | 'add-property' | 'add-room' | 'reset-db' | 'edit-rates' | 'login' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form States
  // 1. Check-In
  const [checkInName, setCheckInName] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('2026-06-01');
  const [checkInLight, setCheckInLight] = useState('100');
  const [checkInWater, setCheckInWater] = useState('50');
  const [checkInOccupants, setCheckInOccupants] = useState('1');

  // 2. Check-Out
  const [checkOutDate, setCheckOutDate] = useState('2026-06-15');
  const [checkOutLight, setCheckOutLight] = useState('');
  const [checkOutWater, setCheckOutWater] = useState('');

  // 3. Enter utility meters (single room)
  const [meterLight, setMeterLight] = useState('');
  const [meterWater, setMeterWater] = useState('');

  // 4. Slip upload & verify
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [bypassSlipVerify, setBypassSlipVerify] = useState(true);

  // 5. Create Property Form
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<'BUILDING' | 'HOUSE'>('BUILDING');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropLight, setNewPropLight] = useState('9');
  const [newPropWater, setNewPropWater] = useState('100');
  const [newPropCommon, setNewPropCommon] = useState('100');

  // 6. Create Room Form
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomBaseRent, setNewRoomBaseRent] = useState('4000');
  const [newRoomPropertyId, setNewRoomPropertyId] = useState('');

  // 7. Reset DB Form
  const [resetToEmpty, setResetToEmpty] = useState(false);

  // 8. Single Room Bill Config Inputs
  const [meterCommon, setMeterCommon] = useState('100');
  const [meterDeposit, setMeterDeposit] = useState('0');
  const [meterDiscount, setMeterDiscount] = useState('0');
  const [meterOther, setMeterOther] = useState('0');
  const [meterRemark, setMeterRemark] = useState('');

  // 9. Walking meter form state (for walking around and inputting multiple rooms)
  const [walkingMeters, setWalkingMeters] = useState<Record<string, { light: string }>>({});

  // 10. Edit Room & Rates Form States
  const [editRoomRent, setEditRoomRent] = useState('');
  const [editRoomOccupants, setEditRoomOccupants] = useState('1');
  const [editPropName, setEditPropName] = useState('');
  const [editPropAddress, setEditPropAddress] = useState('');
  const [editPropLight, setEditPropLight] = useState('9');
  const [editPropWater, setEditPropWater] = useState('100');
  const [editPropCommon, setEditPropCommon] = useState('100');

  // 11. Authentication & Single Room Printing States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [printRoomId, setPrintRoomId] = useState<string | null>(null);

  // 12. Landing Portal states
  const [activeTab, setActiveTab] = useState<'login' | 'tenant'>('login');
  const [lookupRoomNumber, setLookupRoomNumber] = useState('');
  const [lookupPropertyId, setLookupPropertyId] = useState('');
  const [portalError, setPortalError] = useState<string | null>(null);

  // Load auth state from server session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setIsLoggedIn(data.isLoggedIn);
      } catch (err) {
        console.error('Error loading session:', err);
      }
    };
    checkSession();
  }, []);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const propRes = await fetch('/api/properties');
      const propsData = await propRes.json();
      if (Array.isArray(propsData)) setProperties(propsData);

      // Fetch rooms
      const roomsRes = await fetch('/api/rooms');
      const roomsData = await roomsRes.json();
      if (Array.isArray(roomsData)) setRooms(roomsData);

      // Fetch bills for current month/year
      const billsRes = await fetch(`/api/bills?month=${selectedMonth}&year=${selectedYear}`);
      const billsData = await billsRes.json();
      if (Array.isArray(billsData)) setBills(billsData);

      // Fetch unmatched slips if logged in
      try {
        const slipRes = await fetch('/api/webhooks/slipok/unmatched');
        if (slipRes.ok) {
          const slipData = await slipRes.json();
          if (Array.isArray(slipData)) setUnmatchedSlips(slipData);
        }
      } catch (err) {
        console.error('Failed to load unmatched slips', err);
      }

      // Check if fallback mock DB is running
      const testMock = Array.isArray(propsData) && propsData.length > 0 && propsData[0].id.includes('mock');
      setIsMock(!!testMock);
    } catch (e) {
      console.error('Error loading dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Compute stats based on current filters/month
  const filteredRooms = rooms.filter(room => {
    const matchesProperty = activePropertyId === 'all' || room.propertyId === activePropertyId;
    const roomNum = room.roomNumber || '';
    const tenantName = room.tenants?.[0]?.name || '';
    const matchesSearch = roomNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProperty && matchesSearch;
  });

  const totalRoomsCount = filteredRooms.length;
  const occupiedRoomsCount = filteredRooms.filter(r => r.status === 'OCCUPIED').length;
  const vacantRoomsCount = totalRoomsCount - occupiedRoomsCount;
  
  // Find bills for filtered rooms
  const filteredBills = bills.filter(b => {
    const r = rooms.find(room => room.id === b.roomId);
    return r && (activePropertyId === 'all' || r.propertyId === activePropertyId);
  });

  const paidBillsCount = filteredBills.filter(b => b.status === 'PAID').length;
  const unpaidBillsCount = filteredBills.filter(b => b.status === 'UNPAID').length;
  const pendingBillsCount = filteredBills.filter(b => b.status === 'PENDING').length;

  const totalRevenueCollected = filteredBills
    .filter(b => b.status === 'PAID')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalRevenueExpected = filteredBills
    .reduce((sum, b) => sum + b.totalAmount, 0);

  // Initialize walking meter states
  useEffect(() => {
    if (isWalkingMeterMode) {
      const initMeters: Record<string, { light: string }> = {};
      rooms
        .filter(r => (activePropertyId === 'all' || r.propertyId === activePropertyId))
        .forEach(r => {
          const activeBill = bills.find(b => b.roomId === r.id);
          initMeters[r.id] = {
            light: activeBill ? (activeBill.currentLightMeter || activeBill.previousLightMeter).toString() : '',
          };
        });
      setWalkingMeters(initMeters);
    }
  }, [isWalkingMeterMode, activePropertyId, bills, rooms]);

  // Handle open actions modal
  const openModal = (room: Room, type: typeof modalType) => {
    setSelectedRoom(room);
    setModalType(type);
    setModalError(null);
    setModalSuccess(null);
    
    // Prefill form states
    const activeBill = bills.find(b => b.roomId === room.id);
    const tenant = room.tenants?.[0];

    if (type === 'check-in') {
      setCheckInName('');
      setCheckInPhone('');
      setCheckInDate(new Date().toISOString().split('T')[0]);
      setCheckInLight(activeBill ? activeBill.currentLightMeter.toString() : '100');
      setCheckInWater(activeBill ? activeBill.currentWaterMeter.toString() : '50');
      setCheckInOccupants('1');
    } else if (type === 'check-out') {
      setCheckOutDate(new Date().toISOString().split('T')[0]);
      setCheckOutLight(activeBill ? activeBill.currentLightMeter.toString() : '');
      setCheckOutWater(activeBill ? activeBill.currentWaterMeter.toString() : '');
    } else if (type === 'meters') {
      setMeterLight(activeBill ? (activeBill.currentLightMeter === activeBill.previousLightMeter ? '' : activeBill.currentLightMeter.toString()) : '');
      setMeterWater(activeBill ? (activeBill.currentWaterMeter === activeBill.previousWaterMeter ? '' : activeBill.currentWaterMeter.toString()) : '');
      setMeterCommon(activeBill ? activeBill.commonFeeCharged.toString() : room.property?.commonFee?.toString() || '100');
      setMeterDeposit(activeBill ? activeBill.depositCharged.toString() : '0');
      setMeterDiscount(activeBill ? activeBill.discount.toString() : '0');
      setMeterOther(activeBill ? (activeBill.otherCharged ?? 0).toString() : '0');
      setMeterRemark(activeBill ? activeBill.remark || '' : '');
    } else if (type === 'slip') {
      setSlipFile(null);
      setSlipBase64(null);
    } else if (type === 'edit-rates') {
      setEditRoomRent(room.baseRent.toString());
      setEditRoomOccupants(room.occupantCount?.toString() || '1');
      setEditPropName(room.property?.name || '');
      setEditPropAddress(room.property?.address || '');
      setEditPropLight(room.property?.lightPricePerUnit?.toString() || '9');
      setEditPropWater(room.property?.waterPricePerUnit?.toString() || '100');
      setEditPropCommon(room.property?.commonFee?.toString() || '100');
    }
  };

  // 1. Submit Check-in
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          tenantName: checkInName,
          tenantPhone: checkInPhone,
          startDate: checkInDate,
          initialLightMeter: Number(checkInLight),
          initialWaterMeter: Number(checkInWater),
          occupantCount: Number(checkInOccupants),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');

      setModalSuccess(`เช็คอินห้อง ${selectedRoom.roomNumber} เรียบร้อยแล้ว!`);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 2. Submit Check-out
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          endDate: checkOutDate,
          finalLightMeter: Number(checkOutLight),
          finalWaterMeter: Number(checkOutWater),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-out failed');

      // Visual success confirmation with bill total
      setModalSuccess(`เช็คเอ้าท์สำเร็จ! มียอดรวมบิลสุดท้ายคงค้างชำระ: ฿${data.finalBill.totalAmount.toLocaleString()}`);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 3000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 3. Save Single Utility Meter Readings
  const handleSaveMeters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const activeBill = bills.find(b => b.roomId === selectedRoom.id);
    if (!activeBill) {
      setModalError('ไม่พบข้อมูลบิลสำหรับเดือนนี้ เพื่อตั้งค่าเลขมิเตอร์เริ่มต้น กรุณาทำการเช็คอินผู้เช่าก่อน');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          month: selectedMonth,
          year: selectedYear,
          previousLightMeter: activeBill.previousLightMeter,
          currentLightMeter: Number(meterLight),
          lightPricePerUnit: selectedRoom.property?.lightPricePerUnit || 9,
          previousWaterMeter: activeBill.previousWaterMeter,
          currentWaterMeter: Number(meterWater),
          waterPricePerUnit: selectedRoom.property?.waterPricePerUnit || 100,
          commonFeeCharged: Number(meterCommon),
          depositCharged: Number(meterDeposit),
          discount: Number(meterDiscount),
          otherCharged: Number(meterOther),
          remark: meterRemark || null,
          status: 'UNPAID', // Move from PENDING to UNPAID since readings are filled
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save utility meters');

      setModalSuccess('บันทึกมิเตอร์และคำนวณบิลสำเร็จ!');
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 4. Upload slip & trigger Slip Verification
  const handleSlipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);

    try {
      // Browser compression in real-time
      const compressedBase64 = await compressImage(file);
      setSlipBase64(compressedBase64);
    } catch (err) {
      console.error('Image compression failed', err);
      setModalError('การย่อรูปภาพสลิปล้มเหลว');
    }
  };

  const handleVerifySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !slipBase64) return;

    const activeBill = bills.find(b => b.roomId === selectedRoom.id);
    if (!activeBill) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: activeBill.id,
          slipImageBase64: slipBase64,
          bypassVerification: bypassSlipVerify,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Slip verification failed');

      setModalSuccess(data.message);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 3000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 4.5. Pay Cash directly without slip upload
  const handlePayCash = async (billId: string) => {
    const isConfirm = window.confirm('ยืนยันรับชำระเงินด้วยเงินสดสำหรับบิลนี้?');
    if (!isConfirm) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: billId,
          slipImageBase64: 'CASH',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Direct cash payment failed');

      setModalSuccess(data.message);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 4.6 Match an unmatched slip to this bill
  const handleMatchUnmatchedSlip = async (slipId: string, matchedAmount: number) => {
    if (!selectedRoom) return;
    const activeBill = bills.find(b => b.roomId === selectedRoom.id);
    if (!activeBill) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const billStatus = activeBill.totalAmount <= matchedAmount ? 'PAID' : 'PARTIAL';
      const res = await fetch('/api/bills/match-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentTransactionId: slipId,
          billId: activeBill.id,
          matchedAmount: matchedAmount,
          billStatus: billStatus
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to match slip');

      setModalSuccess(data.message);
      setTimeout(() => {
        setModalType(null);
        fetchData(); // This will refresh bills and unmatchedSlips
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 5. Submit Walking Meters for all rooms in one click
  const handleSaveWalkingMeters = async () => {
    setLoading(true);
    try {
      let savedCount = 0;
      for (const roomId in walkingMeters) {
        const { light } = walkingMeters[roomId];
        const room = rooms.find(r => r.id === roomId);
        const activeBill = bills.find(b => b.roomId === roomId);
        
        if (!room || !activeBill || !light) continue;
        
        // Use the property's configured rate (fallback to safe defaults)
        const lightRate = room.property?.lightPricePerUnit ?? 9;
        const waterRate = room.property?.waterPricePerUnit ?? 100;

        // Save via standard bill post
        await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            month: selectedMonth,
            year: selectedYear,
            previousLightMeter: activeBill.previousLightMeter,
            currentLightMeter: Number(light),
            lightPricePerUnit: lightRate,
            previousWaterMeter: activeBill.previousWaterMeter,
            currentWaterMeter: activeBill.previousWaterMeter, // ส่งเลขเดิมไปเพราะเหมาค่าน้ำ
            waterPricePerUnit: waterRate,
            status: 'UNPAID', // Mark as awaiting payment
          }),
        });
        savedCount++;
      }
      setIsWalkingMeterMode(false);
      fetchData();
      alert(`บันทึกมิเตอร์สำเร็จจำนวน ${savedCount} ห้อง เรียบร้อยแล้ว!`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์ชุดใหญ่');
    } finally {
      setLoading(false);
    }
  };

  // 6. Submit Create Property
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPropName,
          type: newPropType,
          address: newPropAddress,
          lightPricePerUnit: Number(newPropLight),
          waterPricePerUnit: Number(newPropWater),
          commonFee: Number(newPropCommon),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create property');

      setModalSuccess(`เพิ่มตึก/อาคาร "${newPropName}" สำเร็จ!`);
      setNewPropName('');
      setNewPropAddress('');
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 7. Submit Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomPropertyId) {
      setModalError('กรุณาเลือกตึก/อสังหาฯ');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: newRoomNumber,
          floor: Number(newRoomFloor),
          baseRent: Number(newRoomBaseRent),
          propertyId: newRoomPropertyId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      setModalSuccess(`เพิ่มห้อง ${newRoomNumber} สำเร็จ!`);
      setNewRoomNumber('');
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 7.1. Handle Room Deletion
  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    
    const isConfirm = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้อง ${selectedRoom.roomNumber}? ข้อมูลประวัติผู้เช่าและบิลค้างชำระทั้งหมดในห้องนี้จะถูกลบออกถาวร`);
    if (!isConfirm) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/rooms?id=${selectedRoom.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete room');

      setModalSuccess(`ลบห้อง ${selectedRoom.roomNumber} เรียบร้อยแล้ว!`);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 7.1.1 Handle Clearance (Return room to VACANT)
  const handleClearance = async () => {
    if (!selectedRoom) return;
    
    const isConfirm = window.confirm(`ยืนยันการปิดงานห้อง ${selectedRoom.roomNumber} และคืนเป็นสถานะห้องว่าง (VACANT) หรือไม่?`);
    if (!isConfirm) return;

    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}/clearance`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear room');

      setModalSuccess(`ปิดงานห้อง ${selectedRoom.roomNumber} สำเร็จ สถานะเป็นห้องว่างแล้ว!`);
      setTimeout(() => {
        setModalType(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 7.2. Submit Save Room & Property standard rates
  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setModalLoading(true);
    setModalError(null);
    try {
      // 1. Update property rates
      const propRes = await fetch('/api/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRoom.propertyId,
          name: editPropName.trim() || undefined,
          address: editPropAddress,
          lightPricePerUnit: Number(editPropLight),
          waterPricePerUnit: Number(editPropWater),
          commonFee: Number(editPropCommon),
        }),
      });

      const propData = await propRes.json();
      if (!propRes.ok) throw new Error(propData.error || 'Failed to update property rates');

      // 2. Update room base rent & occupants count
      const roomRes = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRoom.id,
          baseRent: Number(editRoomRent),
          occupantCount: Number(editRoomOccupants),
        }),
      });

      const roomData = await roomRes.json();
      if (!roomRes.ok) throw new Error(roomData.error || 'Failed to update room rent');

      // 3. Update existing bill for the active month if it exists
      const activeBill = bills.find(b => b.roomId === selectedRoom.id);
      if (activeBill) {
        const billRes = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedRoom.id,
            month: selectedMonth,
            year: selectedYear,
            previousLightMeter: activeBill.previousLightMeter,
            currentLightMeter: activeBill.currentLightMeter,
            lightPricePerUnit: Number(editPropLight),
            previousWaterMeter: activeBill.previousWaterMeter,
            currentWaterMeter: activeBill.currentWaterMeter,
            waterPricePerUnit: Number(editPropWater),
            commonFeeCharged: Number(editPropCommon),
            depositCharged: activeBill.depositCharged,
            discount: activeBill.discount,
            otherCharged: activeBill.otherCharged || 0,
            occupantCount: Number(editRoomOccupants),
            remark: activeBill.remark,
            status: activeBill.status,
            paymentSlipUrl: activeBill.paymentSlipUrl,
          }),
        });

        const billData = await billRes.json();
        if (!billRes.ok) throw new Error(billData.error || 'Failed to update associated bill rates');
      }

      setModalSuccess('อัปเดตเรทราคาและค่าเช่าสำเร็จ!');
      setTimeout(() => {
        setModalType('details'); // Go back to details view
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 8. Submit Database Reset / Seed
  const handleResetDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmpty: resetToEmpty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset database');

      setModalSuccess(resetToEmpty ? 'ล้างข้อมูลสำเร็จแล้ว! (ระบบเป็นพื้นที่ว่างเปล่า)' : 'โหลดข้อมูลตัวอย่าง 101 ห้อง สำเร็จแล้ว!');
      setTimeout(() => {
        setModalType(null);
        setActivePropertyId('all');
        fetchData();
      }, 2000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 8.5. Submit Login & Logout
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    setPortalError(null);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setIsLoggedIn(true);
      setLoginUsername('');
      setLoginPassword('');
      setModalType(null);
    } catch (err: any) {
      setPortalError(err.message);
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = async () => {
    const isConfirm = window.confirm('คุณต้องการออกจากระบบผู้ดูแลใช่หรือไม่?');
    if (!isConfirm) return;
    
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
      setIsLoggedIn(false);
      alert('ออกจากระบบเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      alert('ออกจากระบบล้มเหลว');
    }
  };

  const handleTenantLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError(null);

    if (!lookupRoomNumber) {
      setPortalError('กรุณากรอกเลขห้องพัก');
      return;
    }

    // Find the room matching room number (case insensitive) and property if selected
    const targetRoom = rooms.find(
      r => r.roomNumber.toLowerCase().trim() === lookupRoomNumber.toLowerCase().trim() &&
           (!lookupPropertyId || r.propertyId === lookupPropertyId)
    );

    if (!targetRoom) {
      setPortalError('ไม่พบข้อมูลห้องพักนี้ในระบบ กรุณาตรวจสอบเลขห้องหรือตึกอีกครั้ง');
      return;
    }

    // Find if the room has an active bill for the current period
    const roomBill = bills.find(b => b.roomId === targetRoom.id);
    if (!roomBill) {
      setPortalError(`ห้อง ${targetRoom.roomNumber} ยังไม่ได้สรุปบิลประจำรอบเดือนนี้`);
      return;
    }

    // Enter print view for this room's bill
    setPrintRoomId(targetRoom.id);
    setIsPrintMode(true);
  };

  // Render rooms grouped by Floor
  const renderRoomGrid = () => {
    const floorsMap: Record<number, Room[]> = {};
    filteredRooms.forEach(room => {
      const parsedFloor = Number(room.floor);
      const floorNum = isNaN(parsedFloor) ? 1 : parsedFloor;
      if (!floorsMap[floorNum]) {
        floorsMap[floorNum] = [];
      }
      floorsMap[floorNum].push(room);
    });

    const sortedFloors = Object.keys(floorsMap)
      .map(Number)
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b); // Lowest floor first

    if (sortedFloors.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-700/50 rounded-2xl glass-panel">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="text-slate-300 font-medium">ไม่พบข้อมูลห้องที่ค้นหา</p>
          <p className="text-slate-500 text-sm mt-1">ลองเปลี่ยนตึกหรือคำค้นหาของคุณ</p>
        </div>
      );
    }

    return sortedFloors.map(floor => {
      const floorRooms = floorsMap[floor] ? floorsMap[floor].sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || '')) : [];
      return (
        <div key={floor} className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-1 border-l-2 border-indigo-500">
            <span className="text-sm font-semibold tracking-wide uppercase text-indigo-400">ชั้น {floor}</span>
            <span className="text-xs text-slate-500">({floorRooms.length} ห้อง)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {floorRooms.map(room => {
              const activeBill = bills.find(b => b.roomId === room.id);
              const tenant = room.tenants?.[0];
              
              // Determine card state color
              let statusColorClass = 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700'; // VACANT
              let statusLabel = 'ห้องว่าง';

              if (room.status === 'CLEARANCE') {
                statusColorClass = 'border-amber-500/50 bg-amber-900/30 text-amber-400 hover:border-amber-500/70';
                statusLabel = 'กำลังคืนห้อง';
              } else if (room.status === 'OCCUPIED') {
                if (!activeBill) {
                  statusColorClass = 'border-amber-500/20 bg-amber-950/20 text-amber-400 hover:border-amber-500/40';
                  statusLabel = 'เช็คอินใหม่';
                } else if (activeBill.status === 'PAID') {
                  statusColorClass = 'border-emerald-500/20 bg-emerald-950/20 text-emerald-400 hover:border-emerald-500/40';
                  statusLabel = 'ชำระแล้ว';
                } else if (activeBill.status === 'PENDING') {
                  statusColorClass = 'border-amber-500/30 bg-amber-900/20 text-amber-400 hover:border-amber-500/50 animate-pulse-slow';
                  statusLabel = 'รอตรวจสลิป';
                } else {
                  statusColorClass = 'border-rose-500/20 bg-rose-950/20 text-rose-400 hover:border-rose-500/40';
                  statusLabel = 'ค้างชำระ';
                }
              }

              return (
                <div 
                  key={room.id}
                  onClick={() => openModal(room, 'details')}
                  className={`relative p-3 rounded-xl border glass-card cursor-pointer transition-all ${statusColorClass}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-base font-bold text-white tracking-tight">{room.roomNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium border border-current bg-white/5">
                      {statusLabel}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    {tenant ? (
                      <>
                        <p className="text-slate-300 font-medium truncate">{tenant.name}</p>
                        <p className="text-slate-500 tracking-wider">฿{room.baseRent.toLocaleString()}/ด.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-600 italic">ไม่มีผู้เช่า</p>
                        <p className="text-slate-500 tracking-wider">฿{room.baseRent.toLocaleString()}/ด.</p>
                      </>
                    )}

                    {/* Meter reading indicator if occupied */}
                    {activeBill && (
                      <div className="flex gap-2 pt-1.5 border-t border-white/5 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5 text-yellow-500" />
                          {activeBill.currentLightMeter || activeBill.previousLightMeter}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplet className="h-2.5 w-2.5 text-blue-400" />
                          {activeBill.currentWaterMeter || activeBill.previousWaterMeter}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // Batch Print View Render
  if (isPrintMode) {
    // Only unpaid/pending bills or print all bills for the selected month
    const printBills = bills.filter(b => {
      if (printRoomId && b.roomId !== printRoomId) return false;
      const room = rooms.find(r => r.id === b.roomId);
      return room && (printRoomId || activePropertyId === 'all' || room.propertyId === activePropertyId);
    });

    const printedRoom = printRoomId ? rooms.find(r => r.id === printRoomId) : null;

    return (
      <div className="min-h-screen bg-white text-black p-4 md:p-8">
        {/* Navigation Bar for Print Mode (Hidden during print) */}
        <div className="no-print mb-8 p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setPrintRoomId(null);
                setIsPrintMode(false);
              }}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>ย้อนกลับแดชบอร์ด</span>
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            <div>
              <p className="font-bold text-sm">
                {printedRoom ? `พิมพ์ใบแจ้งยอด ห้อง ${printedRoom.roomNumber}` : 'โหมดพิมพ์ใบแจ้งหนี้ชุดใหญ่'}
              </p>
              <p className="text-xs text-slate-400">
                พบ {printBills.length} บิลชำระเงินสำหรับเดือน {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Printer className="h-4 w-4" />
            {printedRoom ? 'สั่งพิมพ์ใบแจ้งหนี้ห้องนี้ (Ctrl + P)' : 'สั่งพิมพ์บิลทั้งหมด (Ctrl + P)'}
          </button>
        </div>

        {/* Print Pages Layout */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: A6 landscape; margin: 0; }
            body { margin: 0; padding: 0; }
            .print-page { width: 148mm !important; height: 105mm !important; margin: 0 !important; border: none !important; box-shadow: none !important; page-break-after: always; }
            .no-print { display: none !important; }
          }
        `}} />
        <div className="flex flex-col items-center gap-12 max-w-4xl mx-auto">
          {printBills.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg font-semibold">ไม่มีบิลประจำเดือนเพื่อพิมพ์</p>
              <p className="text-sm mt-1">กรุณากรอกเลขมิเตอร์น้ำไฟเพื่อสรุปบิลก่อนกดยืนยันพิมพ์</p>
            </div>
          ) : (
            printBills.map(bill => {
              const room = rooms.find(r => r.id === bill.roomId)!;
              const tenant = room.tenants?.[0];
              const lightUnits = Math.max(0, bill.currentLightMeter - bill.previousLightMeter);
              const waterUnits = Math.max(0, bill.currentWaterMeter - bill.previousWaterMeter);
              
              // Get Thai date string helpers
              const { fullDate, subText, yearBE } = getThaiBillDateString(selectedMonth, selectedYear);
              
              // Calculate reading dates: 29th of previous month to 27th of current month
              const prevMonthNum = selectedMonth === 1 ? 12 : selectedMonth - 1;
              const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
              const prevYearShort = (prevMonthYear + 543) % 100;
              const currYearShort = (selectedYear + 543) % 100;
              const readingPeriod = `29/${prevMonthNum}/${prevYearShort} - 27/${selectedMonth}/${currYearShort}`;

              return (
                <div key={bill.id} className="print-page w-[148mm] min-h-[105mm] p-4 border border-slate-300 rounded-lg shadow-sm bg-white flex flex-col justify-between text-[10px]">
                  <div>
                    {/* Centered Thai Title */}
                    <div className="text-center font-bold text-sm mb-2 tracking-wide">
                      ใบแจ้งยอดชำระเงิน / ใบเสร็จรับเงิน
                    </div>

                    {/* Shaded Header with Date and Room info */}
                    <div className="flex justify-between items-center border border-black bg-slate-50 py-1.5 px-3 mb-2 text-[10px] font-semibold">
                      <div>
                        {fullDate} {subText}
                      </div>
                      <div>
                        ห้อง {room.roomNumber}
                      </div>
                    </div>

                    {/* Address & Remark row */}
                    <div className="flex justify-between items-start text-[9px] mb-2 px-1 leading-relaxed">
                      <div className="flex-1 text-slate-700">
                        ที่อยู่ ................. หมู่ ....... แขวง/ตำบล ........................ เขต/อำเภอ ........................ จังหวัด ........................
                      </div>
                      {bill.remark && (
                        <div className="font-bold text-right text-[10px] text-slate-800 ml-2 shrink-0">
                          {bill.remark}
                        </div>
                      )}
                    </div>

                    <div className="text-xs mb-2 px-1">
                      มียอดชำระเงินตามรายการดังต่อไปนี้
                    </div>

                    {/* Receipt Items Table */}
                    <table className="w-full border-collapse border border-black text-[9px] mb-4">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-center border-b border-black text-[9px]">
                          <th className="border border-black py-1 px-1.5 text-left w-[50%] font-bold">รายการ</th>
                          <th className="border border-black py-1 px-1.5 text-center w-[15%] font-bold">จำนวน</th>
                          <th className="border border-black py-1 px-1.5 text-right w-[15%] font-bold">หน่วยละ</th>
                          <th className="border border-black py-1 px-1.5 text-right w-[20%] font-bold">รวมเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 1. Room rent */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5">
                            ค่าเช่าห้อง ตั้งแต่.......เดือน.................... ถึง..........เดือน.................... {yearBE}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center"></td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.baseRentCharged.toLocaleString()}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right font-semibold">
                            {bill.proratedRentCharged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 2. Water */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5">
                            <div className="flex flex-col">
                              <span>ค่าน้ำ จดครั้งก่อน {readingPeriod}</span>
                              <span className="font-mono text-slate-600 text-[8px]">
                                {bill.previousWaterMeter} ถึง {bill.currentWaterMeter}
                              </span>
                            </div>
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center">
                            {waterUnits}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.waterPricePerUnit.toLocaleString()}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.totalWaterPrice === 0 ? '-' : bill.totalWaterPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 3. Electricity */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5">
                            <div className="flex flex-col">
                              <span>ค่าไฟ จดครั้งก่อน {readingPeriod}</span>
                              <span className="font-mono text-slate-600 text-[8px]">
                                {bill.previousLightMeter} ถึง {bill.currentLightMeter}
                              </span>
                            </div>
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center">
                            {lightUnits}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.lightPricePerUnit.toLocaleString()}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.totalLightPrice === 0 ? '-' : bill.totalLightPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 4. Common Fee */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5">
                            ส่วนร่วม (เคเบิ้ล/ค่าขยะ/ไฟทางเดิน/ที่จอดมอไซค์)
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center">0</td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.commonFeeCharged.toLocaleString()}
                          </td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.commonFeeCharged === 0 ? '-' : bill.commonFeeCharged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 5. Deposit */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5">
                            เงินประกัน + ห้อง + น้ำ + ไฟ
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center"></td>
                          <td className="border border-black py-1 px-1.5 text-right"></td>
                          <td className="border border-black py-1 px-1.5 text-right">
                            {bill.depositCharged === 0 ? '-' : bill.depositCharged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 6. Discount */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5 text-red-600 font-semibold">
                            ส่วนลด
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center"></td>
                          <td className="border border-black py-1 px-1.5 text-right"></td>
                          <td className="border border-black py-1 px-1.5 text-right text-red-600 font-semibold">
                            {bill.discount === 0 ? '-' : `- ${bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </td>
                        </tr>

                        {/* 6.5. Others */}
                        <tr className="border-b border-black">
                          <td className="border border-black py-1 px-1.5 font-semibold text-slate-800">
                            อื่นๆ (ค่าปรับ/ค่าบริการอื่นๆ)
                          </td>
                          <td className="border border-black py-1 px-1.5 text-center"></td>
                          <td className="border border-black py-1 px-1.5 text-right"></td>
                          <td className="border border-black py-1 px-1.5 text-right font-semibold text-slate-800">
                            {(bill.otherCharged || 0) === 0 ? '-' : (bill.otherCharged || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* 7. Total Row */}
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={3} className="border border-black py-1.5 px-1.5">
                            <div className="flex justify-between items-center">
                              <span>ยอดเงินสุทธิ</span>
                              <span className="text-center font-bold flex-1 text-[10px] text-slate-800">
                                {bahtText(bill.totalAmount)}
                              </span>
                            </div>
                          </td>
                          <td className="border border-black py-1.5 px-1.5 text-right font-black text-[11px]">
                            {bill.totalAmount === 0 ? '-' : bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Receiver Signature Block */}
                    <div className="flex flex-col gap-1 text-[8px] mt-4 px-1">
                      <div className="flex items-center gap-1">
                        <span>ผู้รับเงิน ................................... ( ................................... )</span>
                        <span className="ml-1">วันที่ ............/............/............</span>
                      </div>
                      <div className="text-[7px] text-slate-400 no-print mt-1">
                        รหัสผู้เช่า: {tenant ? tenant.id.substring(0, 8).toUpperCase() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Payment Info block at bottom */}
                  <div className="border-t border-dashed border-slate-300 pt-2 mt-3 text-[8px] text-slate-500 flex justify-between items-end no-print">
                    <div>
                      <p className="font-bold text-slate-700 mb-0.5">ข้อมูลการชำระเงินสะดวกรวดเร็ว</p>
                      <p>ธนาคารกสิกรไทย (KBank) | เลขบัญชี: 098-7-65432-1 | หจก. บริหารสินทรัพย์สุขใจ</p>
                    </div>
                    <div className="text-right italic">
                      พิมพ์ผ่านระบบ Property Management Pro
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Mobile Walking Meter Input View
  if (isWalkingMeterMode) {
    const walkingRooms = rooms.filter(
      r => (activePropertyId === 'all' || r.propertyId === activePropertyId)
    );

    return (
      <div className="min-h-screen bg-[#070913] text-slate-100 p-4 md:p-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setIsWalkingMeterMode(false)}
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>ย้อนกลับ</span>
            </button>
            <h2 className="text-lg font-bold">กรอกเลขมิเตอร์น้ำ-ไฟ</h2>
            <span className="text-xs bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
              {walkingRooms.length} ห้อง
            </span>
          </div>

          <p className="text-slate-400 text-xs mb-6">
            เดินจดเลขมิเตอร์หน้างาน และพิมพ์ลงฟอร์มเรียงตามห้องแบบเรียลไทม์ ค่าหน่วยและราคารวมจะคำนวณอัตโนมัติเมื่อกดบันทึกทั้งหมด
          </p>

          <div className="space-y-4">
            {walkingRooms.map(room => {
              const activeBill = bills.find(b => b.roomId === room.id);
              const prevLight = activeBill ? activeBill.previousLightMeter : 0;
              const prevWater = activeBill ? activeBill.previousWaterMeter : 0;

              return (
                <div key={room.id} className="p-4 rounded-xl border border-slate-800 glass-card">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-bold text-white">ห้อง {room.roomNumber}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">{room.tenants?.[0]?.name}</span>
                  </div>

                  <div className="space-y-4">
                    {/* Electricity Input */}
                    <div>
                      <label className="block text-xs font-semibold text-yellow-400 mb-1.5 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> มิเตอร์ไฟ (เดิม: {prevLight})
                      </label>
                      <input 
                        type="number"
                        placeholder="เลขไฟใหม่"
                        value={walkingMeters[room.id]?.light || ''}
                        onChange={(e) => setWalkingMeters({
                          ...walkingMeters,
                          [room.id]: {
                            ...walkingMeters[room.id],
                            light: e.target.value
                          }
                        })}
                        className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-2 px-3 text-sm focus:outline-none text-white transition"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 mt-8 flex gap-3">
            <button 
              onClick={() => setIsWalkingMeterMode(false)}
              className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 py-3 rounded-lg text-sm font-semibold transition"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleSaveWalkingMeters}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              บันทึกมิเตอร์ทั้งหมด
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Landing Auth & Lookup Portal if not logged in and not printing
  if (!isLoggedIn && !isPrintMode) {
    return (
      <div className="min-h-screen w-full bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        {/* Decorative glowing gradient spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        {/* Brand Header */}
        <div className="text-center mb-8 z-10 space-y-2">
          <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-2">
            <Building2 className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Property Management Pro
          </h1>
          <p className="text-slate-400 text-xs max-w-sm">
            ระบบบริหารจัดการตึกและบ้านเช่าอัจฉริยะ สำหรับผู้ดูแลและผู้พักอาศัย
          </p>
        </div>

        {/* Portal Card */}
        <div className="max-w-md w-full bg-[#0b0e1e]/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl glass-panel z-10 animate-in fade-in zoom-in-95 duration-350">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 border-b border-slate-800 bg-[#070913]/40">
            <button 
              onClick={() => {
                setActiveTab('login');
                setPortalError(null);
              }}
              className={`py-3.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'login' 
                  ? 'border-b-2 border-indigo-500 text-indigo-400 bg-white/[0.02]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
              }`}
            >
              <Coins className="h-4 w-4" />
              <span>เข้าสู่ระบบผู้ดูแล</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('tenant');
                setPortalError(null);
              }}
              className={`py-3.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'tenant' 
                  ? 'border-b-2 border-indigo-500 text-indigo-400 bg-white/[0.02]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>ตรวจสอบบิลห้องพัก</span>
            </button>
          </div>

          <div className="p-6">
            {portalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
                {portalError}
              </div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
                  <input 
                    type="text"
                    required
                    placeholder="ป้อนชื่อผู้ใช้"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">รหัสผ่าน (Password)</label>
                  <input 
                    type="password"
                    required
                    placeholder="ป้อนรหัสผ่าน"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition"
                  />
                </div>

                {/* Default Credentials Helper */}
                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/10 text-[10px] text-indigo-400 leading-relaxed">
                  💡 <strong>บัญชีทดสอบผู้ดูแล:</strong><br />
                  ชื่อผู้ใช้: <code className="bg-indigo-950/50 px-1 py-0.5 rounded font-mono select-all">admin</code> | รหัสผ่าน: <code className="bg-indigo-950/50 px-1 py-0.5 rounded font-mono select-all">password</code>
                </div>

                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center shadow-lg shadow-indigo-600/10"
                >
                  {modalLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTenantLookup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">เลือกตึก/โครงการ (Property)</label>
                  <select 
                    value={lookupPropertyId} 
                    onChange={(e) => setLookupPropertyId(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition cursor-pointer"
                  >
                    <option value="">-- เลือกตึก/โครงการทั้งหมด --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">หมายเลขห้องพัก (Room Number)</label>
                  <input 
                    type="text"
                    required
                    placeholder="เช่น 101, 112"
                    value={lookupRoomNumber}
                    onChange={(e) => setLookupRoomNumber(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[10px] text-slate-400 leading-relaxed">
                  📢 <strong>คำชี้แจงสำหรับผู้พักอาศัย:</strong><br />
                  กรุณาเลือกโครงการและกรอกหมายเลขห้องพักเพื่อสืบค้นใบแจ้งหนี้ประจำเดือน
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center shadow-lg shadow-emerald-600/10"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span>ค้นหาและดูใบแจ้งยอด</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-600 mt-8 z-10">
          Property Management Pro © 2026. All rights reserved.
        </div>
      </div>
    );
  }

  // Dashboard Main View
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col">
      {/* Top Banner (Database Status Alert) */}
      <div className="w-full bg-indigo-950/30 border-b border-indigo-500/10 py-2 px-4 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2 text-indigo-400">
          <Database className="h-3.5 w-3.5" />
          <span>สถานะเซิร์ฟเวอร์:</span>
          {isMock ? (
            <span className="font-semibold bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px]">
              🖥️ Local Mock Database Fallback (พร้อมทดสอบ)
            </span>
          ) : (
            <span className="font-semibold bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] text-emerald-400">
              ⚡ LIVE SUPABASE CLOUD (CONNECTED)
            </span>
          )}
        </div>
        <div className="text-slate-400 hidden sm:block">
          เวลาท้องถิ่น: {new Date().toLocaleDateString('th-TH')}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel relative overflow-hidden">
          {/* Subtle glowing radial background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>
          
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                <Building2 className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Property Management Pro
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  ระบบบริการจัดการทรัพย์สินและสรุปบิลอัจฉริยะ สำหรับอาคาร 100+ ห้อง
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick action buttons */}
            {isLoggedIn && (
              <>
                <button 
                  onClick={() => {
                    setModalError(null);
                    setModalSuccess(null);
                    setModalType('add-property');
                  }}
                  className="flex items-center gap-1.5 bg-[#12162a] hover:bg-[#181d36] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <span>+ เพิ่มตึก/อาคาร</span>
                </button>

                <button 
                  onClick={() => {
                    setModalError(null);
                    setModalSuccess(null);
                    if (properties.length > 0) {
                      setNewRoomPropertyId(properties[0].id);
                    }
                    setModalType('add-room');
                  }}
                  className="flex items-center gap-1.5 bg-[#12162a] hover:bg-[#181d36] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <span>+ เพิ่มห้องเช่า</span>
                </button>

                <button 
                  onClick={() => {
                    setModalError(null);
                    setModalSuccess(null);
                    setModalType('reset-db');
                  }}
                  className="flex items-center gap-1.5 bg-[#12162a] hover:bg-[#181d36] text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/25 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <span>ล้าง/รีเซ็ตระบบ</span>
                </button>

                <div className="w-px h-6 bg-slate-800 hidden sm:block mx-1"></div>

                <button 
                  onClick={() => setIsWalkingMeterMode(true)}
                  className="flex items-center gap-1.5 bg-[#12162a] hover:bg-[#181d36] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <Gauge className="h-4 w-4" />
                  <span>เดินจดมิเตอร์น้ำไฟ</span>
                </button>

                <div className="w-px h-6 bg-slate-800 hidden sm:block mx-1"></div>
              </>
            )}

            <button 
              onClick={() => {
                setPrintRoomId(null); // Print all
                setIsPrintMode(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์บิลชุดเล็ก (A6)</span>
            </button>

            <div className="w-px h-6 bg-slate-800 hidden sm:block mx-1"></div>

            {isLoggedIn ? (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <span>ออกจากระบบ (Logout)</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  setModalError(null);
                  setModalSuccess(null);
                  setModalType('login');
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition"
              >
                <span>เข้าสู่ระบบ (Admin Login)</span>
              </button>
            )}
          </div>
        </div>

        {/* Pending Unmatched Slips Block */}
        {isLoggedIn && unmatchedSlips.length > 0 && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 glass-panel shadow-lg shadow-amber-900/10 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-400">รายการโอนเงินรอการตรวจสอบ ({unmatchedSlips.length} รายการ)</h3>
                <p className="text-xs text-amber-500/70">สลิปจาก SlipOK ที่ไม่ตรงกับยอดบิล หรือต้องการการจับคู่ด้วยตนเอง</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unmatchedSlips.map(slip => (
                <div key={slip.id} className="p-3 bg-[#0b0e1e]/60 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">฿{slip.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{slip.senderName} - {slip.transDate} {slip.transTime}</p>
                  </div>
                  <button
                    onClick={() => {
                      setModalError(null);
                      setModalSuccess(null);
                      setModalType('slip');
                      // Wait, we need a special modal to match this slip to a bill.
                      // I'll add a simple matching flow.
                      window.alert(`โอนเมื่อ: ${slip.transDate} ${slip.transTime}\nอ้างอิง: ${slip.transRef}\nจำนวนเงิน: ฿${slip.amount}\nผู้ส่ง: ${slip.senderName}\n\nกรุณาเลือกลูกบ้านและบิลที่ต้องการจับคู่ผ่านหน้ารายละเอียดห้องในเวอร์ชันนี้`);
                    }}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold transition border border-amber-500/30"
                  >
                    ตรวจสอบ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistical Summary Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Occupancy */}
          <div className="p-4 rounded-2xl border border-slate-800/80 glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">อัตราการเข้าพัก (Occupancy)</span>
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Home className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">
              {totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0}%
            </p>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>อยู่ {occupiedRoomsCount} ห้อง</span>
              <span>ว่าง {vacantRoomsCount} ห้อง</span>
            </div>
          </div>

          {/* Bill Progress Counter */}
          <div className="p-4 rounded-2xl border border-slate-800/80 glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">การเก็บค่าเช่าเดือนนี้</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">
              {paidBillsCount} / {filteredBills.length}
            </p>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span className="text-emerald-400 font-medium">ชำระแล้ว {paidBillsCount}</span>
              <span className="text-rose-400 font-medium">ค้างชำระ {unpaidBillsCount}</span>
            </div>
          </div>

          {/* Financial: Collected */}
          <div className="p-4 rounded-2xl border border-slate-800/80 glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">ยอดเงินเก็บได้แล้ว</span>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-400">
              ฿{totalRevenueCollected.toLocaleString()}
            </p>
            <div className="text-[10px] text-slate-500 mt-1">
              ได้รับเงินโอนสำเร็จแล้ว
            </div>
          </div>

          {/* Financial: Uncollected */}
          <div className="p-4 rounded-2xl border border-slate-800/80 glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">ยอดค้างจ่ายทั้งหมด</span>
              <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-rose-400">
              ฿{(totalRevenueExpected - totalRevenueCollected).toLocaleString()}
            </p>
            <div className="text-[10px] text-slate-500 mt-1">
              ยอดเงินคาดหวังรวม: ฿{totalRevenueExpected.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 rounded-2xl border border-slate-800/80 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Property tabs navigation */}
          <div className="flex overflow-x-auto gap-1 pb-2 md:pb-0 scrollbar-none">
            <button 
              onClick={() => setActivePropertyId('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                activePropertyId === 'all' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              ทั้งหมด ({rooms.length})
            </button>
            {properties.map(prop => {
              const propRooms = rooms.filter(r => r.propertyId === prop.id);
              return (
                <button 
                  key={prop.id}
                  onClick={() => setActivePropertyId(prop.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                    activePropertyId === prop.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {prop.name} ({propRooms.length})
                </button>
              );
            })}
          </div>

          {/* Search & Month Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="ค้นหาเลขห้อง/ชื่อผู้เช่า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-56 bg-[#12162a]/55 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none transition"
              />
            </div>

            <div className="flex gap-2">
              {/* Month Switcher - dynamic all 12 months */}
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#12162a]/55 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition cursor-pointer"
              >
                {[
                  { v: 1, label: 'มกราคม (01)' },
                  { v: 2, label: 'กุมภาพันธ์ (02)' },
                  { v: 3, label: 'มีนาคม (03)' },
                  { v: 4, label: 'เมษายน (04)' },
                  { v: 5, label: 'พฤษภาคม (05)' },
                  { v: 6, label: 'มิถุนายน (06)' },
                  { v: 7, label: 'กรกฎาคม (07)' },
                  { v: 8, label: 'สิงหาคม (08)' },
                  { v: 9, label: 'กันยายน (09)' },
                  { v: 10, label: 'ตุลาคม (10)' },
                  { v: 11, label: 'พฤศจิกายน (11)' },
                  { v: 12, label: 'ธันวาคม (12)' },
                ].map(m => (
                  <option key={m.v} value={m.v}>{m.label}</option>
                ))}
              </select>

              {/* Year Switcher - dynamic: 2 years back to 1 year forward */}
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#12162a]/55 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition cursor-pointer"
              >
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Room Grid Panel */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-xs">กำลังดึงข้อมูลอสังหาริมทรัพย์และมิเตอร์รายเดือน...</p>
          </div>
        ) : (
          renderRoomGrid()
        )}
      </div>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-800/80 py-4 text-center text-xs text-slate-600 mt-auto bg-[#070913]/90">
        Property Management Pro © 2026. Designed for landlords managing 100+ rental properties in Thailand.
      </footer>

      {/* DETAIL MODAL PANEL */}
      {modalType === 'details' && selectedRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1e] border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
            {/* Modal Title Banner */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  ห้อง {selectedRoom.roomNumber}
                </h3>
                <p className="text-[10px] text-slate-400">{selectedRoom.property?.name}</p>
              </div>
              <button 
                onClick={() => setModalType(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Tenant Profile Section */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">ข้อมูลผู้เช่า</h4>
                {selectedRoom.status === 'OCCUPIED' && selectedRoom.tenants?.[0] ? (
                  <div className="space-y-1 text-sm text-slate-200">
                    <p className="font-bold">{selectedRoom.tenants[0].name}</p>
                    <p className="text-xs text-slate-400">เบอร์ติดต่อ: {selectedRoom.tenants[0].phone}</p>
                    <p className="text-xs text-slate-400">
                      ย้ายเข้า: {new Date(selectedRoom.tenants[0].startDate).toLocaleDateString('th-TH')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-indigo-400 font-semibold">เงินประกันห้อง:</span> ฿{(selectedRoom.tenants[0].depositAmount || 0).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    สถานะว่าง (ไม่มีสัญญาผู้เช่าที่ใช้งานอยู่)
                  </div>
                )}
              </div>

              {/* Utility Bills Section */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    บิลค่าเช่าประจำรอบ {selectedMonth}/{selectedYear}
                  </h4>
                  <span className="text-xs text-slate-500">ค่าเช่าหลัก: ฿{selectedRoom.baseRent.toLocaleString()}</span>
                </div>

                {(() => {
                  const bill = bills.find(b => b.roomId === selectedRoom.id);
                  if (!bill) {
                    return (
                      <p className="text-xs text-slate-500 italic py-2">ยังไม่ได้กรอกมิเตอร์เพื่อออกบิล</p>
                    );
                  }

                  const lightUnits = Math.max(0, bill.currentLightMeter - bill.previousLightMeter);
                  const waterUnits = Math.max(0, bill.currentWaterMeter - bill.previousWaterMeter);

                  return (
                    <div className="space-y-2 mt-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-[#12162a] rounded">
                          <p className="text-[10px] text-slate-400 mb-0.5">ค่าไฟ ({lightUnits} หน่วย)</p>
                          <p className="font-semibold text-white">฿{bill.totalLightPrice.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-[#12162a] rounded">
                          <p className="text-[10px] text-slate-400 mb-0.5">ค่าน้ำ ({waterUnits} หน่วย)</p>
                          <p className="font-semibold text-white">฿{bill.totalWaterPrice.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-[#12162a] rounded">
                          <p className="text-[10px] text-slate-400 mb-0.5">ค่าเช่า ({bill.proratedRentCharged === bill.baseRentCharged ? 'เต็มเดือน' : 'เฉลี่ยรายวัน'})</p>
                          <p className="font-semibold text-white">฿{bill.proratedRentCharged.toLocaleString()}</p>
                        </div>
                      </div>

                      {(bill.commonFeeCharged > 0 || bill.depositCharged > 0 || bill.discount > 0 || (bill.otherCharged || 0) > 0) && (
                        <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px] text-slate-400">
                          {bill.commonFeeCharged > 0 && (
                            <div className="flex justify-between">
                              <span>ค่าส่วนกลาง:</span>
                              <span className="text-white">฿{bill.commonFeeCharged.toLocaleString()}</span>
                            </div>
                          )}
                          {bill.depositCharged > 0 && (
                            <div className="flex justify-between">
                              <span>เงินประกัน:</span>
                              <span className="text-white">฿{bill.depositCharged.toLocaleString()}</span>
                            </div>
                          )}
                          {bill.discount > 0 && (
                            <div className="flex justify-between">
                              <span>ส่วนลด:</span>
                              <span className="text-rose-400">- ฿{bill.discount.toLocaleString()}</span>
                            </div>
                          )}
                          {(bill.otherCharged || 0) > 0 && (
                            <div className="flex justify-between">
                              <span>อื่นๆ:</span>
                              <span className="text-indigo-400">+ ฿{(bill.otherCharged || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-start pt-3 border-t border-slate-800 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">ยอดรวมทั้งสิ้น</p>
                          <p className="text-base font-black text-white">฿{bill.totalAmount.toLocaleString()}</p>
                          {bill.paidAmount < bill.totalAmount && (
                            <div className="mt-1">
                              {bill.paidAmount > 0 && (
                                <p className="text-[10px] text-emerald-400/80">ชำระมาแล้ว: ฿{bill.paidAmount.toLocaleString()}</p>
                              )}
                              <p className="text-[11px] font-bold text-rose-400 mt-0.5">ยอดค้างชำระ: ฿{(bill.totalAmount - bill.paidAmount).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] rounded font-bold border ${
                            bill.status === 'PAID'
                              ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/20'
                              : bill.status === 'REFUNDED'
                                ? 'border-indigo-500/20 text-indigo-400 bg-indigo-950/20'
                                : bill.status === 'CLEARED'
                                  ? 'border-slate-500/20 text-slate-400 bg-slate-950/20'
                                  : bill.status === 'PENDING' || bill.status === 'REFUND_PENDING'
                                    ? 'border-amber-500/20 text-amber-400 bg-amber-950/20 animate-pulse-slow'
                                    : 'border-rose-500/20 text-rose-400 bg-rose-950/20'
                          }`}>
                            {bill.status === 'PAID' ? 'ชำระแล้ว' : bill.status === 'REFUNDED' ? 'คืนเงินแล้ว' : bill.status === 'CLEARED' ? 'เคลียร์แล้ว' : bill.status === 'PENDING' ? 'รอตรวจสอบสลิป' : bill.status === 'REFUND_PENDING' ? 'รอโอนคืนเงิน' : bill.status === 'PARTIAL' ? 'ชำระบางส่วน' : 'ค้างชำระ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bill History Section */}
              <BillHistoryPanel roomId={selectedRoom.id} />

              {/* Action Buttons Panel */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {!isLoggedIn ? (
                  <>
                    {(() => {
                      const bill = bills.find(b => b.roomId === selectedRoom.id);
                      if (bill) {
                        return (
                          <button 
                            onClick={() => {
                              setPrintRoomId(selectedRoom.id);
                              setIsPrintMode(true);
                              setModalType(null); // Close modal
                            }}
                            className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition"
                          >
                            <Printer className="h-4 w-4" />
                            พิมพ์ใบแจ้งหนี้ห้องนี้ (Print Invoice)
                          </button>
                        );
                      } else {
                        return (
                          <div className="col-span-2 text-center text-xs text-slate-500 italic py-2">
                            ยังไม่ได้ออกบิลสำหรับห้องนี้ประจำเดือนนี้
                          </div>
                        );
                      }
                    })()}
                  </>
                ) : selectedRoom.status === 'VACANT' ? (
                  <>
                    <button 
                      onClick={() => setModalType('check-in')}
                      className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition"
                    >
                      <UserPlus className="h-4 w-4" />
                      เช็คอินผู้เช่าใหม่ (Check-In)
                    </button>
                    <button 
                      onClick={() => setModalType('edit-rates')}
                      className="flex items-center justify-center gap-2 bg-[#12162a] hover:bg-[#181d36] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 py-2.5 px-4 rounded-xl text-xs font-semibold transition"
                    >
                      แก้ไขห้องและเรทราคา
                    </button>
                    <button 
                      onClick={handleDeleteRoom}
                      disabled={modalLoading}
                      className="flex items-center justify-center gap-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/10 font-bold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {modalLoading ? 'กำลังลบ...' : 'ลบห้องเช่านี้'}
                    </button>
                  </>
                ) : selectedRoom.status === 'CLEARANCE' ? (
                  <>
                    {(() => {
                      const bill = bills.find(b => b.roomId === selectedRoom.id);
                      if (!bill || ['PAID', 'REFUNDED', 'CLEARED'].includes(bill.status)) {
                        return (
                          <button 
                            onClick={handleClearance}
                            disabled={modalLoading}
                            className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {modalLoading ? 'กำลังดำเนินการ...' : 'ปิดงาน / คืนเป็นห้องว่าง (VACANT)'}
                          </button>
                        );
                      }
                      return (
                        <>
                          <div className="col-span-2 text-center text-xs text-rose-400 italic py-1 bg-rose-950/20 rounded-lg">
                            กรุณารับชำระบิลสุดท้ายก่อนทำการปิดงาน
                          </div>
                          <button 
                            onClick={() => handlePayCash(bill.id)}
                            className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition mt-2"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            รับชำระเงินสดบิลสุดท้าย
                          </button>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setModalType('meters')}
                      className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      <Gauge className="h-3.5 w-3.5" />
                      กรอกเลขมิเตอร์น้ำไฟ
                    </button>

                    {(() => {
                      const bill = bills.find(b => b.roomId === selectedRoom.id);
                      if (!bill || ['PAID', 'REFUNDED', 'CLEARED'].includes(bill.status)) {
                        return (
                          <button 
                            disabled
                            className="flex items-center justify-center gap-2 bg-slate-900 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-800 cursor-not-allowed"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            แนบสลิป/แจ้งจ่าย
                          </button>
                        );
                      }
                      return (
                        <>
                          <button 
                            onClick={() => setModalType('slip')}
                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            แนบสลิป/แจ้งจ่าย
                          </button>
                          <button 
                            onClick={() => handlePayCash(bill.id)}
                            className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            รับชำระเงินสด (จ่ายสดแล้ว)
                          </button>
                        </>
                      );
                    })()}

                    <button 
                      onClick={() => setModalType('edit-rates')}
                      className="col-span-2 flex items-center justify-center gap-2 bg-[#12162a] hover:bg-[#181d36] text-indigo-400 hover:text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/25 py-2.5 px-4 rounded-xl text-xs font-semibold transition"
                    >
                      แก้ไขห้องและเรทราคา
                    </button>

                    <button 
                      onClick={() => setModalType('check-out')}
                      className="col-span-2 flex items-center justify-center gap-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/10 font-bold py-2.5 px-4 rounded-xl text-xs transition mb-2"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      คืนห้อง / เช็คเอ้าท์ (Check-Out)
                    </button>

                    <button 
                      onClick={handleDeleteRoom}
                      disabled={modalLoading}
                      className="col-span-2 flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-500/20 font-semibold py-2 px-4 rounded-xl text-[11px] transition"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {modalLoading ? 'กำลังลบ...' : 'บังคับลบห้องเช่า (ลบประวัติและบิลทั้งหมด)'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORTED MODALS */}
      {modalType === 'check-in' && selectedRoom && (
        <CheckInModal 
          room={selectedRoom} 
          onClose={() => setModalType('details')} 
          onSuccess={(msg) => { setModalSuccess(msg); setTimeout(() => { setModalType(null); fetchData(); }, 1500); }} 
        />
      )}

      {modalType === 'check-out' && selectedRoom && (
        <CheckOutModal 
          room={selectedRoom} 
          onClose={() => setModalType('details')} 
          onSuccess={(msg) => { setModalSuccess(msg); setTimeout(() => { setModalType(null); fetchData(); }, 3000); }} 
        />
      )}

      {modalType === 'meters' && selectedRoom && (
        <BillMetersModal 
          room={selectedRoom} 
          activeBill={bills.find(b => b.roomId === selectedRoom.id)}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => setModalType('details')} 
          onSuccess={(msg) => { setModalSuccess(msg); setTimeout(() => { setModalType(null); fetchData(); }, 1500); }} 
        />
      )}

      {modalType === 'slip' && selectedRoom && (
        <SlipVerificationModal 
          room={selectedRoom} 
          activeBill={bills.find(b => b.roomId === selectedRoom.id)}
          unmatchedSlips={unmatchedSlips}
          onClose={() => setModalType('details')} 
          onSuccess={(msg) => { setModalSuccess(msg); setTimeout(() => { setModalType(null); fetchData(); }, 1500); }} 
        />
      )}

      {modalType === 'edit-rates' && selectedRoom && (
        <EditRoomModal 
          room={selectedRoom} 
          activeBill={bills.find(b => b.roomId === selectedRoom.id)}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => setModalType('details')} 
          onSuccess={(msg) => { setModalSuccess(msg); setTimeout(() => { setModalType('details'); fetchData(); }, 1500); }} 
        />
      )}
      {/* ADD PROPERTY MODAL */}
      {modalType === 'add-property' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1e] border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">เพิ่มตึก / อาคาร / อสังหาริมทรัพย์</h3>
                <p className="text-[10px] text-slate-400">สร้างโครงการใหม่เพื่อแยกการบริหารจัดการ</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-300">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
                  {modalSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อตึก/ชื่ออาคาร</label>
                <input 
                  type="text"
                  required
                  placeholder="เช่น ตึก C, บ้านทาวน์โฮม A"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ประเภทอสังหาฯ</label>
                <select 
                  value={newPropType} 
                  onChange={(e) => setNewPropType(e.target.value as any)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition cursor-pointer"
                >
                  <option value="BUILDING">ตึก/อาคารพาณิชย์ (Building)</option>
                  <option value="HOUSE">บ้านเดี่ยว/ทาวน์เฮ้าส์ (House)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ที่อยู่อสังหาริมทรัพย์</label>
                <textarea 
                  placeholder="รายละเอียดที่อยู่สำหรับออกหัวบิลใบเสร็จ..."
                  rows={2}
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#12162a]/40 p-3 rounded-xl border border-slate-800/80">
                <div className="col-span-3">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">ตั้งค่าอัตราค่าบริการเริ่มต้น</p>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ค่าไฟ (บ./หน่วย)</label>
                  <input 
                    type="number"
                    required
                    value={newPropLight}
                    onChange={(e) => setNewPropLight(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ค่าน้ำ (บ./หน่วย)</label>
                  <input 
                    type="number"
                    required
                    value={newPropWater}
                    onChange={(e) => setNewPropWater(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ส่วนกลาง (บ./ด.)</label>
                  <input 
                    type="number"
                    required
                    value={newPropCommon}
                    onChange={(e) => setNewPropCommon(e.target.value)}
                    className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center"
                >
                  {modalLoading ? 'กำลังบันทึก...' : 'สร้างตึกใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {modalType === 'add-room' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1e] border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">เพิ่มห้องเช่าใหม่ (Add Room)</h3>
                <p className="text-[10px] text-slate-400">สร้างรายห้องเช่าลงในโครงการอสังหาฯ</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-300">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
                  {modalSuccess}
                </div>
              )}

              {properties.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-xs mb-3">กรุณาสร้างตึก/อสังหาฯ ก่อนอย่างน้อย 1 รายการ</p>
                  <button 
                    type="button"
                    onClick={() => setModalType('add-property')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                  >
                    ไปสร้างตึก
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">เลือกตึก/อสังหาฯ ที่ต้องการเพิ่ม</label>
                    <select 
                      value={newRoomPropertyId} 
                      onChange={(e) => setNewRoomPropertyId(e.target.value)}
                      className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition cursor-pointer"
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">เลขห้อง (Room Number)</label>
                      <input 
                        type="text"
                        required
                        placeholder="เช่น 101, A5"
                        value={newRoomNumber}
                        onChange={(e) => setNewRoomNumber(e.target.value)}
                        className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชั้นที่ (Floor)</label>
                      <input 
                        type="number"
                        required
                        value={newRoomFloor}
                        onChange={(e) => setNewRoomFloor(e.target.value)}
                        className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">ค่าเช่าหลักประจำห้อง (Base Rent)</label>
                    <input 
                      type="number"
                      required
                      placeholder="เช่น 4500"
                      value={newRoomBaseRent}
                      onChange={(e) => setNewRoomBaseRent(e.target.value)}
                      className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="submit"
                      disabled={modalLoading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center"
                    >
                      {modalLoading ? 'กำลังบันทึก...' : 'เพิ่มห้องเช่า'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* RESET DATABASE MODAL */}
      {modalType === 'reset-db' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1e] border border-slate-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">ล้างข้อมูล / รีเซ็ตระบบ</h3>
                <p className="text-[10px] text-slate-400">ควบคุมและล้างข้อมูลฐานข้อมูล</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-300">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetDb} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
                  {modalSuccess}
                </div>
              )}

              <p className="text-xs text-slate-300">
                คุณสามารถเลือกล้างระบบให้ว่างเปล่าเพื่อเริ่มเพิ่มห้องเองจากศูนย์ หรือจะโหลดข้อมูลตัวอย่างอาคาร 101 ห้องใหม่ก็ได้
              </p>

              <div className="grid grid-cols-2 gap-2 py-2">
                <button 
                  type="button"
                  onClick={() => setResetToEmpty(true)}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    resetToEmpty 
                      ? 'border-rose-500 bg-rose-950/20 text-rose-400' 
                      : 'border-slate-850 bg-slate-900/30 text-slate-400'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                  <span>เริ่มจากศูนย์ (ว่างเปล่า)</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setResetToEmpty(false)}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    !resetToEmpty 
                      ? 'border-indigo-500 bg-indigo-950/20 text-indigo-400' 
                      : 'border-slate-850 bg-slate-900/30 text-slate-400'
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  <span>โหลดข้อมูลตัวอย่าง (101 ห้อง)</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center"
                >
                  {modalLoading ? 'กำลังประมวลผล...' : 'ยืนยันรีเซ็ตระบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {modalType === 'login' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1e] border border-slate-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl glass-panel animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">เข้าสู่ระบบผู้ดูแล (Admin Login)</h3>
                <p className="text-[10px] text-slate-400">ระบุชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานเครื่องมือผู้ดูแล</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-slate-300">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs">
                  {modalSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text"
                  required
                  placeholder="ป้อนชื่อผู้ใช้"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">รหัสผ่าน (Password)</label>
                <input 
                  type="password"
                  required
                  placeholder="ป้อนรหัสผ่าน"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
                />
              </div>

              {/* Default Credentials Helper */}
              <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/10 text-[10px] text-indigo-400 leading-relaxed">
                💡 <strong>บัญชีทดสอบเริ่มต้น:</strong><br />
                ชื่อผู้ใช้งาน: <code className="bg-indigo-950/50 px-1 py-0.5 rounded font-mono select-all">admin</code> | รหัสผ่าน: <code className="bg-indigo-950/50 px-1 py-0.5 rounded font-mono select-all">password</code>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center shadow-lg shadow-emerald-600/10"
                >
                  {modalLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
