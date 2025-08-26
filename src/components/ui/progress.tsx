"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
    const isIndeterminate = value === undefined;

    return (
        <ProgressPrimitive.Root
            ref={ref}
            className={cn(
                "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                className
            )}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className={cn(
                    "h-full w-full flex-1 bg-primary transition-all",
                    isIndeterminate && "animate-progress-indeterminate"
                )}
                style={{ transform: `translateX(-${100 - (value ?? 100)}%)`, ...(isIndeterminate && {animation: 'progress-indeterminate 1.5s infinite ease-in-out'}) }}
            />
        </ProgressPrimitive.Root>
    )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
