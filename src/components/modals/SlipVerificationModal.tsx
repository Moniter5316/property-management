import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

interface SlipVerificationModalProps {
  room: any;
  activeBill: any;
  unmatchedSlips: any[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function SlipVerificationModal({ room, activeBill, unmatchedSlips, onClose, onSuccess }: SlipVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [bypassSlipVerify, setBypassSlipVerify] = useState(false);

  const handleSlipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);

    try {
      const compressedBase64 = await compressImage(file);
      setSlipBase64(compressedBase64);
    } catch (err) {
      console.error('Image compression failed', err);
      setError('การย่อรูปภาพสลิปล้มเหลว');
    }
  };

  const handleVerifySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipBase64) return;

    setLoading(true);
    setError(null);
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

      onSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchUnmatchedSlip = async (slipId: string, matchedAmount: number) => {
    setLoading(true);
    setError(null);
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

      onSuccess(data.message);
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
            <h3 className="text-base font-bold text-white">ตรวจและจับคู่สลิปชำระเงิน</h3>
            <p className="text-[10px] text-slate-400">ห้อง {room.roomNumber} - ยอดเรียกเก็บ: ฿{activeBill?.totalAmount.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {unmatchedSlips.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-amber-400 mb-2">
                สลิปที่รอการจับคู่ (โอนเข้ามาล่าสุด)
              </label>
              <div className="max-h-40 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                {unmatchedSlips.map(slip => (
                  <div key={slip.id} className="p-2.5 bg-[#12162a]/60 border border-slate-700 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-400">฿{slip.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">{slip.senderName}</div>
                      <div className="text-[10px] text-slate-500">{slip.transDate} {slip.transTime}</div>
                    </div>
                    <button 
                      onClick={() => handleMatchUnmatchedSlip(slip.id, slip.amount)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition"
                    >
                      จับคู่บิลนี้
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unmatchedSlips.length > 0 && (
            <div className="flex items-center gap-2 text-slate-600 my-2">
              <div className="flex-1 h-px bg-slate-800"></div>
              <span className="text-[10px]">หรืออัปโหลดเอง</span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>
          )}

          <form onSubmit={handleVerifySlip} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>อัปโหลดรูปภาพสลิปโอนเงิน (Manual Upload)</span>
              </label>
              <input 
                type="file"
                required
                accept="image/*"
                onChange={handleSlipChange}
                className="w-full text-xs text-slate-400 bg-[#12162a]/80 border border-slate-800 rounded-xl py-2 px-3 focus:outline-none transition cursor-pointer"
              />
            </div>

            {slipBase64 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Preview Image</span>
                </div>
                <div className="max-h-24 overflow-hidden rounded border border-slate-800 flex justify-center bg-black/30">
                  <img src={slipBase64} alt="Compressed slip preview" className="object-contain h-24" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 py-1">
              <input 
                type="checkbox"
                id="bypassSlipVerify"
                checked={bypassSlipVerify}
                onChange={(e) => setBypassSlipVerify(e.target.checked)}
                className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-[#12162a]"
              />
              <label htmlFor="bypassSlipVerify" className="text-[10px] text-slate-400 select-none cursor-pointer">
                ใช้ OCR จำลองสำหรับสลิปที่อัปโหลดเอง
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                disabled={loading || !slipBase64}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center"
              >
                {loading ? 'กำลังอัปโหลด...' : 'ส่งสลิปเพื่อตรวจและอนุมัติ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
