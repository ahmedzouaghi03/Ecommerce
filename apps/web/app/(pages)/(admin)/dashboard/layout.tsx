export const dynamic = "force-dynamic";
import "@/globals.css";
import { Toaster } from "react-hot-toast";
import { redirect } from "next/navigation";
import NavMenu from "@/components/admin/NavMenu";
import { getCurrentUser } from "@/actions/authActions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (
    !currentUser ||
    (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")
  ) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden">
      <NavMenu currentUserRole={currentUser.role} />

      <main
        className="flex-1 overflow-y-auto p-8"
        style={{ backgroundColor: "var(--bg)" }}
      >
        {children}
      </main>

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
          success: {
            iconTheme: {
              primary: "var(--color-primary-600)",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
}
