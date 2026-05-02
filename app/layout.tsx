import "./globals.css";
import ClientToaster from "@/app/components/ClientToaster";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* ✅ Client-only toaster */}
        <ClientToaster />
      </body>
    </html>
  );
}