const fs = require('fs');

let c = fs.readFileSync('src/app/page.tsx', 'utf8');
let lines = c.split('\n');

const newImports = `
import CheckInModal from '@/components/modals/CheckInModal';
import CheckOutModal from '@/components/modals/CheckOutModal';
import BillMetersModal from '@/components/modals/BillMetersModal';
import SlipVerificationModal from '@/components/modals/SlipVerificationModal';
import EditRoomModal from '@/components/modals/EditRoomModal';
`;

// Splice imports after line 26
lines.splice(26, 0, newImports);

const newModals = `      {/* EXPORTED MODALS */}
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
      )}`;

// We need to find the start and end of the old modals block
let startIndex = lines.findIndex(l => l.includes('{/* CHECK-IN FORM MODAL */}'));
let endIndex = lines.findIndex(l => l.includes('{/* ADD PROPERTY MODAL */}'));

if (startIndex !== -1 && endIndex !== -1) {
    const deleteCount = endIndex - startIndex;
    lines.splice(startIndex, deleteCount, newModals);
    console.log('Successfully replaced modals! deleted', deleteCount, 'lines.');
} else {
    console.log('Could not find the block boundaries.', startIndex, endIndex);
}

fs.writeFileSync('src/app/page.tsx', lines.join('\n'));
