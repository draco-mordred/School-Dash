import { Link } from "react-router-dom";
import { AlertTriangle, GitBranch, Home } from "lucide-react";

const NotFound = () => {
  return (
    <div id="page-notfound" className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="relative max-w-4xl w-full overflow-hidden rounded-[2rem] border border-muted/60 bg-card/90 p-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-90" />
        <div className="relative flex flex-col gap-8">
          <div className="flex items-center gap-4 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Page not found</p>
              <h1 className="text-6xl font-black text-foreground">404</h1>
            </div>
          </div>

          <div className="space-y-4">
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              The page you are looking for does not exist, may have been moved, or is temporarily unavailable.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Home className="h-4 w-4" />
                Go back home
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <GitBranch className="h-4 w-4" />
                Go to dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-border bg-background/80 p-8 shadow-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">What you can do</p>
              <ul className="mt-5 space-y-3 text-sm text-foreground/80">
                <li>• Check the URL for typos.</li>
                <li>• Return to the homepage or dashboard.</li>
                <li>• If you think this is a bug, let the team know.</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Not sure what happened?</p>
              <p className="mt-3 leading-7">
                Refresh the page or try returning to the main navigation. If the page still cannot be reached, it may be offline or the route no longer exists.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
