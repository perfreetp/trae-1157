import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Droplets,
  LayoutDashboard,
  MapPin,
  LineChart,
  TestTubes,
  Bell,
  ClipboardCheck,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

const navItems: NavItem[] = [
  { label: "首页总览", icon: LayoutDashboard, to: "/" },
  { label: "监测点地图", icon: MapPin, to: "/map" },
  { label: "水质详情", icon: LineChart, to: "/detail" },
  { label: "取样任务", icon: TestTubes, to: "/sampling" },
  { label: "告警中心", icon: Bell, to: "/alerts" },
  { label: "巡查记录", icon: ClipboardCheck, to: "/patrol" },
  { label: "统计报表", icon: BarChart3, to: "/reports" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-surface-100 border-r border-surface-400/20 transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-400/20">
        <Droplets className="w-8 h-8 text-spring-400 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-spring-400 whitespace-nowrap">
            山泉水质监测
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group",
                  isActive
                    ? "bg-spring-700/30 text-spring-400 border-l-[3px] border-spring-400"
                    : "text-surface-400 hover:bg-surface-200/50 hover:text-slate-200 border-l-[3px] border-transparent"
                )
              }
              onMouseEnter={() => setHoveredItem(item.to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && hoveredItem === item.to && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-300 text-slate-200 text-sm rounded-md whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-surface-400/20 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-surface-300 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm text-slate-200 truncate">值班员</p>
              <p className="text-xs text-slate-500 truncate">水务站值班员</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-surface-400/20 text-slate-400 hover:text-slate-200 hover:bg-surface-200/50 transition-colors duration-200"
      >
        {collapsed ? (
          <ChevronsRight className="w-5 h-5" />
        ) : (
          <ChevronsLeft className="w-5 h-5" />
        )}
      </button>
    </aside>
  );
}
