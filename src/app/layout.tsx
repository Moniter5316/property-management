import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Property Management Pro | ระบบบริหารจัดการบ้านเช่าและอาคารอัจฉริยะ",
  description: "ระบบบริหารจัดการตึก บ้านเช่า น้ำ-ไฟ บิลชำระเงิน และการสแกนสลิปอัจฉริยะ สำหรับผู้เช่ากว่า 100 ห้อง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#090b16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
