import React from "react";

export default function AvalonFooter() {
  return (
    <footer className="w-full border-t border-border bg-background/80 backdrop-blur px-6 py-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>Copyright Avalon Industries</div>
        <div className="flex items-center gap-3">
          <a className="hover:text-foreground" href="#">
            Private policy
          </a>
          <span aria-hidden>|</span>
          <a className="hover:text-foreground" href="#">
            Terms of use
          </a>
        </div>
      </div>
    </footer>
  );
}

