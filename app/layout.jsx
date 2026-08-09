import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://xidgate.com"),
  title: "XIDgate — share a pass, not your number",
  description:
    "Give anyone a way to reach you that expires on its own. Set how long it lasts, how many people can use it, and when it's over. Patent No. 550231.",
  openGraph: {
    title: "XIDgate — share a pass, not your number",
    description: "A way to reach you that expires on its own. No signup for the other person.",
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
