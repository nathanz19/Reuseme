import { create } from "zustand";
import type {
  ParsedJobDescription,
  SemanticRanking,
  TailoredProposal,
  Tone,
} from "@/types/resume";

export type TailorDialogState = {
  blockId: string;
  bulletIndex: number;
} | null;

export interface SessionState {
  searchQuery: string;
  selectedTags: string[];
  includeArchived: boolean;
  leftTab: "vault" | "jd";
  mobilePane: "vault" | "canvas";
  jdText: string;
  parsedJD: ParsedJobDescription | null;
  rankings: Record<string, SemanticRanking>;
  rankingsList: SemanticRanking[];
  lastMatchError: string | null;
  tailorProposal: TailoredProposal | null;
  tailorLoading: boolean;
  tailorDialog: TailorDialogState;
  setSearchQuery: (q: string) => void;
  toggleTag: (tag: string) => void;
  setIncludeArchived: (v: boolean) => void;
  setLeftTab: (tab: "vault" | "jd") => void;
  setMobilePane: (pane: "vault" | "canvas") => void;
  setJdText: (text: string) => void;
  setMatchResult: (
    parsed: ParsedJobDescription,
    list: SemanticRanking[],
  ) => void;
  setMatchError: (message: string) => void;
  clearMatchError: () => void;
  openTailorDialog: (blockId: string, bulletIndex: number) => void;
  closeTailorDialog: () => void;
  setTailorProposal: (proposal: TailoredProposal | null) => void;
  setTailorLoading: (loading: boolean) => void;
  setTailorTone: (tone: Tone) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  searchQuery: "",
  selectedTags: [],
  includeArchived: false,
  leftTab: "vault",
  mobilePane: "vault",
  jdText: "",
  parsedJD: null,
  rankings: {},
  rankingsList: [],
  lastMatchError: null,
  tailorProposal: null,
  tailorLoading: false,
  tailorDialog: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleTag: (tag) =>
    set((s) => ({
      selectedTags: s.selectedTags.includes(tag)
        ? s.selectedTags.filter((t) => t !== tag)
        : [...s.selectedTags, tag],
    })),
  setIncludeArchived: (v) => set({ includeArchived: v }),
  setLeftTab: (tab) => set({ leftTab: tab }),
  setMobilePane: (pane) => set({ mobilePane: pane }),
  setJdText: (text) => set({ jdText: text }),
  setMatchResult: (parsed, list) => {
    const rankings: Record<string, SemanticRanking> = {};
    for (const r of list) {
      rankings[r.blockId] = r;
    }
    set({
      parsedJD: parsed,
      rankingsList: list,
      rankings,
      lastMatchError: null,
    });
  },
  setMatchError: (message) => set({ lastMatchError: message }),
  clearMatchError: () => set({ lastMatchError: null }),
  openTailorDialog: (blockId, bulletIndex) =>
    set({ tailorDialog: { blockId, bulletIndex } }),
  closeTailorDialog: () =>
    set({ tailorDialog: null, tailorProposal: null, tailorLoading: false }),
  setTailorProposal: (proposal) => set({ tailorProposal: proposal }),
  setTailorLoading: (loading) => set({ tailorLoading: loading }),
  setTailorTone: (tone) =>
    set((s) =>
      s.tailorProposal
        ? { tailorProposal: { ...s.tailorProposal, selectedTone: tone } }
        : {},
    ),
}));
