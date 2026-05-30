"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  LogOut,
} from "lucide-react";

import { FloatingParticles } from "@/components/layout/floating-particles";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const sidebarMenuItemClass = "overflow-hidden";

const sidebarMenuButtonClass = cn(
  "relative transition-all duration-300 ease-out hover:translate-x-0.5",
  "[&>svg:first-child]:transition-transform [&>svg:first-child]:duration-300",
  "group-hover/menu-item:[&>svg:first-child]:scale-105",
  "before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0.5",
  "before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary",
  "before:transition-all before:duration-300",
  "group-hover/menu-item:before:h-5 data-[active=true]:before:h-5"
);

const sidebarMenuSubButtonClass =
  "transition-colors duration-300 hover:translate-x-0.5";

function SidebarBrand() {
  const { state, isMobile } = useSidebar();

  const brand = (
    <Link
      href="/tasks"
      className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20",
          "size-10 text-base",
          "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-sm group-data-[collapsible=icon]:shadow-md",
        )}
      >
        Ji
      </div>
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="mb-1 text-sm font-semibold leading-none">Jiganto</p>
        <p className="text-xs text-muted-foreground">Task Tracker</p>
      </div>
    </Link>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{brand}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
      >
        Jiganto
      </TooltipContent>
    </Tooltip>
  );
}

interface AppSidebarProviderProps {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  projects: Array<{ id: string; name: string }>;
}

export function AppSidebarProvider({
  children,
  userEmail,
  userName,
  projects,
}: AppSidebarProviderProps) {
  return (
    <SidebarProvider>
      <AppShell
        userEmail={userEmail}
        userName={userName}
        projects={projects}
      >
        {children}
      </AppShell>
    </SidebarProvider>
  );
}

function AppShell({
  children,
  userEmail,
  userName,
  projects,
}: AppSidebarProviderProps) {
  const pathname = usePathname();
  const isTasksActive =
    pathname === "/tasks" || pathname.startsWith("/tasks/");
  const activeProjectId = pathname.startsWith("/projects/")
    ? pathname.split("/")[2]
    : null;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:p-2">
          <SidebarBrand />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={sidebarMenuItemClass}>
                  <SidebarMenuButton
                    asChild
                    isActive={isTasksActive}
                    tooltip="Tasks"
                    className={sidebarMenuButtonClass}
                  >
                    <Link href="/tasks">
                      <CheckSquare />
                      <span>Tasks</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/tasks"}
                        className={sidebarMenuSubButtonClass}
                      >
                        <Link href="/tasks">
                          <span>All Tasks</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/tasks/my"}
                        className={sidebarMenuSubButtonClass}
                      >
                        <Link href="/tasks/my">
                          <span>My Tasks</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>

                {projects.length > 0 && (
                  <SidebarMenuItem className={sidebarMenuItemClass}>
                    <SidebarMenuButton
                      tooltip="Projects"
                      className={sidebarMenuButtonClass}
                    >
                      <FolderKanban />
                      <span>Projects</span>
                      <ChevronRight className="ml-auto group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {projects.map((project) => (
                        <SidebarMenuSubItem key={project.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeProjectId === project.id}
                            className={sidebarMenuSubButtonClass}
                          >
                            <Link href={`/projects/${project.id}`}>
                              <span>{project.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <form action="/api/auth/signout" method="post" className="mt-2">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 px-2"
            >
              <LogOut className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Sign out
              </span>
            </Button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutGrid className="size-4" />
            <span>Portfolio</span>
            <ChevronRight className="size-3.5" />
            <span className={cn("font-medium text-foreground")}>
              {activeProjectId
                ? (projects.find((p) => p.id === activeProjectId)?.name ??
                  "Project")
                : pathname === "/tasks/my"
                  ? "My Tasks"
                  : "Tasks"}
            </span>
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </>
  );
}

export function AppPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={headerRef}
      className="relative flex w-full min-w-0 shrink-0 flex-col gap-4 overflow-hidden border-b bg-primary/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <FloatingParticles containerRef={headerRef} />
      <div className="relative z-10">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

