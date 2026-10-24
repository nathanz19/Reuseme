"use client";

import { useState } from "react";
import type { ResumePreset, TemplateId } from "@/types/resume";

interface ResumeHeaderProps {
  header: ResumePreset["header"];
  customSkills: string[];
  templateId: TemplateId;
  onSave: (
    header: ResumePreset["header"],
    customSkills: string[],
  ) => void;
}

export function ResumeHeader({
  header,
  customSkills,
  templateId,
  onSave,
}: ResumeHeaderProps) {
  const [open, setOpen] = useState(false);
  const [draftHeader, setDraftHeader] = useState(header);
  const [skillsText, setSkillsText] = useState(customSkills.join(", "));

  const modern = templateId === "modern-tech";

  return (
    <div className="relative">
      <button
        type="button"
        className="resume-hover-control absolute right-0 top-0 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs print:hidden"
        onClick={() => {
          setDraftHeader(header);
          setSkillsText(customSkills.join(", "));
          setOpen((v) => !v);
        }}
      >
        Edit header
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-72 rounded border border-slate-300 bg-white p-3 text-xs shadow-lg print:hidden">
          <label className="block">
            Full name
            <input
              className="mt-0.5 w-full rounded border px-1 py-0.5"
              value={draftHeader.fullName}
              onChange={(e) =>
                setDraftHeader({ ...draftHeader, fullName: e.target.value })
              }
            />
          </label>
          <label className="mt-2 block">
            Email
            <input
              className="mt-0.5 w-full rounded border px-1 py-0.5"
              value={draftHeader.email}
              onChange={(e) =>
                setDraftHeader({ ...draftHeader, email: e.target.value })
              }
            />
          </label>
          <label className="mt-2 block">
            Phone
            <input
              className="mt-0.5 w-full rounded border px-1 py-0.5"
              value={draftHeader.phone}
              onChange={(e) =>
                setDraftHeader({ ...draftHeader, phone: e.target.value })
              }
            />
          </label>
          <label className="mt-2 block">
            Location
            <input
              className="mt-0.5 w-full rounded border px-1 py-0.5"
              value={draftHeader.location}
              onChange={(e) =>
                setDraftHeader({ ...draftHeader, location: e.target.value })
              }
            />
          </label>
          <label className="mt-2 block">
            Skills (comma-separated)
            <textarea
              className="mt-0.5 w-full rounded border px-1 py-0.5"
              rows={3}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded border px-2 py-0.5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-slate-900 px-2 py-0.5 text-white"
              onClick={() => {
                const skills = skillsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                onSave(draftHeader, skills);
                setOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
      <header className={modern ? "border-b-2 border-sky-700 pb-2" : ""}>
        <h1 className={`font-bold ${modern ? "text-2xl text-sky-900" : "text-xl"}`}>
          {header.fullName}
        </h1>
        <p className={`text-sm ${modern ? "text-slate-600" : "text-slate-800"}`}>
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
