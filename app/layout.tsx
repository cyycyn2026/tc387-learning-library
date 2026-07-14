import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TC387 个人学习资料库",
  description: "面向 TC387、AUTOSAR、Trap、Memory Map 和 C 语言薄弱点的个人学习资料库。",
  openGraph: {
    title: "TC387 个人学习资料库",
    description: "Trap、Memory Map、NvM/Fee、C 指针和项目经验的个人学习台。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "TC387 个人学习资料库预览图",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TC387 个人学习资料库",
    description: "Trap、Memory Map、NvM/Fee、C 指针和项目经验的个人学习台。",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
