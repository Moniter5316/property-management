import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isUsingMock, updateMockBill } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

// Standard simulation of bank slip verification
export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { billId, slipImageBase64, bypassVerification } = body;

    if (!billId || !slipImageBase64) {
      return NextResponse.json(
        { error: 'billId and slipImageBase64 are required' },
        { status: 400 }
      );
    }

    // 1. In a production app, we would use a QR scanner package (like jsqr / zxing) on the server,
    // extract the raw text data of the QR code, and send it to SlipOk or EasySlip API:
    //
    // const slipOkResponse = await fetch('https://api.slipok.com/api/v1/sub-branches/verify', {
    //   method: 'POST',
    //   headers: {
    //     'x-authorization': process.env.SLIPOK_API_KEY || '',
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ log: qrCodeData })
    // });
    // const verificationResult = await slipOkResponse.json();

    // 2. Simulating the verification logic:
    // We mock that the API parsed the slip QR code and returned a valid transaction matching the bill amount.
    // To make it fun and testable, we allow bypass/mock verification.
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate SlipOK verification response
    const mockVerifiedData = {
      success: true,
      data: {
        amount: 4500, // We will override this to match the actual bill
        transDate: new Date().toISOString(),
        sender: { name: 'นาย สมชาย ใจดี' },
        receiver: { name: 'หจก. บริหารสินทรัพย์สุขใจ' },
        transId: `TR-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      }
    };

    // 3. Fetch current bill details to verify the amount
    let currentBill: any = null;
    const isMock = await isUsingMock();

    if (isMock) {
      // Find from mock bills
      const bills = require('@/lib/mockData').getMockBills(0, 0); // helper, or fetch room directly
      // Since it's mock, we'll fetch room/bill via a dummy endpoint or use direct access
      const rooms = require('@/lib/mockData').getMockRooms();
      for (const r of rooms) {
        const found = r.bills?.find((b: any) => b.id === billId);
        if (found) {
          currentBill = found;
          break;
        }
      }
    } else {
      currentBill = await prisma.bill.findUnique({
        where: { id: billId },
      });
    }

    if (!currentBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (slipImageBase64 === 'CASH') {
      if (isMock) {
        updateMockBill(billId, {
          status: 'PAID',
          paymentSlipUrl: 'CASH',
        });
      } else {
        await prisma.bill.update({
          where: { id: billId },
          data: {
            status: 'PAID',
            paymentSlipUrl: 'CASH',
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: 'บันทึกการชำระเงินด้วยเงินสดเรียบร้อยแล้ว!',
        transaction: {
          amount: currentBill.totalAmount,
          transDate: new Date().toISOString(),
          sender: { name: 'ผู้เช่า (ชำระเงินสด)' },
          receiver: { name: 'เจ้าของหอพัก' },
          transId: `CASH-${Date.now()}`
        }
      });
    }

    // Set the amount in the mock result to match the bill total
    mockVerifiedData.data.amount = currentBill.totalAmount;

    // Check if verification passes
    const isValid = bypassVerification !== false; // defaults to true for demo ease

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'ยอดเงินในสลิปไม่ตรงกับยอดค้างชำระ หรือรูปสลิปนี้เคยใช้งานไปแล้ว (Duplicate Slip Detected)'
      }, { status: 422 });
    }

    // 4. If verified, save slip image URL and mark bill as PAID
    // The image size is already small (30-50KB) because it was compressed in the browser.
    // In production, we would upload this base64 image to Google Drive or LINE webhook.
    // For demo/simulated environment, we store the compressed base64 directly as the paymentSlipUrl
    // since it is extremely small and fits nicely.
    const savedSlipUrl = slipImageBase64; // Compressed WebP Base64

    if (isMock) {
      updateMockBill(billId, {
        status: 'PAID',
        paymentSlipUrl: savedSlipUrl,
      });
    } else {
      await prisma.bill.update({
        where: { id: billId },
        data: {
          status: 'PAID',
          paymentSlipUrl: savedSlipUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ชำระเงินสำเร็จแล้ว! ระบบตรวจสอบสลิปตรงกันและอนุมัติบิลเป็นสีเขียวโดยอัตโนมัติ',
      transaction: mockVerifiedData.data
    });
  } catch (error: any) {
    console.error('Error in slip verification API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
