"use client";

import { SectionActions } from "@/components/SectionActions";
import type { ResumePreset, TemplateId } from "@/types/resume";

interface ResumeHeaderProps {
  header: ResumePreset["header"];
  templateId: TemplateId;
}

export function ResumeHeader({ header, templateId }: ResumeHeaderProps) {
  const modern = templateId === "modern-tech";
  return (
    <div className="group relative">
      <div className="resume-hover-control absolute -right-8 top-0 print:hidden">
        <SectionActions category={{ id: "contact", label: "Contact Information", kind: "contact" }} />
      </div>
      <header className={modern ? "border-b-2 border-sky-700 pb-2" : ""}>
        <h1 className={`font-bold ${modern ? "text-2xl text-sky-900" : "text-xl"}`}>
          {header.fullName}
        </h1>
        <p className={`pb-2 text-sm ${modern ? "text-slate-600" : "text-slate-800"}`}>
          {[header.email, header.phone, header.location]
            .filter(Boolean)
            .join(" · ")}
          {header.links.length > 0 &&
            ` · ${header.links.map((l) => l.label).join(" · ")}`}
        </p>
      </header>
    </div>
  );
}
