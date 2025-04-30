
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  BarChart, 
  Home, 
  Package, 
  Calendar, 
  FileText, 
  DollarSign, 
  Users, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const [expanded, setExpanded] = useState(true);
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar className={cn(
        "h-screen border-r transition-all duration-300",
        expanded ? "w-64" : "w-20"
      )}>
        <SidebarHeader className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded && (
              <span className="font-bold text-xl text-white">Axis</span>
            )}
            {!expanded && (
              <span className="font-bold text-xl text-white">A</span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </Button>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/" className="flex items-center gap-3">
                      <Home size={20} />
                      {expanded && <span>Dashboard</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/inventory" className="flex items-center gap-3">
                      <Package size={20} />
                      {expanded && <span>Inventory</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/sales" className="flex items-center gap-3">
                      <DollarSign size={20} />
                      {expanded && <span>Sales</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/accounting" className="flex items-center gap-3">
                      <BarChart size={20} />
                      {expanded && <span>Accounting</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/employees" className="flex items-center gap-3">
                      <Users size={20} />
                      {expanded && <span>Employees</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/invoices" className="flex items-center gap-3">
                      <FileText size={20} />
                      {expanded && <span>Invoices</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/calendar" className="flex items-center gap-3">
                      <Calendar size={20} />
                      {expanded && <span>Calendar</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/settings" className="flex items-center gap-3">
                      <Settings size={20} />
                      {expanded && <span>Settings</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          {expanded ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                  <span className="text-sidebar-foreground">John Doe</span>
                  <span className="text-sidebar-foreground/70 text-xs">Admin</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut size={18} />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}
