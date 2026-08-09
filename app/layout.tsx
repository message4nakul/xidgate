import "./globals.css";

export const metadata = {
  title: "XIDgate — share a pass, not your number",
  description:
    "Give anyone a way to reach you that expires on its own. Patent No. 550231.",
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
