'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Check, Copy, Key, ShieldCheck } from 'lucide-react';

interface CredentialSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    temporaryPassword?: string;
}

export function CredentialSuccessModal({
    isOpen,
    onClose,
    email,
    temporaryPassword,
}: CredentialSuccessModalProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        if (temporaryPassword) {
            await navigator.clipboard.writeText(temporaryPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => { }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                                <div>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                        <ShieldCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-lg font-semibold leading-6 text-slate-900"
                                        >
                                            User Created Successfully
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-500">
                                                The user account has been created. Please share these temporary
                                                credentials with the user immediately.
                                            </p>
                                        </div>

                                        <div className="mt-5 bg-slate-50 rounded-lg p-4 text-left border border-slate-200">
                                            <div className="mb-3">
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                                    Email Address
                                                </label>
                                                <div className="text-sm font-semibold text-slate-900 break-all">
                                                    {email}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                                    Temporary Password
                                                </label>
                                                {temporaryPassword ? (
                                                    <div className="flex items-center gap-2">
                                                        <code className="flex-1 bg-white px-3 py-2 rounded border border-slate-200 font-mono text-sm tracking-wide text-emerald-600 break-all">
                                                            {temporaryPassword}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={copyToClipboard}
                                                            className="inline-flex items-center justify-center p-2 rounded-md transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                                            title="Copy password"
                                                        >
                                                            {copied ? (
                                                                <Check className="h-5 w-5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-5 w-5 text-slate-500" />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-amber-600 italic">
                                                        No password returned. Checked if user already exists?
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2 text-amber-800">
                                                <Key className="h-4 w-4 mt-0.5 shrink-0" />
                                                <p className="text-xs">
                                                    <strong>Important:</strong> This password will only be shown once.
                                                    The user will be required to change it upon first login.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                        onClick={onClose}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
