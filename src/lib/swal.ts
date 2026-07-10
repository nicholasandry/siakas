"use client";

type SwalIcon = "warning" | "error" | "success" | "info" | "question";

type SwalOptions = {
  title?: string;
  text?: string;
  html?: string;
  icon?: SwalIcon;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
};

type SwalResult = {
  isConfirmed: boolean;
  isDismissed: boolean;
};

const iconLabels: Record<SwalIcon, string> = {
  warning: "!",
  error: "x",
  success: "✓",
  info: "i",
  question: "?",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

export const Swal = {
  fire(options: SwalOptions): Promise<SwalResult> {
    if (typeof document === "undefined") {
      return Promise.resolve({ isConfirmed: false, isDismissed: true });
    }

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.setAttribute("role", "presentation");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "24px";
      overlay.style.background = "rgba(15, 23, 42, 0.45)";

      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.style.width = "min(100%, 420px)";
      dialog.style.borderRadius = "12px";
      dialog.style.background = "#ffffff";
      dialog.style.boxShadow = "0 24px 80px rgba(15, 23, 42, 0.28)";
      dialog.style.padding = "24px";
      dialog.style.textAlign = "center";
      dialog.style.fontFamily = "Segoe UI, Inter, Arial, sans-serif";

      const icon = options.icon ?? "info";
      const bodyHtml = options.html ?? (options.text ? textToHtml(options.text) : "");
      dialog.innerHTML = `
        <div style="display:flex;justify-content:center;margin-bottom:16px;">
          <div style="display:flex;height:56px;width:56px;align-items:center;justify-content:center;border-radius:999px;border:2px solid #f59e0b;color:#b45309;font-size:28px;font-weight:700;">
            ${iconLabels[icon]}
          </div>
        </div>
        <h2 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">${escapeHtml(options.title ?? "Konfirmasi")}</h2>
        ${bodyHtml ? `<div style="margin-top:12px;color:#475569;font-size:14px;line-height:1.6;">${bodyHtml}</div>` : ""}
        <div data-actions style="margin-top:22px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;"></div>
      `;

      const actions = dialog.querySelector("[data-actions]");
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = options.cancelButtonText ?? "Batal";
      cancelButton.style.height = "40px";
      cancelButton.style.borderRadius = "8px";
      cancelButton.style.border = "1px solid #e2e8f0";
      cancelButton.style.background = options.cancelButtonColor ?? "#ffffff";
      cancelButton.style.padding = "0 16px";
      cancelButton.style.color = "#334155";
      cancelButton.style.fontWeight = "600";
      cancelButton.style.cursor = "pointer";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.textContent = options.confirmButtonText ?? "OK";
      confirmButton.style.height = "40px";
      confirmButton.style.borderRadius = "8px";
      confirmButton.style.border = "1px solid transparent";
      confirmButton.style.background = options.confirmButtonColor ?? "#0f172a";
      confirmButton.style.padding = "0 16px";
      confirmButton.style.color = "#ffffff";
      confirmButton.style.fontWeight = "600";
      confirmButton.style.cursor = "pointer";

      function close(result: SwalResult) {
        overlay.remove();
        resolve(result);
      }

      cancelButton.addEventListener("click", () => close({ isConfirmed: false, isDismissed: true }));
      confirmButton.addEventListener("click", () => close({ isConfirmed: true, isDismissed: false }));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close({ isConfirmed: false, isDismissed: true });
      });

      if (options.showCancelButton) {
        actions?.append(cancelButton);
      }
      actions?.append(confirmButton);
      overlay.append(dialog);
      document.body.append(overlay);
      confirmButton.focus();
    });
  },
};
