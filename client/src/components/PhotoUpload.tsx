import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhotoCrop } from "./PhotoCrop";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  name?: string;
  onUpload: (url: string) => void;
  size?: number;
}

export function PhotoUpload({ currentPhotoUrl, name, onUpload, size = 120 }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const displayUrl = preview ?? currentPhotoUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Photo must be under 10MB"); return; }
    const localUrl = URL.createObjectURL(file);
    setRawImageUrl(localUrl);
    setCropOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      toast.success("Photo saved!");
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

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Uploading..." : displayUrl ? "Change photo" : "Upload photo"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">Tap to choose from your camera roll or take a photo</p>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <Dialog open={cropOpen} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Position photo</DialogTitle></DialogHeader>
          {rawImageUrl && <PhotoCrop imageUrl={rawImageUrl} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PhotoUpload;
