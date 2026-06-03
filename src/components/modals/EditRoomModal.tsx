import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

interface EditRoomModalProps {
  room: any;
  activeBill: any;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function EditRoomModal({ room, activeBill, selectedMonth, selectedYear, onClose, onSuccess }: EditRoomModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editRoomRent, setEditRoomRent] = useState('');
  const [editRoomOccupants, setEditRoomOccupants] = useState('');
  const [editPropLight, setEditPropLight] = useState('');
  const [editPropWater, setEditPropWater] = useState('');
  const [editPropCommon, setEditPropCommon] = useState('');
  const [editPropName, setEditPropName] = useState('');
  const [editPropAddress, setEditPropAddress] = useState('');

  // Initialize values when component mounts
  useEffect(() => {
    if (room) {
      setEditRoomRent(room.baseRent?.toString() || '');
      setEditRoomOccupants(room.occupantCount?.toString() || '1');
      if (room.property) {
        setEditPropLight(room.property.lightPricePerUnit?.toString() || '');
        setEditPropWater(room.property.waterPricePerUnit?.toString() || '');
        setEditPropCommon(room.property.commonFee?.toString() || '');
        setEditPropName(room.property.name || '');
        setEditPropAddress(room.property.address || '');
      }
    }
  }, [room]);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Update property rates
      const propRes = await fetch('/api/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.propertyId,
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
          id: room.id,
          baseRent: Number(editRoomRent),
          occupantCount: Number(editRoomOccupants),
        }),
      });

      const roomData = await roomRes.json();
      if (!roomRes.ok) throw new Error(roomData.error || 'Failed to update room rent');

      // 3. Update existing bill for the active month if it exists
      if (activeBill) {
        const billRes = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
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

      onSuccess('อัปเดตเรทราคาและค่าเช่าสำเร็จ!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0e1e] border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white">แก้ไขข้อมูลห้องและเรทราคามาตรฐาน</h3>
            <p className="text-[10px] text-slate-400">ห้อง {room.roomNumber} - {room.property?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSaveRates} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-indigo-400 mb-1.5">ค่าเช่าห้องหลักรายเดือน</label>
              <input 
                type="number"
                required
                placeholder="ป้อนค่าห้องใหม่"
                value={editRoomRent}
                onChange={(e) => setEditRoomRent(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-400 mb-1.5">จำนวนผู้พักอาศัย (คน)</label>
              <input 
                type="number"
                min="1"
                required
                placeholder="ป้อนจำนวนคน"
                value={editRoomOccupants}
                onChange={(e) => setEditRoomOccupants(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2.5 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
          </div>

          <div className="bg-[#12162a]/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">เรทราคาส่วนกลาง/น้ำ/ไฟ มาตรฐานประจำตึก</p>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ค่าไฟ (บ./หน่วย)</label>
                <input 
                  type="number"
                  required
                  value={editPropLight}
                  onChange={(e) => setEditPropLight(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ค่าน้ำ (บ./หน่วย)</label>
                <input 
                  type="number"
                  required
                  value={editPropWater}
                  onChange={(e) => setEditPropWater(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">ส่วนกลาง (บ./ด.)</label>
                <input 
                  type="number"
                  required
                  value={editPropCommon}
                  onChange={(e) => setEditPropCommon(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อตึก/อาคาร</label>
              <input 
                type="text"
                placeholder="เว้นว่างไว้หากต้องการใช้ชื่อเดิม"
                value={editPropName}
                onChange={(e) => setEditPropName(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">ที่อยู่สำหรับออกบิล</label>
              <textarea 
                rows={2}
                value={editPropAddress}
                onChange={(e) => setEditPropAddress(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
            >
              ย้อนกลับ
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
