"use client";

import type { FormEvent, ReactNode } from "react";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
};

export function ConfirmDeleteForm({ action, confirmMessage, children, className }: ConfirmDeleteFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
