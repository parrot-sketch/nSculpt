import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'link'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: "bg-brand-teal text-white hover:bg-brand-teal/90",
            outline: "border border-brand-teal/20 bg-transparent hover:bg-brand-teal/5 text-brand-teal",
            ghost: "hover:bg-brand-teal/5 text-brand-teal",
            link: "text-brand-teal underline-offset-4 hover:underline",
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:pointer-events-none disabled:opacity-50 h-12 px-6",
                    variants[variant],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
