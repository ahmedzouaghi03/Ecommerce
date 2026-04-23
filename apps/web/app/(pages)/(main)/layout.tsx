export const dynamic = "force-dynamic";
import "@/globals.css";
import { Toaster } from "react-hot-toast";
import { getCurrentUser } from "@/actions/authActions";
import { AppHeader } from "@/components/ui/Navbar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            padding: "14px 20px",
            fontSize: "0.9rem",
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
          },
        }}
      />
      <AppHeader user={user} />
      {children}
    </>
  );
}
