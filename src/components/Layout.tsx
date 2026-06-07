import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";

function formatChineseDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDay = weekDays[date.getDay()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}年${month}月${day}日 星期${weekDay} ${hours}:${minutes}:${seconds}`;
}

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
  notificationCount?: number;
}

export default function Layout({
  title = "山泉水质监测平台",
  children,
  notificationCount = 0,
}: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between h-16 px-6 bg-surface-100 border-b border-surface-400/20 shrink-0">
          <h1 className="text-lg font-semibold text-slate-100">{title}</h1>

          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-400 font-mono">
              {formatChineseDateTime(currentTime)}
            </span>

            <button className="relative p-2 text-slate-400 hover:text-slate-200 transition-colors duration-200">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-data-red rounded-full">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 overflow-y-auto p-6",
            "bg-surface",
            "[background-image:radial-gradient(circle,rgba(51,65,85,0.15)_1px,transparent_1px)]",
            "[background-size:24px_24px]"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
