import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet Playground | RISE Vibe Kit",
  description: "Test Porto wallet with DeFi interactions",
};

export default function WalletPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {children}
    </div>
  );
}