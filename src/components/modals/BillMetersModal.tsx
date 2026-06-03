import React, { useState, useEffect } from 'react';
import { XCircle, Zap, Droplet } from 'lucide-react';

interface BillMetersModalProps {
  room: any;
  activeBill: any;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function BillMetersModal({ room, activeBill, selectedMonth, selectedYear, onClose, onSuccess }: BillMetersModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [meterLight, setMeterLight] = useState('');
  const [meterWater, setMeterWater] = useState('');
  const [meterCommon, setMeterCommon] = useState('100');
  const [meterDeposit, setMeterDeposit] = useState('');
  const [meterDiscount, setMeterDiscount] = useState('');
  const [meterOther, setMeterOther] = useState('');
  const [meterRemark, setMeterRemark] = useState('');

  useEffect(() => {
    if (room?.property?.commonFee) {
      setMeterCommon(room.property.commonFee.toString());
    }
  }, [room]);

  const handleSaveMeters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) {
      setError('ไม่พบข้อมูลบิลสำหรับเดือนนี้ เพื่อตั้งค่าเลขมิเตอร์เริ่มต้น กรุณาทำการเช็คอินผู้เช่าก่อน');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          month: selectedMonth,
          year: selectedYear,
          previousLightMeter: activeBill.previousLightMeter,
          currentLightMeter: Number(meterLight),
          lightPricePerUnit: room.property?.lightPricePerUnit || 9,
          previousWaterMeter: activeBill.previousWaterMeter,
          currentWaterMeter: Number(meterWater),
          waterPricePerUnit: room.property?.waterPricePerUnit || 100,
          commonFeeCharged: Number(meterCommon),
          depositCharged: Number(meterDeposit),
          discount: Number(meterDiscount),
          otherCharged: Number(meterOther),
          remark: meterRemark || null,
          status: 'UNPAID',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save utility meters');

      onSuccess('บันทึกมิเตอร์และคำนวณบิลสำเร็จ!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const prevLight = activeBill ? activeBill.previousLightMeter : 0;
  const prevWater = activeBill ? activeBill.previousWaterMeter : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0e1e] border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl glass-panel">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white">บันทึกเลขมิเตอร์และตั้งค่าบิลประจำเดือน</h3>
            <p className="text-[10px] text-slate-400">ห้อง {room.roomNumber} - รอบบิล {selectedMonth}/{selectedYear}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSaveMeters} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-yellow-400 mb-1.5 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> เลขไฟใหม่ (เดิม: {prevLight})
                </label>
                <input 
                  type="number"
                  required
                  placeholder="ป้อนเลขไฟล่าสุด"
                  value={meterLight}
                  onChange={(e) => setMeterLight(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5" /> เลขน้ำใหม่ (เดิม: {prevWater})
                </label>
                <input 
                  type="number"
                  required
                  placeholder="ป้อนเลขน้ำล่าสุด"
                  value={meterWater}
                  onChange={(e) => setMeterWater(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  ค่าส่วนกลาง (บาท)
                </label>
                <input 
                  type="number"
                  required
                  placeholder="ค่าส่วนกลาง"
                  value={meterCommon}
                  onChange={(e) => setMeterCommon(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  เงินประกัน (บาท)
                </label>
                <input 
                  type="number"
                  placeholder="เงินประกัน"
                  value={meterDeposit}
                  onChange={(e) => setMeterDeposit(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-400 mb-1.5">
                  ส่วนลด (บาท)
                </label>
                <input 
                  type="number"
                  placeholder="ส่วนลด"
                  value={meterDiscount}
                  onChange={(e) => setMeterDiscount(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-400 mb-1.5">
                  ค่าอื่นๆ (บาท)
                </label>
                <input 
                  type="number"
                  placeholder="ค่าอื่นๆ"
                  value={meterOther}
                  onChange={(e) => setMeterOther(e.target.value)}
                  className="w-full bg-[#12162a]/80 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">หมายเหตุ (ถ้ามี)</label>
              <input 
                type="text"
                placeholder="เช่น ค่าปรับล่าช้า, ค่าล้างแอร์"
                value={meterRemark}
                onChange={(e) => setMeterRemark(e.target.value)}
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
              ยกเลิก
            </button>
            <button 
              type="submit"
              disabled={loading || !activeBill}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกและคำนวณบิล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
