import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check } from "lucide-react";

interface PhotoCropProps {
  imageUrl: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

/**
 * A simple circular crop/position tool.
 * The user can drag the image to reposition it and use +/- to zoom.
 * On confirm, we render the result to a canvas and return a data URL.
 */
export function PhotoCrop({ imageUrl, onConfirm, onCancel }: PhotoCropProps) {
  const SIZE = 260; // display size of the crop circle
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Preload the image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw to canvas whenever offset/scale changes
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const R = SIZE / 2;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.clip();

    // Fit image to circle at scale=1 (cover), then apply user scale/offset
    const baseScale = Math.max(SIZE / img.width, SIZE / img.height);
    const s = baseScale * scale;
    const iw = img.width * s;
    const ih = img.height * s;
    const dx = (SIZE - iw) / 2 + offset.x;
    const dy = (SIZE - ih) / 2 + offset.y;

    ctx.drawImage(img, dx, dy, iw, ih);
    ctx.restore();
  }, [imgLoaded, offset, scale]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.92);
    onConfirm(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Drag to reposition · Use + / − to zoom
      </p>

      {/* Circular crop preview */}
      <div
        className="relative rounded-full overflow-hidden border-4 border-primary"
        style={{ width: SIZE, height: SIZE, cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          style={{ display: "block", width: SIZE, height: SIZE }}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">Loading…</span>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-14 text-center">{Math.round(scale * 100)}%</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setScale(s => Math.min(4, s + 0.1))}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Back
        </Button>
        <Button className="flex-1 gap-2" onClick={handleConfirm} disabled={!imgLoaded}>
          <Check className="w-4 h-4" /> Use this photo
        </Button>
      </div>
    </div>
  );
}

export default PhotoCrop;
