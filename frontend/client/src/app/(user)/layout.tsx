import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget/ChatWidget";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      
      <Header />

      
      <main className="flex-1 pt-16">{children}</main>

      
      <Footer />

      
      <ChatWidget />
    </div>
  );
}
