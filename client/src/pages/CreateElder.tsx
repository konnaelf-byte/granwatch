import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Heart, Cake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import StatusRing from "@/components/StatusRing";
import { PhotoUpload } from "@/components/PhotoUpload";

export default function CreateElder() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [threshold, setThreshold] = useState(21);
  const [birthdayInput, setBirthdayInput] = useState(""); // full date string from <input type="date">

  const createElder = trpc.elders.create.useMutation({
    onSuccess: (elder) => {
      toast.success(`${elder?.name}'s profile created! 💚`);
      navigate(`/elder/${elder?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    // <input type="date"> already yields "YYYY-MM-DD" — exactly what the server
    // requires. (A legacy .slice(5) here sent "MM-DD" and failed validation.)
    const birthday = birthdayInput || undefined;
    createElder.mutate({
      name: name.trim(),
      photoUrl: photoUrl.trim() || undefined,
      alertThresholdDays: threshold,
      birthday,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold text-foreground">Add a Gran</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {/* Live preview ring */}
        <div className="flex justify-center mb-8">
          <StatusRing
            photoUrl={photoUrl || null}
            name={name || "Gran"}
            daysSinceVisit={0}
            status="green"
            size={140}
          />
        </div>

        <div className="space-y-6">
          {/* Photo upload */}
          <div className="flex justify-center">
            <PhotoUpload
              currentPhotoUrl={photoUrl || null}
              name={name || "Gran"}
              onUpload={(url) => setPhotoUrl(url)}
              size={100}
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Gran's name</Label>
            <Input
              id="name"
              placeholder="e.g. Dorothy, Nana, Ouma..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12 text-base"
              autoFocus
            />
          </div>

          {/* Birthday */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Cake className="w-4 h-4 text-primary" />
              Gran's birthday <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="date"
              value={birthdayInput}
              onChange={e => setBirthdayInput(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">The whole family gets a reminder 3 days before her birthday.</p>
          </div>

          {/* Alert threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Alert after</Label>
              <span className="text-primary font-bold text-sm">{threshold} days</span>
            </div>
            <Slider
              min={7}
              max={60}
              step={1}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>7 days</span>
              <span>60 days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The whole family gets an alert if {name || "Gran"} goes {threshold} days without a visitor.
            </p>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-14 text-base font-semibold mt-4"
            onClick={handleSubmit}
            disabled={createElder.isPending || !name.trim()}
          >
            <Heart className="w-5 h-5 mr-2 fill-current" />
            {createElder.isPending ? "Creating..." : `Create ${name || "Gran"}'s Profile`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            You'll get an invite code to share with the family after creating the profile.
          </p>
        </div>
      </main>
    </div>
  );
}
