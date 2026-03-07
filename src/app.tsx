import { A, Route, Router } from "@solidjs/router";
import { BarChart3, Building2 } from "lucide-solid";

import { appRoutePaths } from "@/app-routes";
import { appBasePath } from "@/lib/app-base-path";
import { DashboardPage } from "@/routes/dashboard-page";
import { PlaygroundPage } from "@/routes/playground-page";

function Navigation() {
  return (
    <header class="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div class="container flex h-14 items-center justify-between">
        <A href="/" class="flex items-center gap-2 font-semibold">
          <Building2 class="h-4 w-4 text-primary" />
          Top Revenue per Employee
        </A>
        <nav class="flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <A
            href="/"
            class="transition-colors hover:text-foreground [&.active]:text-foreground"
            end
          >
            Dashboard
          </A>
          <A
            href="/playground"
            class="inline-flex items-center gap-1 transition-colors hover:text-foreground [&.active]:text-foreground"
          >
            <BarChart3 class="h-4 w-4" />
            Playground
          </A>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <Router base={appBasePath} root={Navigation}>
      <Route path={appRoutePaths.dashboard} component={DashboardPage} />
      <Route path={appRoutePaths.playground} component={PlaygroundPage} />
    </Router>
  );
}
