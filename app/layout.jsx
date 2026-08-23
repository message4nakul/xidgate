import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://xidgate.com"),
  title: "XIDgate — every conversation deserves its own identity",
  description:
    "Your number is one permanent channel for everyone. XID gives each connection its own, with its own rules and its own ending. They need no app or account. Patent No. 550231.",
  openGraph: {
    title: "XIDgate — every conversation deserves its own identity",
    description: "Give each connection its own identity, with its own terms. The other person needs no app and no account.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#14181F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
