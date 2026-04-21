import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, GraduationCap, ClipboardList, BarChart2, LogOut, BookOpen } from "lucide-react";

const Sidebar = ({ role, onLogout }) => {
  const { pathname } = useLocation();

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/students", label: "Students", icon: GraduationCap },
    { to: "/admin/teachers", label: "Teachers", icon: Users },
    { to: "/admin/classes", label: "Classes", icon: BookOpen },
    { to: "/admin/reports", label: "Reports", icon: BarChart2 },
  ];

  const teacherLinks = [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { to: "/teacher/attendance", label: "Attendance", icon: ClipboardList },
    { to: "/teacher/reports", label: "Reports", icon: BarChart2 },
  ];

  const links = role === "admin" ? adminLinks : teacherLinks;

  return (
    <aside className="sidebar">
      <div className="brand">School Attendance</div>
      <nav>
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`side-link ${active ? "active" : ""}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button className="logout-btn" onClick={onLogout}>
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
