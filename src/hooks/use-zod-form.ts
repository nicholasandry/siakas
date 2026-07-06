"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";

import { formatZodFieldErrors } from "@/lib/validators/zod-utils";

export function useZodForm<T extends z.ZodType>(schema: T) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (data: unknown) => {
      const result = schema.safeParse(data);

      if (!result.success) {
        setFieldErrors(formatZodFieldErrors(result.error));
        return null;
      }

      setFieldErrors({});
      return result.data;
    },
    [schema]
  );

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  return { fieldErrors, validate, clearFieldError, setFieldErrors };
}
