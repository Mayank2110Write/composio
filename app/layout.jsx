import "./globals.css";

export const metadata = {
  title: "OAuth Ready",
  description: "Know how long your OAuth app will take to set up and get approved, before you start.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
