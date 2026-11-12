import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Nanjil Grove Academy", template: "%s · Nanjil Grove Academy" }, description: "A fictional connected school website and management ERP demonstration by Infinex Loop." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
