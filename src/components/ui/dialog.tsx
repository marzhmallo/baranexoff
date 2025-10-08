import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({
  className,
  ...props
}, ref) => <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  onInteractOutside?: (event: React.MouseEvent<HTMLDivElement>) => void;
  hideCloseButton?: boolean;
}>(({
  className,
  children,
  onInteractOutside,
  hideCloseButton = false,
  ...props
}, ref) => {
  React.useEffect(() => {
    // When the dialog is mounted, set up
    document.body.style.pointerEvents = '';

    // Cleanup function that runs when dialog is unmounted
    return () => {
      document.body.style.pointerEvents = '';
      document.body.classList.remove('overflow-hidden');

      // Remove any aria-hidden attributes from the body and other elements
      document.body.setAttribute('aria-hidden', 'false');

      // Remove any aria-hidden from other elements that might be lingering
      const elements = document.querySelectorAll('[aria-hidden="true"]');
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'false');
      });
    };
  }, []);
  return <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} onInteractOutside={e => {
      if (onInteractOutside) {
        // Cast to expected type
        onInteractOutside(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      // Always prevent default to avoid issues with pointer events
      e.preventDefault();
    }} onCloseAutoFocus={e => {
      // Prevent the focus from going back to the trigger, which can cause issues
      e.preventDefault();
      // Ensure no element is still "focused"
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Additional cleanup to ensure UI remains interactive
      setTimeout(() => {
        document.body.classList.remove('overflow-hidden');
        document.body.style.pointerEvents = '';

        // Remove any lingering aria-hidden attributes
        const elements = document.querySelectorAll('[aria-hidden="true"]');
        elements.forEach(el => {
          el.setAttribute('aria-hidden', 'false');
        });
      }, 100);
    }} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className)} {...props}>
        {children}
        {!hideCloseButton && <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>}
      </DialogPrimitive.Content>
    </DialogPortal>;
});
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({
  className,
  ...props
}, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />);
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({
  className,
  ...props
}, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />);
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };