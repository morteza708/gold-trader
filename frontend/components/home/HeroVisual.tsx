export default function HeroVisual() {
    return (
        <div className="relative w-full max-w-md mx-auto lg:mr-auto mt-8 lg:mt-0">
      
        {/* هاله نورانی پشت */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gold-500/20 rounded-full blur-[80px] -z-10"></div>
  
        {/* کارت اصلی: کیف پول */}
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white border border-gray-700 shadow-2xl rounded-3xl p-8 transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500 overflow-hidden">
          
          {/* پترن پس‌زمینه کارت (تزئینی) */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          
          {/* هدر کارت */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-gray-400 text-sm mb-1">موجودی کیف پول</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-wider">۱۲۵.۵۰۰</span>
                <span className="text-gold-400 font-medium">گرم</span>
              </div>
            </div>
            {/* آیکون امن (قفل) */}
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
              🔒
            </div>
          </div>
  
          {/* بخش میانی: معادل ریالی */}
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">ارزش تقریبی:</span>
              <span className="font-mono text-white">۵۴۵,۰۰۰,۰۰۰ <span className="text-xs text-gray-400">تومان</span></span>
            </div>
          </div>
  
          {/* دکمه‌های اکشن (فیک) */}
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-xl font-bold text-sm transition-colors">
              افزایش موجودی
            </button>
            <button className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-sm transition-colors border border-white/10">
              برداشت طلا
            </button>
          </div>
  
        </div>
  
        {/* المان شناور: تحویل فیزیکی */}
        <div className="absolute -bottom-5 -right-5 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce shadow-gold-500/10" style={{ animationDuration: '4s' }}>
          <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center text-xl">
            🚚
          </div>
          <div>
             <p className="text-xs text-gray-400 font-bold">تحویل فیزیکی</p>
             <p className="text-xs font-medium text-gray-600">درب منزل یا شعبه</p>
          </div>
        </div>
  
      </div>
    );
  }
  