import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  DoorOpen,
  FileText,
  DollarSign,
  Ticket,
  Briefcase,
  Newspaper,
} from "lucide-react";

const adminMenuItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Overview" },
  { path: "/admin/bookings", icon: CalendarCheck, label: "Bookings" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/rooms", icon: DoorOpen, label: "Rooms" },
  { path: "/admin/services", icon: Briefcase, label: "Services" },
  { path: "/admin/medical-records", icon: FileText, label: "Medical Records" },
  { path: "/admin/transactions", icon: DollarSign, label: "Transactions" },
  { path: "/admin/vouchers", icon: Ticket, label: "Vouchers" },
  { path: "/admin/news", icon: Newspaper, label: "News" },
];

const AdminSidebar = ({ collapsed }) => {
  return (
    <nav className="px-3 space-y-1">
      <p
        className={`px-3 mb-3 text-[10px] font-bold tracking-widest uppercase text-[#2D3436]/40 ${collapsed ? "text-center" : ""}`}
      >
        {collapsed ? "—" : "Admin"}
      </p>
      {adminMenuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/admin"}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-[#D97853] text-white"
                : "text-[#2D3436]/70 hover:bg-[#2D3436]/5 hover:text-[#2D3436]"
            } ${collapsed ? "justify-center" : ""}`
          }
        >
          <item.icon size={20} className="shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
};

export default AdminSidebar;
