import * as React from "react"

import { cn } from "@/lib/utils"

// This style forcibly makes all textareas resizable
const forceResizableStyles = `
  textarea {
    resize: vertical !important;
    overflow-y: auto !important;
    min-height: 80px !important;
  }
`;

// Add global style to document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('type', 'text/css');
  styleElement.textContent = forceResizableStyles;
  document.head.appendChild(styleElement);
  console.log("Injected global textarea resizable styles from base textarea component");
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  // Create a ref to handle direct DOM manipulation if external ref not provided
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  const resolvedRef = ref || innerRef;
  
  // Apply resize styles directly to the textarea after it's mounted and when its content changes
  React.useEffect(() => {
    if (resolvedRef && 'current' in resolvedRef && resolvedRef.current) {
      const textarea = resolvedRef.current;
      textarea.style.resize = 'vertical';
      textarea.style.overflowY = 'auto';
      textarea.style.minHeight = '80px';
      
      // Force the browser to recognize the resize handle by triggering a reflow
      const originalHeight = textarea.style.height;
      textarea.style.height = (parseInt(originalHeight || '80') + 1) + 'px';
      setTimeout(() => {
        textarea.style.height = originalHeight;
      }, 0);
    }
  }, [props.value, resolvedRef]);
  
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-vertical",
        className
      )}
      ref={resolvedRef}
      style={{ resize: 'vertical', overflowY: 'auto' }} // Apply inline style for immediate effect
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
