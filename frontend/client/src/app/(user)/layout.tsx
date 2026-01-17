import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content - pt-16 để bù cho Header fixed */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
