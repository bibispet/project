import type { Metadata } from "next";
import "./globals.css";
import { APP_DISPLAY_NAME } from "@/constants/branding";
import { DevtoolsLoader } from "@/devtools/DevtoolsLoader";

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <DevtoolsLoader />
      </body>
    </html>
  );
}

