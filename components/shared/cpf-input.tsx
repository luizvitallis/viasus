"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatCpf } from "@/lib/cpf";

interface CpfInputProps {
  id?: string;
  name?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

/**
 * Input de CPF com máscara 000.000.000-00. Submete o valor mascarado; o
 * servidor normaliza para 11 dígitos (normalizeCpf), então a pontuação é
 * irrelevante no backend.
 */
export function CpfInput({
  name = "cpf",
  defaultValue = "",
  placeholder = "000.000.000-00",
  ...rest
}: CpfInputProps) {
  const [value, setValue] = useState(() => formatCpf(defaultValue));

  return (
    <Input
      name={name}
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(formatCpf(e.target.value))}
      maxLength={14}
      placeholder={placeholder}
      {...rest}
    />
  );
}
