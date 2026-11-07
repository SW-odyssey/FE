import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LOCAL — Find your Seoul",
  description:
    "Explore the everyday side of Seoul. Discover places in Ikseon-dong, Insadong, and Euljiro.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const detectIosHomeScreen = `
  if (navigator.standalone === true) {
    document.documentElement.setAttribute("data-local-ios-home-screen", "");
  }
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: detectIosHomeScreen }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
