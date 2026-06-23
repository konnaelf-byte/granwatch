/**
 * CareSchedulePanel — Gran+ feature.
 *
 * Shows routine tracking and appointment management.
 * Rendered inside the "Care" tab on ElderProfile (Gran+ subscribers only).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Pill, CheckCircle2, XCircle, Plus, Trash2,
  Stethoscope, CalendarCheck, Clock
} from "lucide-react";

interface Props {
  elderId: number;
  isAdmin: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  twice_daily: "Twice daily",
  weekly: "Weekly",
  as_needed: "As needed",
};

export function CareSchedulePanel({ elderId, isAdmin }: Props) {
  const utils = trpc.useUtils();

  // ── Medication state ───────────────────────────────────────────────────────
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [medFrequency, setMedFrequency] = useState<"daily" | "twice_daily" | "weekly" | "as_needed">("daily");
  const [medNotes, setMedNotes] = useState("");

  // ── Appointment state ──────────────────────────────────────────────────────
  const [addApptOpen, setAddApptOpen] = useState(false);
  const [apptTitle, setApptTitle] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptLocation, setApptLocation] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: medications = [], isLoading: medsLoading } =
    trpc.care.medications.list.useQuery({ elderId });

  const { data: appointments = [], isLoading: apptsLoading } =
    trpc.care.appointments.list.useQuery({ elderId });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addMed = trpc.care.medications.add.useMutation({
    onSuccess: () => {
      toast.success("Routine added");
      utils.care.medications.list.invalidate({ elderId });
      setAddMedOpen(false);
      setMedName(""); setMedNotes(""); setMedFrequency("daily");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMed = trpc.care.medications.remove.useMutation({
    onSuccess: () => {
      toast.success("Routine removed");
      utils.care.medications.list.invalidate({ elderId });
    },
    onError: (e) => toast.error(e.message),
  });

  const logMed = trpc.care.medications.logToday.useMutation({
    onSuccess: () => utils.care.medications.list.invalidate({ elderId }),
    onError: (e) => toast.error(e.message),
  });

  const addAppt = trpc.care.appointments.add.useMutation({
    onSuccess: () => {
      toast.success("Appointment added");
      utils.care.appointments.list.invalidate({ elderId });
      setAddApptOpen(false);
      setApptTitle(""); setApptDoctor(""); setApptLocation("");
      setApptDate(""); setApptTime(""); setApptNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const completeAppt = trpc.care.appointments.complete.useMutation({
    onSuccess: () => {
      toast.success("Appointment marked as done ✓");
      utils.care.appointments.list.invalidate({ elderId });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeAppt = trpc.care.appointments.remove.useMutation({
    onSuccess: () => {
      toast.success("Appointment removed");
      utils.care.appointments.list.invalidate({ elderId });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const upcomingAppts = appointments.filter((a: any) => !a.completedAt);
  const pastAppts = appointments.filter((a: any) => !!a.completedAt);

  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const fmtTime = (d: string | Date) =>
    new Date(d).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">

      {/* ── MEDICATIONS ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Routines</h3>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setAddMedOpen(true)} className="text-primary h-8 px-2">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {medsLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : medications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-xl">
            <Pill className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No routines added yet.</p>
            {isAdmin && (
              <Button variant="link" size="sm" onClick={() => setAddMedOpen(true)}>
                Add the first one
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {medications.map((med: any) => (
              <div key={med.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{med.name}</p>
                      {med.dosage && (
                        <span className="text-xs text-muted-foreground">{med.dosage}</span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {FREQUENCY_LABELS[med.frequency]}
                      </Badge>
                    </div>
                    {med.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{med.notes}"</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                      onClick={() => removeMed.mutate({ medicationId: med.id, elderId })}
                      aria-label={`Remove ${med.name} from care schedule`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                {/* Today's status */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={med.todayStatus === "taken" ? "default" : "outline"}
                    className="flex-1 h-9"
                    onClick={() => logMed.mutate({ medicationId: med.id, elderId, status: "taken" })}
                    disabled={logMed.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {med.todayStatus === "taken" ? "Taken ✓" : "Mark taken"}
                  </Button>
                  <Button
                    size="sm"
                    variant={med.todayStatus === "missed" ? "destructive" : "ghost"}
                    className="h-9 px-3"
                    onClick={() => logMed.mutate({ medicationId: med.id, elderId, status: "missed" })}
                    disabled={logMed.isPending}
                    aria-label={med.todayStatus === "missed" ? "Routine missed ✗" : "Mark as missed"}
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── APPOINTMENTS ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Appointments</h3>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setAddApptOpen(true)} className="text-primary h-8 px-2">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {apptsLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : upcomingAppts.length === 0 && pastAppts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-xl">
            <Stethoscope className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No appointments added yet.</p>
            {isAdmin && (
              <Button variant="link" size="sm" onClick={() => setAddApptOpen(true)}>
                Add one
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAppts.map((appt: any) => (
              <div key={appt.id} className="bg-card border border-primary/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{appt.title}</p>
                    {appt.doctorName && (
                      <p className="text-xs text-muted-foreground mt-0.5">Dr {appt.doctorName}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <p className="text-xs text-primary font-medium">
                        {fmtDate(appt.scheduledAt)} at {fmtTime(appt.scheduledAt)}
                      </p>
                    </div>
                    {appt.location && (
                      <p className="text-xs text-muted-foreground mt-0.5">📍 {appt.location}</p>
                    )}
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">"{appt.notes}"</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                      onClick={() => removeAppt.mutate({ appointmentId: appt.id, elderId })}
                      aria-label={`Remove appointment: ${appt.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3 h-9"
                  onClick={() => completeAppt.mutate({ appointmentId: appt.id, elderId })}
                  disabled={completeAppt.isPending}
                >
                  <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                  Mark as attended
                </Button>
              </div>
            ))}

            {pastAppts.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium pt-2 pb-1">Past appointments</p>
                {pastAppts.map((appt: any) => (
                  <div key={appt.id} className="bg-card border rounded-xl p-4 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <p className="font-semibold text-sm text-foreground">{appt.title}</p>
                        </div>
                        {appt.doctorName && (
                          <p className="text-xs text-muted-foreground mt-0.5">Dr {appt.doctorName}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(appt.scheduledAt)}</p>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={() => removeAppt.mutate({ appointmentId: appt.id, elderId })}
                          aria-label={`Remove past appointment: ${appt.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── ADD MEDICATION DIALOG ─────────────────────────────────────────── */}
      <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-primary" />
              Add Routine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Routine name *</p>
              <Input
                placeholder="e.g. Medication, Blood pressure check, Physio stretches"
                value={medName}
                onChange={e => setMedName(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Frequency</p>
              <Select value={medFrequency} onValueChange={(v: any) => setMedFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Notes (optional)</p>
              <Textarea
                placeholder="e.g. Take with food"
                value={medNotes}
                onChange={e => setMedNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => addMed.mutate({ elderId, name: medName, frequency: medFrequency, notes: medNotes || undefined })}
              disabled={!medName.trim() || addMed.isPending}
            >
              {addMed.isPending ? "Adding…" : "Add routine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD APPOINTMENT DIALOG ────────────────────────────────────────── */}
      <Dialog open={addApptOpen} onOpenChange={setAddApptOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Add Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Title *</p>
              <Input
                placeholder="e.g. Doctor's Appointment, Physio, Hairdresser"
                value={apptTitle}
                onChange={e => setApptTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Date *</p>
                <Input
                  type="date"
                  value={apptDate}
                  onChange={e => setApptDate(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Time</p>
                <Input
                  type="time"
                  value={apptTime}
                  onChange={e => setApptTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Doctor name</p>
              <Input
                placeholder="e.g. Dr Smith"
                value={apptDoctor}
                onChange={e => setApptDoctor(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Location</p>
              <Input
                placeholder="e.g. City Hospital, Room 4"
                value={apptLocation}
                onChange={e => setApptLocation(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Notes</p>
              <Textarea
                placeholder="Bring ID and medical aid card…"
                value={apptNotes}
                onChange={e => setApptNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (!apptDate) { toast.error("Please pick a date"); return; }
                const dt = new Date(`${apptDate}T${apptTime || "09:00"}`);
                addAppt.mutate({
                  elderId,
                  title: apptTitle,
                  doctorName: apptDoctor || undefined,
                  location: apptLocation || undefined,
                  scheduledAt: dt.toISOString(),
                  notes: apptNotes || undefined,
                });
              }}
              disabled={!apptTitle.trim() || !apptDate || addAppt.isPending}
            >
              {addAppt.isPending ? "Adding…" : "Add appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
