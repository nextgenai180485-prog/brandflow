import { useRef, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DraftState {
  title: string;
  instructions: string;
  structuredBrief: any;
  campaignCopy: any;
  platforms: any[];
  contentTypes: string[];
  includeLogo: boolean;
  step: number;
  swapAssets: any[];
  selectedAssetIds: string[];
  creativeDirection: any | null;
  librarySelections: any[];
}

interface UseAutoSaveDraftOptions {
  /** Existing draft campaign ID to resume */
  resumeId?: string | null;
}

/**
 * Enterprise-grade auto-save hook.
 * Creates a draft campaign row on first meaningful interaction,
 * then debounce-updates `draft_state` JSONB silently in background.
 */
export function useAutoSaveDraft(opts?: UseAutoSaveDraftOptions) {
  const { user } = useAuth();
  const [draftId, setDraftId] = useState<string | null>(opts?.resumeId || null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJsonRef = useRef<string>("");
  const creatingRef = useRef(false);

  // Ensure draft row exists, return its id
  const ensureDraft = useCallback(async (title: string): Promise<string | null> => {
    if (draftId) return draftId;
    if (!user || creatingRef.current) return null;
    creatingRef.current = true;

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        profile_id: user.id,
        title: title.trim() || "Untitled Campaign",
        status: "draft",
        publish_platforms: [],
        draft_state: {} as any,
      })
      .select("id")
      .single();

    creatingRef.current = false;
    if (error || !data) return null;
    setDraftId(data.id);
    return data.id;
  }, [user, draftId]);

  // Persist state (debounced)
  const saveDraft = useCallback((state: DraftState) => {
    const json = JSON.stringify(state);
    if (json === lastJsonRef.current) return; // no change
    lastJsonRef.current = json;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const id = draftId || await ensureDraft(state.title);
      if (!id) return;

      setSaveStatus("saving");
      const { error } = await supabase
        .from("campaigns")
        .update({
          title: state.title.trim() || "Untitled Campaign",
          instructions: state.instructions.trim() || null,
          publish_platforms: [
            ...state.platforms.map((p: any) => `${p.platform}|${p.format}`),
            ...state.contentTypes.map((ct: string) => `ct:${ct}`),
          ],
          draft_state: state as any,
        })
        .eq("id", id);

      setSaveStatus(error ? "idle" : "saved");
      if (!error) {
        // Reset indicator after 2s
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    }, 1500); // 1.5s debounce
  }, [draftId, ensureDraft]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Load existing draft state
  const loadDraft = useCallback(async (campaignId: string): Promise<DraftState | null> => {
    const { data } = await supabase
      .from("campaigns")
      .select("draft_state, title, instructions, publish_platforms")
      .eq("id", campaignId)
      .single();

    if (!data?.draft_state) return null;
    setDraftId(campaignId);
    return data.draft_state as unknown as DraftState;
  }, []);

  // Clear draft_state when campaign is finalized (generation triggered)
  const finalizeDraft = useCallback(async () => {
    if (!draftId) return draftId;
    await supabase
      .from("campaigns")
      .update({ draft_state: null as any })
      .eq("id", draftId);
    return draftId;
  }, [draftId]);

  return { draftId, saveStatus, saveDraft, loadDraft, finalizeDraft, ensureDraft };
}
