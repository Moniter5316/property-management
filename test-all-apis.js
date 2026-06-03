const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Simple cookie jar to persist session across requests
let sessionCookie = '';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Send session cookie if we have one
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      // Capture Set-Cookie from login response
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        // Extract only the name=value part (ignore flags like HttpOnly, Path, etc.)
        sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: parsed });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: data });
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Comprehensive API Integration Tests...\n');

  try {
    // 0. Login as admin first to get session cookie
    console.log('Step 0: Authenticating as admin...');
    const loginResult = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'password',
      }
    });
    console.log('✅ Admin login successful:', loginResult.message);
    console.log(`Session cookie: ${sessionCookie}\n`);

    // 1. Reset database to empty first to start clean
    console.log('Step 1: Resetting database to empty...');
    await request(`${BASE_URL}/api/reset`, {
      method: 'POST',
      body: { toEmpty: true }
    });
    console.log('✅ Database reset to empty.\n');

    // 2. Fetch properties (should be empty)
    console.log('Step 2: Fetching properties (should be empty)...');
    const propertiesInit = await request(`${BASE_URL}/api/properties`);
    console.log(`✅ Properties list received. Count: ${propertiesInit.length}`);
    if (propertiesInit.length !== 0) {
      throw new Error(`Expected 0 properties, got ${propertiesInit.length}`);
    }
    console.log('');

    // 3. Create a new Property
    console.log('Step 3: Creating a new test property ("ตึกทดสอบ C")...');
    const newPropertyResult = await request(`${BASE_URL}/api/properties`, {
      method: 'POST',
      body: {
        name: 'ตึกทดสอบ C',
        type: 'BUILDING',
        address: '123/45 ถนนพัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ',
        lightPricePerUnit: 8.5,
        waterPricePerUnit: 18,
        commonFee: 150
      }
    });
    console.log('✅ Property created successfully:', newPropertyResult.property.name);
    const propertyId = newPropertyResult.property.id;
    console.log(`Property ID: ${propertyId}\n`);

    // 4. Create a Room under the new property
    console.log('Step 4: Creating a room "999" under "ตึกทดสอบ C"...');
    const newRoomResult = await request(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      body: {
        roomNumber: '999',
        floor: 9,
        baseRent: 4500,
        propertyId: propertyId
      }
    });
    console.log('✅ Room created successfully:', newRoomResult.room.roomNumber);
    const roomId = newRoomResult.room.id;
    console.log(`Room ID: ${roomId}\n`);

    // 5. Update room baseRent
    console.log('Step 5: Updating room "999" baseRent and details...');
    const updatedRoomResult = await request(`${BASE_URL}/api/rooms`, {
      method: 'PUT',
      body: {
        id: roomId,
        baseRent: 5000,
        roomNumber: '999-A',
        floor: 9
      }
    });
    console.log('✅ Room updated. New rent:', updatedRoomResult.room.baseRent, 'Room number:', updatedRoomResult.room.roomNumber);
    if (updatedRoomResult.room.baseRent !== 5000 || updatedRoomResult.room.roomNumber !== '999-A') {
      throw new Error('Room update verification failed!');
    }
    console.log('');

    // 6. Check-in a tenant
    console.log('Step 6: Checking-in tenant "สมคิด ดีเด่น" to room "999-A"...');
    const checkInResult = await request(`${BASE_URL}/api/check-in`, {
      method: 'POST',
      body: {
        roomId: roomId,
        tenantName: 'สมคิด ดีเด่น',
        tenantPhone: '081-234-5678',
        startDate: '2026-06-01',
        initialLightMeter: 100,
        initialWaterMeter: 200
      }
    });
    console.log('✅ Tenant checked in successfully:', checkInResult.tenant.name);
    console.log('');

    // 7. Verify occupied room status
    console.log('Step 7: Checking room occupied status...');
    const roomsList = await request(`${BASE_URL}/api/rooms?propertyId=${propertyId}`);
    const verifiedRoom = roomsList.find(r => r.id === roomId);
    console.log(`✅ Room status is: ${verifiedRoom.status}, tenant name: ${verifiedRoom.tenants[0].name}`);
    if (verifiedRoom.status !== 'OCCUPIED' || verifiedRoom.tenants[0].name !== 'สมคิด ดีเด่น') {
      throw new Error('Room status check-in verification failed!');
    }
    console.log('');

    // 8. Save bill for Month=6, Year=2026
    console.log('Step 8: Recording utility meters & extra config for the bill (Month=6, Year=2026)...');
    const saveBillResult = await request(`${BASE_URL}/api/bills`, {
      method: 'POST',
      body: {
        roomId: roomId,
        month: 6,
        year: 2026,
        previousLightMeter: 100,
        currentLightMeter: 120, // 20 units * 8.5 = 170 THB
        lightPricePerUnit: 8.5,
        previousWaterMeter: 200,
        currentWaterMeter: 205, // 5 units * 18 = 90 THB
        waterPricePerUnit: 18,
        commonFeeCharged: 150,
        depositCharged: 200,
        discount: 50,
        otherCharged: 100,
        remark: 'ทดสอบระบบบิลสำเร็จรูป',
        status: 'UNPAID'
      }
    });
    console.log('✅ Bill recorded successfully. Grand total:', saveBillResult.bill.totalAmount);
    // Calculations:
    // Rent: 5000 (Checked in on June 1st, so full month for June 2026)
    // Light: (120 - 100) * 8.5 = 170
    // Water: (205 - 200) * 18 = 90
    // Common fee: 150
    // Deposit: 200
    // Discount: 50
    // Other: 100
    // Total = 5000 + 170 + 90 + 150 + 200 + 100 - 50 = 5660
    console.log('Expected Total: 5660 THB, Calculated Total:', saveBillResult.bill.totalAmount);
    if (saveBillResult.bill.totalAmount !== 5660) {
      throw new Error(`Incorrect bill calculation. Expected 5660, got ${saveBillResult.bill.totalAmount}`);
    }
    const billId = saveBillResult.bill.id;
    console.log(`Bill ID: ${billId}\n`);

    // 9. Verify slip upload (marks bill as PAID)
    console.log('Step 9: Testing automated slip verification upload...');
    const verifySlipResult = await request(`${BASE_URL}/api/verify-slip`, {
      method: 'POST',
      body: {
        billId: billId,
        slipImageBase64: 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73vw==', // Dummy mini WebP
        bypassVerification: true
      }
    });
    console.log('✅ Slip verification result:', verifySlipResult.message);
    console.log('Verification transaction sender:', verifySlipResult.transaction.sender.name);
    console.log('');

    // 10. Check-out the tenant
    console.log('Step 10: Checking out tenant from room "999-A" with final meter readings...');
    const checkOutResult = await request(`${BASE_URL}/api/check-out`, {
      method: 'POST',
      body: {
        roomId: roomId,
        endDate: '2026-06-30',
        finalLightMeter: 130, // final light meter
        finalWaterMeter: 208  // final water meter
      }
    });
    console.log('✅ Checked out tenant successfully.');
    console.log('Final check-out room status:', checkOutResult.roomStatus);
    console.log('');

    // 11. Delete the room
    console.log('Step 11: Deleting the room "999-A"...');
    const deleteRoomResult = await request(`${BASE_URL}/api/rooms?id=${roomId}`, {
      method: 'DELETE'
    });
    console.log('✅ Room deleted successfully:', deleteRoomResult.success);
    console.log('');

    // 12. Restore database to the 101-room mock dataset
    console.log('Step 12: Restoring database to standard 101 rooms mock data...');
    const restoreResult = await request(`${BASE_URL}/api/reset`, {
      method: 'POST',
      body: { toEmpty: false }
    });
    console.log('✅ System restored to standard 101 rooms dataset.');
    console.log(`Message: ${restoreResult.message || 'Restored sample data successfully.'}\n`);

    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The Property Management App is rock-solid and verified.');
  } catch (error) {
    console.error('❌ Integration test failed with error:', error);
    process.exit(1);
  }
}

runTests();
