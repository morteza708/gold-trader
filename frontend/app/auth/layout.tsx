export default function AuthLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 relative overflow-hidden">
        
        {/* پترن پس‌زمینه (همان پترن اصلی سایت) */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-50"></div>
  
        {/* دایره‌های رنگی محو در پس‌زمینه برای زیبایی */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
  
        {/* کانتینر اصلی محتوا (کارت سفید وسط چین) */}
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-10 relative z-10">
          
          {/* لوگوی بالای فرم */}
          <div className="flex justify-center mb-8">
             <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-gold-500/30">
               G
             </div>
          </div>
  
          {children}
          
        </div>
  
        {/* کپی رایت پایین صفحه */}
        <div className="absolute bottom-6 text-center text-xs text-gray-400">
          © ۱۴۰۳ گلد تریدر - تمامی حقوق محفوظ است
        </div>
      </div>
    );
  }
  