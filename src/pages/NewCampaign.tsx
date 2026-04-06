import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Upload, X, Loader2, Plus, ImageIcon, VideoIcon, Layers, Image, Sparkles, Film, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AssetPlatformSelector from "@/components/AssetPlatformSelector";
import CMOStrategyPanel from "@/components/CMOStrategyPanel";
import type { SocialPlatform, ContentType, BrandProfile } from "@/types/campaigns";
import { CONTENT_TYPE_LABELS } from "@/types/campaigns";

interface SelectedFormat {
  platform: SocialPlatform;
  format: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  url: string | null;
  type: "image" | "video";
}

type UploadMode = "separate" | "grouped";

const STEPS = ["Details", "Platforms", "Content Type", "Review"];

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  image: <ImageIcon className="w-5 h-5" />,
  ugc_video: <Camera className="w-5 h-5" />,
  pro_video: <Film className="w-5 h-5" />,
};

const NewCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [platforms, setPlatforms] = useState<SelectedFormat[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("separate");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load brand profile from brand_memory
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("brand_memory")
        .select("context")
        .eq("profile_id", user.id)
        .eq("memory_type", "brand_profile")
        .eq("pattern_category", "auto_research")
        .limit(1)
        .single();
      if (data?.context) {
        setBrandProfile(data.context as unknown as BrandProfile);
      }
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      const id = crypto.randomUUID();
      const isVideo = file.type.startsWith("video/");
      const preview = isVideo ? "" : URL.createObjectURL(file);
      const entry: UploadedFile = { id, file, preview, uploading: true, url: null, type: isVideo ? "video" : "image" };
      if (!user) return { ...entry, uploading: false };
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${id}.${ext}`;
      const { error } = await supabase.storage.from("campaign_assets").upload(path, file, { upsert: false });
      if (error) { toast.error(`Failed to upload ${file.name}`); return { ...entry, uploading: false }; }
      const { data: { publicUrl } } = supabase.storage.from("campaign_assets").getPublicUrl(path);
      return { ...entry, uploading: false, url: publicUrl };
    },
    [user]
  );

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const newFiles = Array.from(incoming).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      if (newFiles.length === 0) return;
      const placeholders: UploadedFile[] = newFiles.map((f) => ({
        id: crypto.randomUUID(), file: f,
        preview: f.type.startsWith("video/") ? "" : URL.createObjectURL(f),
        uploading: true, url: null,
        type: f.type.startsWith("video/") ? "video" as const : "image" as const,
      }));
      setFiles((prev) => [...prev, ...placeholders]);
      const results = await Promise.all(newFiles.map(uploadFile));
      setFiles((prev) => {
        const existing = prev.filter((p) => !placeholders.find((ph) => ph.id === p.id));
        return [...existing, ...results];
      });
    },
    [uploadFile]
  );

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const removeFile = (id: string) => { setFiles((prev) => { const r = prev.find((f) => f.id === id); if (r?.preview) URL.revokeObjectURL(r.preview); return prev.filter((f) => f.id !== id); }); };

  const toggleContentType = (ct: ContentType) => {
    setContentTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
  };

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);

    const publishPlatforms = platforms.map((p) => `${p.platform}|${p.format}`);
    const ctEntries = contentTypes.map((ct) => `ct:${ct}`);

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        profile_id: user.id,
        title: title.trim(),
        instructions: instructions.trim() || null,
        status: "draft",
        publish_platforms: [...publishPlatforms, ...ctEntries],
      })
      .select().single();

    if (error || !campaign) { toast.error("Failed to create campaign."); setCreating(false); return; }

    const uploadedFiles = files.filter((f) => f.url);
    const assetRows: Array<{ campaign_id: string; profile_id: string; asset_type: string; content_url: string; status: string; platform: string | null; format: string | null; }> = [];

    if (uploadMode === "grouped" && uploadedFiles.length > 1) {
      if (platforms.length > 0) {
        for (const p of platforms) {
          assetRows.push({ campaign_id: campaign.id, profile_id: user.id, asset_type: "carousel", content_url: uploadedFiles[0].url!, status: "pending_review", platform: p.platform, format: p.format });
        }
      } else {
        assetRows.push({ campaign_id: campaign.id, profile_id: user.id, asset_type: "carousel", content_url: uploadedFiles[0].url!, status: "pending_review", platform: null, format: null });
      }
    } else {
      for (const f of uploadedFiles) {
        if (platforms.length > 0) {
          for (const p of platforms) {
            assetRows.push({ campaign_id: campaign.id, profile_id: user.id, asset_type: f.type, content_url: f.url!, status: "pending_review", platform: p.platform, format: p.format });
          }
        } else {
          assetRows.push({ campaign_id: campaign.id, profile_id: user.id, asset_type: f.type, content_url: f.url!, status: "pending_review", platform: null, format: null });
        }
      }
    }

    if (assetRows.length > 0) { await supabase.from("generated_assets").insert(assetRows); }
    toast.success("Campaign created");
    navigate(`/dashboard/campaigns/${campaign.id}`);
  };

  const anyUploading = files.some((f) => f.uploading);
  const canProceedStep0 = title.trim().length > 0;
  const canProceedStep1 = platforms.length > 0;
  const canProceedStep2 = contentTypes.length > 0;
  const canCreate = canProceedStep0 && canProceedStep1 && canProceedStep2 && !anyUploading && !creating;

  const handleNext = () => {
    if (step === 0 && !canProceedStep0) { toast.error("Enter a campaign name."); return; }
    if (step === 1 && !canProceedStep1) { toast.error("Select at least one platform."); return; }
    if (step === 2 && !canProceedStep2) { toast.error("Select at least one content type."); return; }
    setStep(step + 1);
  };

  // ── Left Panel (Tactical Builder) ──
  const renderLeftPanel = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </button>

        <h1 className="text-2xl font-semibold text-foreground mb-2">Create New Campaign</h1>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-border"}`} />
              <span className={`text-[10px] uppercase tracking-wider ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {/* ═══ Step 0: Details ═══ */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign-title" className="text-sm font-medium">Campaign Name</Label>
                <Input id="campaign-title" placeholder="e.g. Mother's Day Botox Promo" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-instructions" className="text-sm font-medium">What is this campaign about? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea id="campaign-instructions" placeholder="e.g. Promote our new lip filler package…" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="resize-none text-base" />
              </div>

              {/* Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Reference Images & Videos <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  {files.length >= 2 && (
                    <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                      <button type="button" onClick={() => setUploadMode("separate")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${uploadMode === "separate" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        <Image className="w-3 h-3" /> Separate
                      </button>
                      <button type="button" onClick={() => setUploadMode("grouped")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${uploadMode === "grouped" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        <Layers className="w-3 h-3" /> Grouped
                      </button>
                    </div>
                  )}
                </div>
                {files.length >= 2 && (
                  <p className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                    {uploadMode === "separate" ? "Each file will be used as a separate reference." : "All files will be combined as a grouped carousel reference."}
                  </p>
                )}

                {files.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {files.map((f) => (
                      <div key={f.id} className="relative group aspect-square rounded-lg border overflow-hidden bg-muted border-border">
                        {f.uploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : f.type === "image" && f.preview ? (
                          <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"><VideoIcon className="w-6 h-6 text-muted-foreground" /><span className="text-[9px] text-muted-foreground text-center truncate w-full">{f.file.name}</span></div>
                        )}
                        {!f.uploading && (
                          <button onClick={() => removeFile(f.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                        )}
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors">
                      <Plus className="w-4 h-4 text-muted-foreground mb-0.5" /><span className="text-[10px] text-muted-foreground font-medium">Add</span>
                      <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
                    </label>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-all ${dragOver ? "border-foreground/50 bg-secondary/80" : "border-border hover:border-foreground/30 hover:bg-secondary/50"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><Upload className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Drag & drop images or videos</p>
                      <p className="text-xs text-muted-foreground mt-1">These will guide the AI generation style</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </>
          )}

          {/* ═══ Step 1: Platforms ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Select Target Platforms</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose where you want to publish. Only selected platforms get generated content.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <AssetPlatformSelector selected={platforms} onChange={setPlatforms} assetType="image" />
              </div>
              {platforms.length > 0 && (
                <p className="text-xs text-muted-foreground">{platforms.length} format{platforms.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}

          {/* ═══ Step 2: Content Type ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Select Content Types</h2>
                <p className="text-sm text-muted-foreground mt-1">What kind of content should the AI generate?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((ct) => {
                  const info = CONTENT_TYPE_LABELS[ct];
                  const selected = contentTypes.includes(ct);
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => toggleContentType(ct)}
                      className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-foreground/20 hover:bg-secondary/50"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`p-3 rounded-full ${selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {CONTENT_TYPE_ICONS[ct]}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">{info.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{info.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ Step 3: Review ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Review & Create</h2>
                <p className="text-sm text-muted-foreground mt-1">Confirm your campaign setup before creating.</p>
              </div>

              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Campaign</p>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  {instructions && <p className="text-xs text-muted-foreground mt-1">{instructions}</p>}
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Platforms ({platforms.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {platforms.map((p) => (
                      <span key={`${p.platform}-${p.format}`} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground capitalize">
                        {p.platform} · {p.format}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Content Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contentTypes.map((ct) => (
                      <span key={ct} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground">
                        {CONTENT_TYPE_LABELS[ct].label}
                      </span>
                    ))}
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Reference Assets ({files.filter((f) => f.url).length})</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {files.filter((f) => f.url).map((f) => (
                        <div key={f.id} className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                          {f.type === "image" && f.preview ? (
                            <img src={f.preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center"><VideoIcon className="w-4 h-4 text-muted-foreground" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Total generations: {platforms.length} × {contentTypes.length} = <strong>{platforms.length * contentTypes.length}</strong> assets
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={handleCreate} disabled={!canCreate} className="gap-2">
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Create Campaign</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* LEFT: Tactical Builder */}
        {renderLeftPanel()}

        {/* RIGHT: CMO Strategy Mirror */}
        <div className="hidden lg:flex w-[420px] xl:w-[480px] border-l border-border bg-secondary/20 flex-col shrink-0">
          <CMOStrategyPanel
            brandProfile={brandProfile}
            loadingProfile={loadingProfile}
            selectedPlatforms={platforms}
            selectedContentTypes={contentTypes}
            campaignTitle={title}
            campaignInstructions={instructions}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default NewCampaign;
