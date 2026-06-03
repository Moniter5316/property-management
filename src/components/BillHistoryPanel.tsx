import React, { useEffect, useState } from 'react';
import { History, Clock } from 'lucide-react';

interface BillHistoryPanelProps {
  roomId: string;
}

export default function BillHistoryPanel({ roomId }: BillHistoryPanelProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/bills`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (e) {
        console.error('Failed to fetch history', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [roomId]);

  if (loading) {
    return <div className="text-center py-4 text-xs text-slate-500"><Clock className="h-4 w-4 inline animate-spin mr-2" /> กำลังโหลดประวัติ...</div>;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          ประวัติบิลย้อนหลัง (3 เดือน)
        </h4>
      </div>
      <div className="space-y-2">
        {history.map((bill, idx) => (
          <div key={bill.id || idx} className="bg-[#12162a]/80 p-3 rounded-lg flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-white mb-0.5">รอบบิล {bill.month}/{bill.year}</p>
              <p className="text-[10px] text-slate-400">
                ไฟ: {Math.max(0, bill.currentLightMeter - bill.previousLightMeter)} น. | 
                น้ำ: {Math.max(0, bill.currentWaterMeter - bill.previousWaterMeter)} น.
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white mb-0.5">฿{bill.totalAmount.toLocaleString()}</p>
              <span className={`inline-block px-1.5 py-[1px] text-[9px] rounded font-medium border ${
                bill.status === 'PAID'
                  ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/20'
                  : bill.status === 'REFUNDED'
                    ? 'border-indigo-500/20 text-indigo-400 bg-indigo-950/20'
                    : bill.status === 'CLEARED'
                      ? 'border-slate-500/20 text-slate-400 bg-slate-950/20'
                      : bill.status === 'PENDING' || bill.status === 'REFUND_PENDING'
                        ? 'border-amber-500/20 text-amber-400 bg-amber-950/20'
                        : 'border-rose-500/20 text-rose-400 bg-rose-950/20'
              }`}>
                {bill.status === 'PAID' ? 'ชำระแล้ว' : bill.status === 'REFUNDED' ? 'คืนเงินแล้ว' : bill.status === 'CLEARED' ? 'เคลียร์แล้ว' : bill.status === 'PENDING' ? 'รอตรวจสอบ' : bill.status === 'REFUND_PENDING' ? 'รอโอนคืนเงิน' : bill.status === 'PARTIAL' ? 'ชำระบางส่วน' : 'ค้างชำระ'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
