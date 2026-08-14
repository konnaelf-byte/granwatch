import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhotoCrop } from "./PhotoCrop";
import { useTranslation } from "react-i18next";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  name?: string;
  onUpload: (url: string) => void;
  size?: number;
}

export function PhotoUpload({ currentPhotoUrl, name, onUpload, size = 120 }: PhotoUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [preparing, setPreparing] = useState(false);

  const displayUrl = preview ?? currentPhotoUrl;

  /**
   * Decode + downscale the picked photo to a JPEG data URL BEFORE the crop
   * dialog opens. Modern phone photos can be 50–100MP or HEIF-encoded — both
   * used to hang the crop dialog on "Loading…" forever. Decoding here (with a
   * timeout and error handling) means the crop step always gets a small,
   * guaranteed-renderable JPEG.
   */
  const prepareImage = async (file: File): Promise<string> => {
    const MAX = 1600;
    const drawScaled = (src: { width: number; height: number }, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
      const scale = Math.min(1, MAX / Math.max(src.width, src.height));
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      draw(ctx, w, h);
      return canvas.toDataURL("image/jpeg", 0.9);
    };
    // Fast path: createImageBitmap (handles EXIF rotation in modern engines)
    try {
      const bmp = await createImageBitmap(file);
      try {
        return drawScaled(bmp, (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h));
      } finally {
        bmp.close();
      }
    } catch {
      // Fallback: <img> decode with a hard timeout so we never hang silently
      return await new Promise<string>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const timer = window.setTimeout(() => {
          URL.revokeObjectURL(url);
          reject(new Error("This photo is taking too long to open"));
        }, 15000);
        img.onload = () => {
          window.clearTimeout(timer);
          try {
            resolve(drawScaled(img, (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h)));
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Couldn't process this photo"));
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        img.onerror = () => {
          window.clearTimeout(timer);
          URL.revokeObjectURL(url);
          reject(new Error("Couldn't open this photo"));
        };
        img.src = url;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) { toast.error(t("elder.selectImage")); return; }
    if (file.size > 30 * 1024 * 1024) { toast.error("Photo must be under 30MB"); return; }
    setPreparing(true);
    try {
      const dataUrl = await prepareImage(file);
      setRawImageUrl(dataUrl);
      setCropOpen(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't open this photo — try a different one (JPEG or PNG works best)");
    } finally {
      setPreparing(false);
    }
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    setCropOpen(false);
    setRawImageUrl(null);
    setPreview(croppedDataUrl);
    const res = await fetch(croppedDataUrl);
    const blob = await res.blob();
    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const uploadRes = await fetch("/api/upload/photo", { method: "POST", body: formData, credentials: "include" });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = await uploadRes.json();
      onUpload(url);
      toast.success(t("photo.toastSaved"));
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => { setCropOpen(false); setRawImageUrl(null); };

  const initials = name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "G";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center cursor-pointer group"
        style={{ width: size, height: size }}
        onClick={() => fileInputRef.current?.click()}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={name ?? "Gran"} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-muted-foreground select-none" style={{ fontSize: size * 0.3 }}>{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : (
            <><Camera className="w-6 h-6 text-white mb-1" /><span className="text-white text-xs font-medium">Change photo</span></>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || preparing}>
        {uploading || preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {preparing ? t("photo.opening") : uploading ? t("photo.uploading") : displayUrl ? t("photo.changePhoto") : t("photo.uploadPhoto")}
      </Button>

      <p className="text-xs text-muted-foreground text-center">Tap to choose from your camera roll or take a photo</p>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <Dialog open={cropOpen} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("photo.positionPhoto")}</DialogTitle></DialogHeader>
          {rawImageUrl && <PhotoCrop imageUrl={rawImageUrl} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PhotoUpload;
