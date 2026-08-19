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
  title: {
    default: "TN MIDI AI Studio - AI-Powered Web MIDI Composer & Player",
    template: "%s | TN MIDI AI Studio",
  },
  description: "Trải nghiệm tạo, chỉnh sửa và trực quan hóa nhạc MIDI bằng trí tuệ nhân tạo đỉnh cao trên nền tảng Web.",
  keywords: ["MIDI Studio", "AI Music", "MIDI Visualizer", "Web MIDI", "Tone.js", "Soundfont Synthesis", "Music Producer"],
  authors: [{ name: "TNClub Team" }],
  creator: "TNClub",
  publisher: "TNClub",
  metadataBase: new URL("https://bitmidi.tnclub.vn"),
  openGraph: {
    title: "TN MIDI AI Studio - Next-Gen Web MIDI Platform",
    description: "Trải nghiệm tạo, chỉnh sửa và trực quan hóa nhạc MIDI bằng trí tuệ nhân tạo đỉnh cao trên nền tảng Web.",
    url: "https://bitmidi.tnclub.vn",
    siteName: "TN MIDI AI Studio",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "TN MIDI AI Studio Banner",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TN MIDI AI Studio - Next-Gen Web MIDI Platform",
    description: "Trải nghiệm tạo, chỉnh sửa và trực quan hóa nhạc MIDI bằng trí tuệ nhân tạo đỉnh cao trên nền tảng Web.",
    images: ["/og-banner.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
