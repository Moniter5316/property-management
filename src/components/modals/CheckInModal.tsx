import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

interface CheckInModalProps {
  room: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function CheckInModal({ room, onClose, onSuccess }: CheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [checkInName, setCheckInName] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInLight, setCheckInLight] = useState('');
  const [checkInWater, setCheckInWater] = useState('');
  const [checkInOccupants, setCheckInOccupants] = useState('1');
  const [depositAmount, setDepositAmount] = useState('');

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          tenantName: checkInName,
          tenantPhone: checkInPhone,
          startDate: checkInDate,
          initialLightMeter: Number(checkInLight),
          initialWaterMeter: Number(checkInWater),
          occupantCount: Number(checkInOccupants),
          depositAmount: depositAmount ? Number(depositAmount) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');

      onSuccess(`เช็คอินห้อง ${room.roomNumber} เรียบร้อยแล้ว!`);
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
            <h3 className="text-base font-bold text-white">เช็คอินเข้าอยู่ (Check-In)</h3>
            <p className="text-[10px] text-slate-400">ห้อง {room.roomNumber} - {room.property?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCheckIn} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อ-นามสกุล ผู้เช่า</label>
            <input 
              type="text"
              required
              placeholder="เช่น สมชาย มีความสุข"
              value={checkInName}
              onChange={(e) => setCheckInName(e.target.value)}
              className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
              <input 
                type="tel"
                required
                placeholder="เช่น 089-xxxxxxx"
                value={checkInPhone}
                onChange={(e) => setCheckInPhone(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">เงินประกันที่เรียกเก็บ (บาท)</label>
              <input 
                type="number"
                min="0"
                placeholder="เช่น 5000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">วันที่ย้ายเข้าทำสัญญา</label>
              <input 
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">จำนวนผู้พักอาศัย (คน)</label>
              <input 
                type="number"
                min="1"
                required
                placeholder="เช่น 1 หรือ 2"
                value={checkInOccupants}
                onChange={(e) => setCheckInOccupants(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-[#12162a]/40 p-3 rounded-xl border border-slate-800/80">
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">บันทึกเลขมิเตอร์เริ่มต้น</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">เลขมิเตอร์ไฟเริ่มต้น</label>
              <input 
                type="number"
                required
                value={checkInLight}
                onChange={(e) => setCheckInLight(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-2 px-2.5 text-xs text-white focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">เลขมิเตอร์น้ำเริ่มต้น</label>
              <input 
                type="number"
                required
                value={checkInWater}
                onChange={(e) => setCheckInWater(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-2 px-2.5 text-xs text-white focus:outline-none transition"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition mt-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการเช็คอิน'}
          </button>
        </form>
      </div>
    </div>
  );
}
