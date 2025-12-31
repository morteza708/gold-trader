import HeroSection from "@/components/home/HeroSection";
import Navbar from "@/components/layout/Navbar";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
    <Navbar />
    <HeroSection />
    
    {/* اینجا بعدا بخش ویژگی‌ها و فوتر را اضافه می‌کنیم */}
    
  </main>
  );
}
