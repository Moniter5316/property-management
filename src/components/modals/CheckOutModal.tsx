import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

interface CheckOutModalProps {
  room: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function CheckOutModal({ room, onClose, onSuccess }: CheckOutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [checkOutDate, setCheckOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutLight, setCheckOutLight] = useState('');
  const [damageFee, setDamageFee] = useState('');
  const [isForfeitDeposit, setIsForfeitDeposit] = useState(false);

  // หาเลขมิเตอร์ไฟเก่าสุดจากบิลล่าสุด ถ้ามี
  const previousLight = room.bills && room.bills.length > 0 ? (room.bills[0].currentLightMeter || room.bills[0].previousLightMeter) : '-';
  const previousWater = room.bills && room.bills.length > 0 ? (room.bills[0].currentWaterMeter || room.bills[0].previousWaterMeter) : 0;

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          endDate: checkOutDate,
          finalLightMeter: Number(checkOutLight),
          finalWaterMeter: previousWater, // ส่งเลขน้ำเก่าไปเลย เพราะเราคิดราคาเหมา
          damageFee: damageFee ? Number(damageFee) : 0,
          isForfeitDeposit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-out failed');

      onSuccess(`เช็คเอ้าท์สำเร็จ! มียอดรวมบิลสุดท้ายคงค้างชำระ: ฿${data.finalBill.totalAmount.toLocaleString()}`);
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
            <h3 className="text-base font-bold text-white">คืนห้องและย้ายออก (Check-Out)</h3>
            <p className="text-[10px] text-slate-400">ห้อง {room.roomNumber} - ผู้เช่า: {room.tenants?.[0]?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCheckOut} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">วันที่คืนกุญแจย้ายออก</label>
              <input 
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">ค่าทำความสะอาด/เสียหาย (บาท)</label>
              <input 
                type="number"
                min="0"
                placeholder="เช่น 500 หรือ 0"
                value={damageFee}
                onChange={(e) => setDamageFee(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-white transition"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 bg-rose-950/20 border border-rose-500/10 p-3 rounded-xl cursor-pointer hover:bg-rose-900/30 transition">
            <input 
              type="checkbox" 
              checked={isForfeitDeposit}
              onChange={(e) => setIsForfeitDeposit(e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500/50 bg-[#12162a]"
            />
            <span className="text-xs font-semibold text-rose-400">ริบเงินประกัน (กรณีทำผิดสัญญา)</span>
          </label>

          <div className="bg-[#12162a]/40 p-3 rounded-xl border border-slate-800/80">
            <div className="mb-2">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">บันทึกเลขมิเตอร์ปลายทาง</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                เลขมิเตอร์ไฟคืนห้อง <span className="text-indigo-400 font-semibold">(เลขเดิม: {previousLight})</span>
              </label>
              <input 
                type="number"
                required
                placeholder="ป้อนเลขไฟ"
                value={checkOutLight}
                onChange={(e) => setCheckOutLight(e.target.value)}
                className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg py-2 px-2.5 text-xs text-white focus:outline-none transition"
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
              {loading ? 'กำลังบันทึก...' : 'ยืนยันทำสัญญา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
