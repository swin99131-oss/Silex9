import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppToaster } from "@/components/ui/AppToaster";
import { AppChrome } from "@/components/AppChrome";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: {
    default: "سوق ساليكس | Salix",
    template: "%s | سوق ساليكس",
  },
  description: "تسوّق مباشرةً من الصنّاع، اكتشف قطعاً صُممت لأجلك",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF8F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <AppToaster />
        <OneSignalProvider />
        <CartProvider>
          <AppChrome>{children}</AppChrome>
        </CartProvider>
      </body>
    </html>
  );
}
