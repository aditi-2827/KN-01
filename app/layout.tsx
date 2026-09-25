import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Journal — my daily knowledge",
  description:
    "A personal knowledge journal: daily write-ups, contribution heatmap, and spaced revision.",
  manifest: "/manifest.json",
  applicationName: "Journal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Journal",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#5c9ba8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-serif text-ink-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("journal-theme");var n=parseInt(t,10);var id=(n>=1&&n<=5)?n:1;document.documentElement.setAttribute("data-theme",String(id));}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}