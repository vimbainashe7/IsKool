import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - IsKool",
  description: "Sign in to your IsKool account or activate a new one",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="iskool-auth min-h-screen bg-background">
      {children}
    </div>
  );
}
