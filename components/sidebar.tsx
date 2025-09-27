"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ElementType } from "react"
import { useMemo } from "react"
import { useSession } from "@supabase/auth-helpers-react"
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Download,
  LayoutDashboard,
  ListMusic,
  NotebookText,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react"

type NavItem = {
  title: string
  href: string
  icon: ElementType
  description?: string
  subItems?: Array<{
    title: string
    href: string
  }>
}

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"])

const workflowNavigation: NavItem[] = [
  {
    title: "Playlists",
    href: "/dashboard",
    icon: ListMusic,
    subItems: [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Import Playlist", href: "/import" },
      { title: "Review Results", href: "/review" },
    ],
  },
  {
    title: "Purchases",
    href: "/purchase",
    icon: ShoppingBag,
  },
  {
    title: "Downloads",
    href: "/download",
    icon: Download,
  },
]

const resourceNavigation: NavItem[] = [
  {
    title: "Account",
    href: "/account",
    icon: User,
  },
  {
    title: "Documentation",
    href: "#",
    icon: NotebookText,
  },
  {
    title: "Settings",
    href: "#",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const session = useSession()
  const isPublicRoute = PUBLIC_ROUTES.has(pathname)

  const navIsVisible = !!session && !isPublicRoute

  const activeSection = useMemo(() => {
    return [...workflowNavigation, ...resourceNavigation].find((item) => {
      if (item.href === "#") return false
      if (item.href === pathname) return true
      return item.subItems?.some((subItem) => subItem.href === pathname)
    })
  }, [pathname])

  if (!navIsVisible) {
    return null
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = item.href === pathname || item.subItems?.some((subItem) => subItem.href === pathname)

    if (item.subItems && item.subItems.length > 0) {
      return (
        <Collapsible key={item.title} defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isActive}>
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                      <Link href={subItem.href}>{subItem.title}</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive}>
          <Link href={item.href} className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        <SidebarMenuAction>
          <ChevronRight className="h-3.5 w-3.5" />
        </SidebarMenuAction>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarPrimitive collapsible="icon" className="md:top-16">
      <SidebarHeader className="gap-2 border-b border-sidebar-border/60 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-sm font-semibold leading-tight">Isaac&apos;s Crates</span>
                <span className="text-xs text-sidebar-foreground/70">Prototype Workspace</span>
              </div>
            </SidebarMenuButton>
            <SidebarMenuAction className="size-6">
              <ChevronsUpDown className="h-4 w-4" />
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton variant="outline" size="sm" className="justify-start gap-2">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">{activeSection ? "Navigation" : "Workspace"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{workflowNavigation.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="my-1" />
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{resourceNavigation.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://api.dicebear.com/8.x/avataaars/svg?seed=isaac" alt="Isaac" />
                <AvatarFallback>IC</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-sm font-medium leading-tight">Isaac</span>
                <span className="text-xs text-sidebar-foreground/70">isaac@example.com</span>
              </div>
            </SidebarMenuButton>
            <SidebarMenuAction className="size-6">
              <ChevronsUpDown className="h-4 w-4" />
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarPrimitive>
  )
}
