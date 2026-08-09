import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  LogOut,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user, signOut } = useAuth();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "KPIs",
      path: "/kpis",
      icon: BarChart3,
    },
    {
	  name: "Scores",
	  path: "/monthly-scores",
	  icon: ClipboardList,
	},
  ];

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-gray-200 bg-white px-6 py-8">

      {/* Profile */}
      <div className="text-center">

        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 text-3xl font-bold text-white">
          {user?.email?.charAt(0).toUpperCase() || "U"}
        </div>

        <h5 className="mt-4 text-xl font-semibold text-gray-600">
          {user?.user_metadata?.name || "User"}
        </h5>

        <span className="text-gray-400">
          {user?.user_metadata?.role || "User"}
        </span>

      </div>


      {/* Navigation */}
      <nav className="mt-8">

        <ul className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>

                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center space-x-4 rounded-xl px-4 py-3 transition ${
                      isActive
                        ? "bg-gradient-to-r from-sky-600 to-cyan-400 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >

                  <Icon
                    size={22}
                    className="shrink-0"
                  />

                  <span className="font-medium">
                    {item.name}
                  </span>

                </NavLink>

              </li>
            );
          })}

        </ul>

      </nav>


      {/* Logout */}
      <div className="mt-auto border-t border-gray-200 pt-4">

        <button
          onClick={signOut}
          className="flex w-full items-center space-x-4 rounded-md px-4 py-3 text-gray-600 transition hover:bg-gray-50 hover:text-gray-800"
        >

          <LogOut size={22} />

          <span>
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;