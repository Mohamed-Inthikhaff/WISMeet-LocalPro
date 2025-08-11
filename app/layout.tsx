import { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import UserDataSync from "@/components/UserDataSync";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WISMeet",
  description: "Video calling App",
  icons: {
    icon: "/icons/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        appearance={{
          elements: {
            card: "bg-dark-2",
            headerTitle: "text-white",
            headerSubtitle: "text-sky-1",
            socialButtonsBlockButton: "text-white",
            formButtonPrimary: "bg-blue-1",
            footerActionLink: "text-blue-1",
          },
          variables: {
            colorText: "#fff",
            colorPrimary: "#0E78F9",
            colorBackground: "#1C1C1C",
          },
          layout: {
            logoImageUrl: "/icons/logo.svg",
            logoPlacement: "inside",
            socialButtonsVariant: "blockButton",
          },
        }}
        afterSignInUrl="/"
        afterSignOutUrl="/"
      >
        <body className={`${inter.className} bg-dark-2`}>
          <Toaster />
          <UserDataSync />
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
