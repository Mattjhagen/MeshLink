import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-card border border-border text-foreground font-mono",
            title: "text-foreground font-semibold text-sm",
            description: "text-muted-foreground text-xs",
            actionButton: "bg-primary text-primary-foreground text-xs font-mono",
            icon: "text-primary",
          },
        }}
      />
    </>
  );
}
