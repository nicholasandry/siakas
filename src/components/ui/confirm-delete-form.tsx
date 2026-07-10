"use client";

import { useRef, type FormEvent, type ReactNode } from "react";

import { Swal } from "@/lib/swal";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
};

export function ConfirmDeleteForm({ action, confirmMessage, children, className }: ConfirmDeleteFormProps) {
  const confirmedRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }

    event.preventDefault();
    const result = await Swal.fire({
      title: "Konfirmasi hapus",
      text: confirmMessage,
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Batal",
      confirmButtonText: "Hapus",
      confirmButtonColor: "#be123c",
    });

    if (result.isConfirmed) {
      confirmedRef.current = true;
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
