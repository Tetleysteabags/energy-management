import type { Metadata } from "next";
import { headers } from "next/headers";
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
  title: "Recovery tracker",
  description: "Private Long COVID recovery pattern logging",
};

// Applies the saved theme before paint to avoid a flash of the wrong colours.
// Marketing intro stays light so first impressions stay calm and readable.
const LIGHT_ONLY_PATHS = ["/how-it-works", "/privacy"];

const themeInitScript = `(function(){try{var p=location.pathname||"";var l=${JSON.stringify(
  LIGHT_ONLY_PATHS,
)};for(var i=0;i<l.length;i++){if(p===l[i]||p.indexOf(l[i]+"/")===0){document.documentElement.classList.remove("dark");return;}}var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by middleware; the inline theme script needs it to satisfy the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
