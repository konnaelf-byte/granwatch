import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Heart, Cake, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import StatusRing from "@/components/StatusRing";
import { PhotoUpload } from "@/components/PhotoUpload";
import { BirthdayPicker } from "@/components/BirthdayPicker";
import { COUNTRIES } from "@/lib/countries";
import { useTranslation } from "react-i18next";

export default function CreateElder() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [threshold, setThreshold] = useState(21);
  const [birthdayInput, setBirthdayInput] = useState(""); // full date string from <input type="date">
  const [country, setCountry] = useState(""); // ISO alpha-2 — for gift-delivery partners
  const [city, setCity] = useState("");

  const createElder = trpc.elders.create.useMutation({
    onSuccess: (elder) => {
      toast.success(t("create.toastCreated", { name: elder?.name }));
      navigate(`/elder/${elder?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("create.errName"));
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
      country: country || undefined,
      city: city.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold text-foreground">{t("dashboard.addGran")}</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {/* Live preview ring */}
        <div className="flex justify-center mb-8">
          <StatusRing
            photoUrl={photoUrl || null}
            name={name || t("create.defaultGran")}
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
              name={name || t("create.defaultGran")}
              onUpload={(url) => setPhotoUrl(url)}
              size={100}
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">{t("create.granName")}</Label>
            <Input
              id="name"
              placeholder={t("create.namePlaceholder")}
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12 text-base"
              // No autoFocus: on iOS the focused input + open keyboard broke
              // every dropdown below it (birthday picker taps ignored —
              // field report 2026-08-09). Auto-popping the keyboard on page
              // load was dubious mobile UX anyway.
            />
          </div>

          {/* Birthday */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Cake className="w-4 h-4 text-primary" />
              {t("create.granBirthday")} <span className="font-normal text-muted-foreground">{t("common.optional")}</span>
            </Label>
            <BirthdayPicker value={birthdayInput} onChange={setBirthdayInput} />
            <p className="text-xs text-muted-foreground">{t("create.bdayHelp")}</p>
          </div>

          {/* Location — for gift/flower delivery partners */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {t("create.whereLive")} <span className="font-normal text-muted-foreground">{t("common.optional")}</span>
            </Label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("create.selectCountry")}</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <Input
              placeholder={t("create.cityPlaceholder")}
              value={city}
              onChange={e => setCity(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">{t("create.locationHelp")}</p>
          </div>

          {/* Alert threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("create.alertAfter")}</Label>
              <span className="text-primary font-bold text-sm">{t("create.daysValue", { count: threshold })}</span>
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
              <span>{t("create.days7")}</span>
              <span>{t("create.days60")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("create.alertHelp", { name: name || t("create.defaultGran"), count: threshold })}
            </p>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-14 text-base font-semibold mt-4"
            onClick={handleSubmit}
            disabled={createElder.isPending || !name.trim()}
          >
            <Heart className="w-5 h-5 mr-2 fill-current" />
            {createElder.isPending ? t("create.creating") : t("create.createProfile", { name: name || t("create.defaultGran") })}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("create.inviteAfter")}
          </p>
        </div>
      </main>
    </div>
  );
}
