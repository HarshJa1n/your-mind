import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "YourMind",
  description: "A multilingual second brain that thinks in your language.",
  icons: {
    icon: "/logo%20(1).ico",
    apple: "/logo%20(1).png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
