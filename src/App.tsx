import { useState, useEffect } from "react";
import { 
  Shield, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  MessageSquare, 
  User, 
  Link as LinkIcon, 
  AlertTriangle,
  Bot,
  Terminal,
  Activity,
  Menu,
  X,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  Smile
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState("all");
  const [logsChannelInput, setLogsChannelInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings && settings.logsChannelId !== undefined) {
      setLogsChannelInput(settings.logsChannelId);
    }
  }, [settings]);

  const handleTestLogs = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-log", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
        fetchStatus();
      } else {
        setTestResult({ success: false, message: data.error || "فشل إرسال رسالة الفحص." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: "فشل الاتصال بخادم البوت الحارس." });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setSettings(data.settings);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch status:", err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setTimeout(() => setRefreshing(false), 800);
  };

  const updateSettings = async (newSettings: any) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      setSettings(data.settings);
      setStatus((prev: any) => prev ? { ...prev, settings: data.settings } : prev);
    } catch (err) {
      console.error("Failed to update settings");
    }
  };

  const toggleSetting = (key: string) => {
    const newVal = !settings[key];
    updateSettings({ [key]: newVal });
  };

  const handleAddWord = () => {
    const word = newWord.trim();
    if (!word) return;
    if (settings.badWords?.includes(word)) {
      setNewWord("");
      return;
    }
    const updatedWords = [...(settings.badWords || []), word];
    updateSettings({ badWords: updatedWords });
    setNewWord("");
  };

  const handleRemoveWord = (wordToRemove: string) => {
    const updatedWords = (settings.badWords || []).filter((w: string) => w !== wordToRemove);
    updateSettings({ badWords: updatedWords });
  };

  // Filter logs by type/level
  const filteredLogs = status?.logs?.filter((log: any) => {
    if (logFilter === "all") return true;
    if (logFilter === "critical") return log.level === "critical";
    if (logFilter === "warning") return log.level === "warning";
    if (logFilter === "system") return log.type === "system";
    return true;
  }) || [];

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white font-sans overflow-hidden dir-rtl" dir="rtl">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-[#151619] rounded-xl border border-white/10 text-gray-300 hover:text-white"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed inset-y-0 right-0 z-40 w-64 lg:static bg-[#151619] border-l border-white/5 flex flex-col"
          >
            <div className="p-6 flex items-center gap-3 border-b border-white/5">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Shield className="text-emerald-500" size={24} />
              </div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-l from-white to-emerald-400 bg-clip-text text-transparent">حارس البوت</h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <NavItem 
                active={activeTab === "overview"} 
                onClick={() => setActiveTab("overview")}
                icon={<LayoutDashboard size={20} />}
                label="نظرة عامة"
              />
              <NavItem 
                active={activeTab === "protection"} 
                onClick={() => setActiveTab("protection")}
                icon={<Shield size={20} />}
                label="إعدادات الحماية"
              />
              <NavItem 
                active={activeTab === "badwords"} 
                onClick={() => setActiveTab("badwords")}
                icon={<X size={20} />}
                label="تصفية الكلمات المحظورة"
              />
              <NavItem 
                active={activeTab === "logs"} 
                onClick={() => setActiveTab("logs")}
                icon={<Terminal size={20} />}
                label="سجلات الحماية المباشرة"
                badge={status?.logs?.length > 1 ? status.logs.length - 1 : undefined}
              />
            </nav>

            <div className="p-4 border-t border-white/5 space-y-3">
              <div className="bg-black/20 rounded-2xl p-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status?.status === "online" ? "bg-emerald-400" : "bg-red-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${status?.status === "online" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                </span>
                <span className="text-sm font-semibold text-gray-300">
                  {status?.status === "online" ? "متصل بالديسكورد" : "غير متصل بالديسكورد"}
                </span>
              </div>
              
              {status?.bot && (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
                  <img src={status.bot.avatar} alt="Bot Avatar" className="w-10 h-10 rounded-xl" referrerPolicy="no-referrer" />
                  <div className="text-xs leading-tight">
                    <p className="font-bold text-gray-200">{status.bot.tag}</p>
                    <p className="text-gray-500 mt-0.5">المعرف: {status.bot.id.substring(0, 12)}...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-2">
                {activeTab === "overview" && "لوحة التحكم الرئيسية"}
                {activeTab === "protection" && "جدار حماية السيرفر"}
                {activeTab === "badwords" && "إدارة الكلمات والقاموس المحظور"}
                {activeTab === "logs" && "سجلات الأحداث المباشرة"}
              </h2>
              <p className="text-gray-500">مرحباً بك في نظام حارس الأمان الذكي والمطور لحماية مجتمعات ديسكورد.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                <span className="text-sm font-medium">تحديث فوري</span>
              </button>
              
              <div className="flex items-center gap-3 bg-[#151619] p-3 rounded-2xl border border-white/5">
                <Activity className="text-emerald-500" size={18} />
                <div className="text-sm leading-none">
                  <p className="text-gray-500 mb-1">زمن استجابة الشبكة</p>
                  <p className="font-mono font-bold text-emerald-400">9ms</p>
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div 
                key="overview"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <StatCard 
                  icon={<Bot className="text-blue-500" />} 
                  title="اسم البوت الحارس" 
                  value={status?.bot?.tag || "---"} 
                />
                <StatCard 
                  icon={<Shield className="text-emerald-500" />} 
                  title="أنظمة الحماية النشطة" 
                  value={Object.values(settings).filter(v => v === true).length + " مفعّلة"} 
                />
                <StatCard 
                  icon={<AlertTriangle className="text-orange-500" />} 
                  title="تهديدات مرصودة اليوم" 
                  value={status?.logs?.filter((l: any) => l.type !== "system").length || "0"} 
                />

                <div className="md:col-span-2 bg-[#151619] rounded-3xl p-6 border border-white/5">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-200">
                    <Activity size={18} className="text-emerald-500" />
                    تحليل صحة وحالة النظام
                  </h3>
                  
                  {!status?.config?.hasToken && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl text-center mb-6">
                      <p className="text-orange-500 font-bold mb-1">تنبيه: لم يتم إدخال كود تشغيل ديسكورد (Discord Token)!</p>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4">يرجى إضافة مفتاح DISCORD_TOKEN في لوحة الإعدادات الجانبية لتوصيل البوت بسيرفراتك.</p>
                      <a href="https://discord.com/developers/applications" target="_blank" className="inline-block bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">بوابة مطوري الديسكورد</a>
                    </div>
                  )}

                  {status?.config?.hasToken && !status?.config?.hasClientId && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl text-center mb-6">
                      <p className="text-blue-400 font-bold mb-1">لم يتم توفير معرف التطبيق (Application Client ID)!</p>
                      <p className="text-sm text-gray-400 leading-relaxed">يرجى إضافة DISCORD_CLIENT_ID لتفعيل أوامر السلاش (/) في شات الديسكورد للتناغم مع لوحة التحكم.</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <StatusItem label="معالج كاشف السلوك" value="طبيعي وآمن" />
                    <StatusItem label="حارس طرد البوتات العشوائية" value={settings.antiBotJoin ? "نشيط وقافل" : "غير مفعل"} color={settings.antiBotJoin ? "emerald" : "gray"} />
                    <StatusItem label="وضع إغلاق السيرفر الاحترازي" value={settings.serverLockdown ? "🔒 مُغلق تماماً" : "مفتوح وآمن"} color={settings.serverLockdown ? "red" : "emerald"} />
                  </div>
                </div>

                <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Shield className="text-emerald-500" size={32} />
                  </div>
                  <h3 className="font-bold text-gray-200 mb-2 text-lg">تحصين شامل</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">تمتع بحماية تمنع الاختراقات وتمنع الإغراق والسبام والدعوات العشوائية داخل قنوات الريدز.</p>
                </div>
              </motion.div>
            )}

            {activeTab === "protection" && (
              <motion.div 
                key="protection"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="space-y-6"
              >
                {/* Advanced group cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category 1: Basic Mod */}
                  <div className="bg-[#151619] rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-l from-white/[0.01]">
                      <h3 className="text-lg font-bold text-gray-200">🛡️ حماية المحادثات والدردشة</h3>
                      <p className="text-xs text-gray-500">منع الفوضى والإعلانات بشكل فوري ومستمر.</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      <ToggleItem 
                        icon={<MessageSquare className="text-blue-500" />}
                        title="مانع السبام وعروض الترويج"
                        desc="حذف تلقائي للرسائل ذات كتل النصوص الضخمة والرسائل السريعة."
                        active={settings.antiSpam}
                        onToggle={() => toggleSetting("antiSpam")}
                      />
                      <ToggleItem 
                        icon={<LinkIcon className="text-purple-500" />}
                        title="مانع روابط الويب العامة"
                        desc="منع الأعضاء العاديين من نشر مواقع ويب وصفحات عشوائية."
                        active={settings.antiLink}
                        onToggle={() => toggleSetting("antiLink")}
                      />
                      <ToggleItem 
                        icon={<Bot className="text-orange-400" />}
                        title="حظر سيرفرات الديسكورد"
                        desc="كشف فوري ودقيق لروابط دعوات الديسكورد الأخرى لحماية مجتمعك."
                        active={settings.antiInvite}
                        onToggle={() => toggleSetting("antiInvite")}
                      />
                    </div>
                  </div>

                  {/* Category 2: Advanced Protections */}
                  <div className="bg-[#151619] rounded-3xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-l from-white/[0.01]">
                      <h3 className="text-lg font-bold text-gray-200">⚡ الحمايات المعززة ومكافحة الإزعاج</h3>
                      <p className="text-xs text-gray-500">حيل وتكتيكات متقدمة للتحصين ومكافحة التهديدات غير التقليدية.</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      <ToggleItem 
                        icon={<User className="text-emerald-500" />}
                        title="مانع الإشارة الجماعية (Mass Mention)"
                        desc="تحديد حد الإشارة للأعضاء ({settings.maxMentions}) لمنع منشن الجميع المزعج."
                        active={settings.antiMassMention}
                        onToggle={() => toggleSetting("antiMassMention")}
                      />
                      <ToggleItem 
                        icon={<AlertTriangle className="text-yellow-500" />}
                        title="كاشف المنشن المخفي (Ghost Ping)"
                        desc="إصدار تنبيه فوري إذا قام عضو بمنشن الآخرين وحذف الرسالة مباشرة."
                        active={settings.antiGhostPing}
                        onToggle={() => toggleSetting("antiGhostPing")}
                      />
                      <ToggleItem 
                        icon={<RefreshCw className="text-cyan-500" />}
                        title="مانع تكرار الرسائل المماثلة"
                        desc="حظر تكرار محتوى رسائل متتالية من نفس العضو خلال 4 ثوانٍ."
                        active={settings.antiDuplicate}
                        onToggle={() => toggleSetting("antiDuplicate")}
                      />
                    </div>
                  </div>
                </div>

                {/* Third group card for bots & server security */}
                <div className="bg-[#151619] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-gradient-to-l from-white/[0.01]">
                    <h3 className="text-lg font-bold text-gray-200">🚀 حماية مستوى السيرفر العام والبوابات</h3>
                    <p className="text-xs text-gray-500">خيارات متطورة تحد من هجمات الريدز أو محاولات تخريب السيرفر.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/5">
                    <div className="p-2">
                      <ToggleItem 
                        icon={<Lock className="text-red-500" />}
                        title="وضع الإغلاق الشامل والاحترازي"
                        desc="حظر وحذف كل رسالة جديدة فوراً من كافة الأعضاء (طوارئ ومداهمات)."
                        active={settings.serverLockdown}
                        onToggle={() => toggleSetting("serverLockdown")}
                      />
                    </div>
                    <div className="p-2">
                      <ToggleItem 
                        icon={<Bot className="text-red-400" />}
                        title="طرد البوتات العشوائية فورا"
                        desc="طرد مباشر ونهائي لأي بوت غريب يدخل إلى السيرفر إلا البوتات المعتمدة."
                        active={settings.antiBotJoin}
                        onToggle={() => toggleSetting("antiBotJoin")}
                      />
                    </div>
                    <div className="p-2">
                      <ToggleItem 
                        icon={<LinkIcon className="text-rose-400" />}
                        title="تصفية راديكالية لاختصار الروابط"
                        desc="مجموعات حصر لمواقع الاختصار الشهيرة (bit.ly etc) لمنع التلغيم والسكام."
                        active={settings.antiLinkShortener}
                        onToggle={() => toggleSetting("antiLinkShortener")}
                      />
                    </div>
                    <div className="p-2">
                      <ToggleItem 
                        icon={<SettingsIcon className="text-indigo-400" />}
                        title="منع النصوص المشوهة والغريبة"
                        desc="حذف كامل للرموز المشحونة ونصوص الزالغو التي قد تهنج الديسكورد."
                        active={settings.antiZalgo}
                        onToggle={() => toggleSetting("antiZalgo")}
                      />
                    </div>
                  </div>
                </div>

                {/* Premium Additional Protections */}
                <div className="bg-[#151619] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-gradient-to-l from-white/[0.01]">
                    <h3 className="text-lg font-bold text-gray-200">💎 درع الحماية الفائقة وخيارات التحكم بمقاييس الأمان</h3>
                    <p className="text-xs text-slate-400">منع هجمات الهوية والمكائد والبروتوكولات السريعة المتقدمة.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-white/5">
                    
                    {/* Alt Account Protection */}
                    <div className="p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-2xl shrink-0"><User className="text-orange-400" /></div>
                          <div>
                            <h4 className="font-bold text-gray-200 text-sm sm:text-base">حظر الحسابات الوهمية والجديدة</h4>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">منع وطرد الحسابات الجديدة التي أنشئت مؤخراً للحد من هجمات التخريب التلقائي.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleSetting("antiAltAccount")}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shrink-0 ${
                            settings.antiAltAccount ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-white/10"
                          }`}
                        >
                          <motion.div 
                            animate={{ x: settings.antiAltAccount ? -28 : 0 }}
                            className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow-lg"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                      {settings.antiAltAccount && (
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                          <span className="text-xs text-gray-400">الحد الأدنى لعمر الحساب (أيام):</span>
                          <input 
                            type="number" 
                            value={settings.altMinAgeDays || 7} 
                            onChange={(e) => updateSettings({ altMinAgeDays: parseInt(e.target.value) || 1 })}
                            className="w-20 bg-black/60 border border-white/10 rounded-xl px-2 py-1 text-center font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                            min="1"
                            max="365"
                          />
                        </div>
                      )}
                    </div>

                    {/* Emoji Spam */}
                    <div className="p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-2xl shrink-0"><Smile className="text-yellow-400" /></div>
                          <div>
                            <h4 className="font-bold text-gray-200 text-sm sm:text-base">منع سبام الوجوه التعبيرية (Emoji Spam)</h4>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">حذف الرسائل المحشوة بشكل كثيف بالوجوه والرموز التعبيرية فوق الحد المسموح.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleSetting("antiSpamEmojis")}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shrink-0 ${
                            settings.antiSpamEmojis ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-white/10"
                          }`}
                        >
                          <motion.div 
                            animate={{ x: settings.antiSpamEmojis ? -28 : 0 }}
                            className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow-lg"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                      {settings.antiSpamEmojis && (
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                          <span className="text-xs text-gray-400">الحد الأقصى للإيموجي المسموح به:</span>
                          <input 
                            type="number" 
                            value={settings.maxEmojis || 10} 
                            onChange={(e) => updateSettings({ maxEmojis: parseInt(e.target.value) || 5 })}
                            className="w-20 bg-black/60 border border-white/10 rounded-xl px-2 py-1 text-center font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                            min="1"
                            max="100"
                          />
                        </div>
                      )}
                    </div>

                    {/* Webhook protection */}
                    <div className="p-5">
                      <ToggleItem 
                        icon={<Terminal className="text-teal-400" />}
                        title="مانع الرسائل التلقائية للويب هوك"
                        desc="تنظيف وفحص الروابط والصور المرسلة من منافذ Webhooks الخارجية لصد السَبام والروابط العشوائية."
                        active={settings.antiWebhookSpam}
                        onToggle={() => toggleSetting("antiWebhookSpam")}
                      />
                    </div>

                    {/* Verification policies */}
                    <div className="p-5">
                      <ToggleItem 
                        icon={<CheckCircle2 className="text-pink-400" />}
                        title="تفعيل نظام التحقق الذكي للوفود"
                        desc="إرسال إشعارات تحقق أمني تلقائية وتوجيهية في الخاص للوافدين الجدد في السيرفر لتصنيفهم."
                        active={settings.verificationSystem}
                        onToggle={() => toggleSetting("verificationSystem")}
                      />
                    </div>

                    {/* Anti caps lock */}
                    <div className="p-5">
                      <ToggleItem 
                        icon={<FileText className="text-indigo-400" />}
                        title="منع الأحرف الإنجليزية الكبيرة الغاضبة"
                        desc="حذف الرسائل المكتوبة بحروف كابيتال ضخمة بنسبة (70%+) لتجنب الإزعاج والضجيج."
                        active={settings.antiCaps}
                        onToggle={() => toggleSetting("antiCaps")}
                      />
                    </div>

                    {/* Anti self bot */}
                    <div className="p-5">
                      <ToggleItem 
                        icon={<Bot className="text-indigo-300" />}
                        title="كاشف وحاجب حسابات السيلف بوت"
                        desc="رصد وحظر استخدام حسابات مستخدمين تقوم بنسخ محتوى معزز أو إطارات مبرمجة يدوياً."
                        active={settings.antiSelfBot}
                        onToggle={() => toggleSetting("antiSelfBot")}
                      />
                    </div>

                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex items-start gap-4">
                  <CheckCircle2 className="text-emerald-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-emerald-400 mb-1">توليد أوامر ديسكورد</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      عند كتابة <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">/scyrty</code> أو <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono">/security</code> داخل الشات في السيرفر، ستظهر لوحة تفاعلية مرئية كاملة لأعضاء طاقم الإشراف بنفس خيارات الرد والتحكم!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "badwords" && (
              <motion.div 
                key="badwords"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-[#151619] rounded-3xl p-6 border border-white/5">
                  <h3 className="text-xl font-bold mb-2">تصفية وحجب الألفاظ النابية</h3>
                  <p className="text-gray-500 text-sm mb-6">أنشئ قاموس حصر مخصص للكلمات والسباب المحظور تداولها في السيرفر ليتصدى لها البوت فوراً بالحذف الكلي والإنذار.</p>

                  <div className="flex gap-3 mb-6">
                    <input 
                      type="text" 
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                      placeholder="اكتب الكلمة المحظورة هنا... (مثال: سب، شتيمة)" 
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button 
                      onClick={handleAddWord}
                      className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-bold px-6 py-3.5 rounded-2xl transition-all flex items-center gap-2"
                    >
                      <Plus size={20} />
                      <span>إضافة كلمة</span>
                    </button>
                  </div>

                  <h4 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-400" />
                    قائمة الكلمات المحظورة الحالية ({settings.badWords?.length || 0})
                  </h4>

                  {(!settings.badWords || settings.badWords.length === 0) ? (
                    <div className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/5">
                      <p className="text-gray-500">لا يوجد أي كلمات محظورة حالياً. السيرفر سيسمح بجميع الألفاظ.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 max-h-[300px] overflow-y-auto p-2 bg-black/10 rounded-2xl border border-white/5">
                      {settings.badWords.map((word: string, index: number) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl border border-red-500/20 text-sm transition-all"
                        >
                          <span className="font-medium">{word}</span>
                          <button 
                            onClick={() => handleRemoveWord(word)}
                            className="text-red-400 hover:text-red-200 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "logs" && (
              <motion.div 
                key="logs"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="space-y-6"
              >
                {/* ربط السجلات مع ديسكورد */}
                <div className="bg-[#151619] rounded-3xl p-6 border border-white/5 bg-gradient-to-l from-white/[0.01] space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 shrink-0">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-200">📡 تحويل وتوجيه السجلات الأمنية لقنوات ديسكورد (Detailed Discord Logs)</h3>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        تلقي إشعارات تفصيلية وفورية بصورة embeds فخمة مباشرةً داخل سيرفر الديسكورد للتصدي للأعضاء المشتبه بهم وإدارة الريدز بكفاءة.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                    <div className="lg:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-400">معرف قناة السجل (Channel ID):</label>
                        {settings.logsChannelId && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono">متصل ومفعل</span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={logsChannelInput} 
                          onChange={(e) => setLogsChannelInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="مثال: 121544321098765432"
                          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-emerald-400 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button 
                          onClick={() => updateSettings({ logsChannelId: logsChannelInput })}
                          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl transition-all text-sm shrink-0"
                        >
                          حفظ القناة
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">ملاحظة: تأكد من تفعيل وضع المطور في ديسكورد لنسخ معرف القناة بسهولة، وتأكد من أن البوت يمتلك صلاحية الكلمات المفتوحة لرؤية وإرسال الرسائل بتلك القناة.</p>
                    </div>

                    <div className="bg-black/35 p-4 rounded-2xl border border-white/5 flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-gray-300 block mb-1">فحص الاتصال الفوري:</span>
                        <span className="text-[11px] text-gray-400 leading-normal block">أرسل رسالة وميض تفاعلية لاختبار تكامل القناة ومظهر السجلات.</span>
                      </div>
                      <button 
                        onClick={handleTestLogs}
                        disabled={testLoading || !settings.logsChannelId}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                          !settings.logsChannelId 
                            ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                            : "bg-white/10 hover:bg-white/15 text-white"
                        }`}
                      >
                        {testLoading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>جاري الفحص المباشر...</span>
                          </>
                        ) : (
                          <span>جرب إرسال سجل وهمي 🧪</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border flex items-start gap-3 mt-4 text-xs leading-normal ${
                        testResult.success 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <p>{testResult.message}</p>
                    </motion.div>
                  )}
                </div>

                <div className="bg-[#151619] rounded-3xl p-6 border border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold">سجل رصد الأحداث والتهديدات</h3>
                      <p className="text-sm text-gray-500">مراقبة تفصيلية وآمنة للعمليات التلقائية وحالات الحظر والإنذارات الموجهة للأعضاء.</p>
                    </div>
                    
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 self-start">
                      <button 
                        onClick={() => setLogFilter("all")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${logFilter === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
                      >
                        الكل
                      </button>
                      <button 
                        onClick={() => setLogFilter("critical")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${logFilter === "critical" ? "bg-red-500/20 text-red-400" : "text-gray-400 hover:text-white"}`}
                      >
                        حرج جداً
                      </button>
                      <button 
                        onClick={() => setLogFilter("warning")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${logFilter === "warning" ? "bg-orange-500/20 text-orange-400" : "text-gray-400 hover:text-white"}`}
                      >
                        تحذيرات
                      </button>
                      <button 
                        onClick={() => setLogFilter("system")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${logFilter === "system" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white"}`}
                      >
                        النظام
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/10">
                    <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                          <Terminal size={40} className="mx-auto mb-3 text-gray-600" />
                          <p>لا توجد سجلات مطابقة لمعايير الفلترة الحالية.</p>
                        </div>
                      ) : (
                        filteredLogs.map((log: any) => (
                          <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.01] transition-all">
                            <div className="flex items-start gap-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                                log.level === "critical" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                log.level === "warning" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {log.level === "critical" ? "حرج جداً" :
                                 log.level === "warning" ? "تحذير" :
                                 "معلومة نظام"}
                              </span>
                              
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-200">{log.message}</p>
                                {log.user && (
                                  <p className="text-xs text-slate-500">الأصل/العضو المشتبه به: <span className="font-bold text-slate-300">@{log.user}</span></p>
                                )}
                              </div>
                            </div>
                            
                            <span className="font-mono text-xs text-gray-500 shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString("ar-SA")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${
        active 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.08)] font-bold" 
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && (
        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, title, value }: any) {
  return (
    <div className="bg-[#151619] p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
        <span className="text-gray-400 font-bold text-sm">{title}</span>
      </div>
      <div className="text-2xl font-extrabold truncate tracking-tight text-white">{value}</div>
    </div>
  );
}

function StatusItem({ label, value, color = "gray" }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-black/25 rounded-2xl border border-white/5">
      <span className="text-gray-400 font-medium text-sm">{label}</span>
      <span className={`font-mono font-bold text-sm ${
        color === "emerald" ? "text-emerald-400" :
        color === "red" ? "text-red-400" :
        "text-slate-300"
      }`}>{value}</span>
    </div>
  );
}

function ToggleItem({ icon, title, desc, active, onToggle }: any) {
  return (
    <div className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl shrink-0">{icon}</div>
        <div>
          <h4 className="font-bold text-gray-200 text-sm sm:text-base">{title}</h4>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`w-14 h-8 rounded-full relative transition-all duration-300 shrink-0 ${
          active ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-white/10"
        }`}
      >
        <motion.div 
          animate={{ x: active ? -28 : 0 }}
          className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow-lg"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
