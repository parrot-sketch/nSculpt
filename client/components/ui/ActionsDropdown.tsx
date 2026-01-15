'use client';

import { Menu, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';
import { Ellipsis, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ActionItem {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
    danger?: boolean;
}

interface ActionsDropdownProps {
    actions: ActionItem[];
    className?: string;
}

/**
 * Premium Actions Dropdown
 * 
 * Uses Headless UI v2 'anchor' for robust positioning outside overflow containers.
 * Styles follow the Nairobi Sculpt brand: Space Cadet (Navy) and Lion (Gold/Tan).
 */
export function ActionsDropdown({ actions, className }: ActionsDropdownProps) {
    return (
        <Menu as="div" className={cn("relative inline-block text-left", className)}>
            <div>
                <Menu.Button className="group flex items-center justify-center rounded-full h-9 w-9 text-slate-400 hover:text-spaceCadet hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-lion focus:ring-offset-2 transition-all duration-200 shadow-sm border border-transparent hover:border-neutral-200">
                    <span className="sr-only">Open options</span>
                    <Ellipsis className="h-5 w-5 rotate-0 group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                {/* 
                    Using anchor from Headless UI v2 to break out of table overflow.
                    Style is 'Glassmorphism' with backdrop-blur.
                */}
                <Menu.Items
                    anchor="bottom end"
                    className="z-50 mt-2 w-64 origin-top-right rounded-xl bg-white/90 backdrop-blur-md shadow-xl ring-1 ring-spaceCadet/5 focus:outline-none divide-y divide-neutral-100 border border-white/20 overflow-hidden"
                >
                    <div className="py-2">
                        {actions.map((action, index) => (
                            <Menu.Item key={index}>
                                {({ active }) => {
                                    const isExternal = action.href?.startsWith('http');

                                    const content = (
                                        <>
                                            <div className={cn(
                                                "p-2 rounded-lg mr-3 transition-colors",
                                                active ? "bg-white shadow-sm" : "bg-neutral-50"
                                            )}>
                                                {action.icon ? (
                                                    <span className={cn(
                                                        "h-4 w-4 block",
                                                        action.danger ? "text-rose-500" : (active ? "text-lion" : "text-spaceCadet/60")
                                                    )}>
                                                        {action.icon}
                                                    </span>
                                                ) : <div className="h-4 w-4" />}
                                            </div>
                                            <span className="flex-grow font-medium text-[13px]">
                                                {action.label}
                                            </span>
                                            {isExternal && <ExternalLink className="h-3 w-3 text-neutral-300 ml-2" />}
                                        </>
                                    );

                                    const itemClasses = cn(
                                        "group flex items-center px-3 py-2 text-sm w-full text-left transition-all duration-150 mx-1 rounded-lg w-[calc(100%-8px)] mb-0.5 last:mb-0",
                                        active ? "bg-neutral-100 text-spaceCadet" : "text-neutral-700",
                                        action.danger ? (active ? "bg-rose-50 text-rose-700" : "text-rose-600") : ""
                                    );

                                    if (action.href) {
                                        return (
                                            <Link href={action.href} className={itemClasses}>
                                                {content}
                                            </Link>
                                        );
                                    }

                                    return (
                                        <button
                                            type="button"
                                            onClick={action.onClick}
                                            className={itemClasses}
                                        >
                                            {content}
                                        </button>
                                    );
                                }}
                            </Menu.Item>
                        ))}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
