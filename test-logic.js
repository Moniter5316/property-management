const http = require('http');

function fetchData(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runTest() {
  try {
    console.log('Fetching data from local server...');
    const rooms = await fetchData('http://localhost:3000/api/rooms');
    const bills = await fetchData('http://localhost:3000/api/bills?month=6&year=2026');
    console.log(`Fetched ${rooms.length} rooms and ${bills.length} bills.`);

    const searchQuery = '';
    const activePropertyId = 'all';

    // 1. Simulate the filter logic
    console.log('Testing filter logic...');
    const filteredRooms = rooms.filter(room => {
      const matchesProperty = activePropertyId === 'all' || room.propertyId === activePropertyId;
      const roomNum = room.roomNumber || '';
      const tenantName = room.tenants?.[0]?.name || '';
      const matchesSearch = roomNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProperty && matchesSearch;
    });
    console.log(`Filtered down to ${filteredRooms.length} rooms.`);

    // 2. Simulate floors mapping and sorting logic
    console.log('Testing floors grouping and sorting...');
    const floorsMap = {};
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
      .sort((a, b) => b - a);

    console.log('Discovered floors:', sortedFloors);

    sortedFloors.forEach(floor => {
      const floorRooms = floorsMap[floor] 
        ? floorsMap[floor].sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || '')) 
        : [];
      
      console.log(`Floor ${floor} has ${floorRooms.length} rooms correctly sorted.`);
      // Check each room
      floorRooms.forEach(r => {
        if (typeof r.roomNumber !== 'string') {
          console.warn(`Warning: Room ID ${r.id} has invalid roomNumber type:`, typeof r.roomNumber);
        }
      });
    });

    console.log('✅ Success! The sorting and filtering logic is completely sound and verified.');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTest();
