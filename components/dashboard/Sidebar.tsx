"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, Database, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    name: "Connection Monitor",
    href: "/dashboard/connection-monitor",
    icon: Activity,
  },
  {
    name: "Production Dashboard",
    href: "/dashboard/production",
    icon: BarChart3,
  },
  {
    name: "Data Explorer",
    href: "/dashboard/data-explorer",
    icon: Database,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-card border-r">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Scanner System</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <p>Scanner System v1.0.0</p>
          <p>© 2025 All rights reserved</p>
          <p>Powered By Vertif it solutions </p>
        </div>
      </div>
    </div>
  )
}

