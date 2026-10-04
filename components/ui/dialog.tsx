"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

interface DragContextValue {
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

const DialogDragContext = React.createContext<DragContextValue>({});

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 pointer-events-auto",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideHandle?: boolean;
  onDismiss?: () => void;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideHandle = false, onDismiss, style, ...props }, ref) => {
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startYRef = React.useRef(0);
  const currentYRef = React.useRef(0);
  const startTimeRef = React.useRef(0);
  const isDismissingRef = React.useRef(false);

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (!onDismiss || isDismissingRef.current || e.touches.length !== 1) return;
      const clientY = e.touches[0].clientY;
      startYRef.current = clientY;
      currentYRef.current = clientY;
      startTimeRef.current = Date.now();
      setIsDragging(true);
    },
    [onDismiss]
  );

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !onDismiss || isDismissingRef.current || e.touches.length !== 1) return;
      const clientY = e.touches[0].clientY;
      currentYRef.current = clientY;
      const deltaY = clientY - startYRef.current;
      if (deltaY > 0) {
        setDragY(deltaY);
      } else {
        // Subtle resistance upwards
        setDragY(deltaY * 0.15);
      }
    },
    [isDragging, onDismiss]
  );

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging || !onDismiss || isDismissingRef.current) return;
    setIsDragging(false);

    const deltaY = currentYRef.current - startYRef.current;
    const deltaTime = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = deltaY / deltaTime; // px/ms

    // Threshold: dragged down > 100px OR downward swipe velocity > 0.45 px/ms
    if (deltaY > 100 || (deltaY > 30 && velocity > 0.45)) {
      isDismissingRef.current = true;
      const offscreenY = typeof window !== "undefined" ? window.innerHeight : 800;
      setDragY(offscreenY);
      setTimeout(() => {
        onDismiss();
        setDragY(0);
        isDismissingRef.current = false;
      }, 200);
    } else {
      setDragY(0);
    }
  }, [isDragging, onDismiss]);

  const dragHandlers: DragContextValue = React.useMemo(
    () =>
      onDismiss
        ? {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
          }
        : {},
    [onDismiss, handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 m-0 pointer-events-none">
        <DialogPrimitive.Content
          ref={ref}
          style={{
            transform: dragY !== 0 ? `translate3d(0, ${Math.max(0, dragY)}px, 0)` : undefined,
            transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
            ...style,
          }}
          className={cn(
            // Mobile: authentic iOS Bottom Sheet (< sm)
            "pointer-events-auto w-full max-h-[90vh] bg-card text-card-foreground rounded-t-[32px] rounded-b-none border-t border-x-0 border-b-0 border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 sm:!transform-none",
            // Desktop: centered floating modal (sm+)
            "sm:max-w-lg sm:w-full sm:mx-auto sm:my-auto sm:rounded-3xl sm:border sm:border-border sm:max-h-[85vh] sm:animate-in sm:zoom-in-95 sm:fade-in-0 sm:slide-in-from-bottom-0",
            className
          )}
          {...props}
        >
          <DialogDragContext.Provider value={dragHandlers}>
            {!hideHandle && (
              <div
                className="sm:hidden w-full flex items-center justify-center pt-2 pb-0 cursor-grab active:cursor-grabbing touch-none select-none"
                {...dragHandlers}
              >
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 mx-auto my-3 cursor-grab active:cursor-grabbing" />
              </div>
            )}
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 sm:right-5 sm:top-5 rounded-xl text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none p-2 sm:p-1.5 hover:bg-muted/50 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center z-30">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogDragContext.Provider>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const dragHandlers = React.useContext(DialogDragContext);
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left touch-none sm:touch-auto",
        className
      )}
      {...dragHandlers}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4 border-t border-border/80 mt-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-bold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
