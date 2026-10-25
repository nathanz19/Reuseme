"use client";

import { SectionActions } from "@/components/SectionActions";
import { Mail, MapPin, Phone } from "lucide-react";
import type { ResumePreset, TemplateId } from "@/types/resume";

interface ResumeHeaderProps {
  header: ResumePreset["header"];
  templateId: TemplateId;
  referenceFormat?: ResumePreset["referenceFormat"];
  subtitle?: string;
}

export function ResumeHeader({ header, templateId, referenceFormat, subtitle }: ResumeHeaderProps) {
  const modern = templateId === "modern-tech";
  const separator = referenceFormat?.details?.contactSeparator === "pipe" ? " | " : " · ";
  return (
    <div className="group relative">
      <div className="resume-hover-control absolute right-0 top-0 print:hidden">
        <SectionActions category={{ id: "contact", label: "Contact Information", kind: "contact" }} />
      </div>
      <header className={modern ? "border-b-2 border-sky-700 pb-2" : ""}>
        <h1 className={`pr-16 print:pr-0 font-bold ${modern ? "text-2xl text-sky-900" : "text-xl"}`}>
          {header.fullName}
        </h1>
        {subtitle && <p className="reference-subtitle">{subtitle}</p>}
        {referenceFormat?.layout?.contactLayout === "spread" ? <div className="reference-contacts" aria-label="Contact information">
          {[
            { value: header.phone, icon: Phone },
            { value: header.email, icon: Mail },
            { value: header.location, icon: MapPin },
          ].filter((item) => item.value).map(({ value, icon: Icon }, index) => <span key={index} className="flex min-w-0 items-center justify-center gap-1">
            {referenceFormat.layout?.contactIcons && <Icon size={11} className="shrink-0" aria-hidden="true" />}<span className="break-words">{value}</span>
          </span>)}
          {header.links.length > 0 && <span className="col-span-full text-center">{header.links.map((link) => link.label).join(separator)}</span>}
        </div> : <p className={`pb-2 text-sm ${modern ? "text-slate-600" : "text-slate-800"}`}>
          {[header.email, header.phone, header.location]
            .filter(Boolean)
            .join(separator)}
          {header.links.length > 0 &&
            `${separator}${header.links.map((l) => l.label).join(separator)}`}
        </p>}
      </header>
    </div>
  );
}
