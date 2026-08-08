import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import {
  adminCreateEntry,
  adminDeleteEntry,
  adminUpdateEntry,
  getAttendanceReport,
  getAttendanceSummary,
  getEmployeeAttendanceDetail,
  listAttendance,
} from "../services/shifts";
import {
  halfDayCutoff,
  isAttendanceStatus,
  istanbulDateTimeToUtc,
  type AttendanceStatusOrAbsent,
} from "../lib/attendance";
import { getAttendanceSettings } from "../services/settings";
import { getShopLocation, getShopRadiusMeters, istanbulDateString } from "../lib/sunset";

const router = Router();

router.use(requireAdmin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown, fallback: string): string {
  return typeof value === "string" && DATE_RE.test(value) ? value : fallback;
}

function parseStatusFilter(value: unknown): AttendanceStatusOrAbsent | undefined {
  if (value === "full" || value === "half" || value === "absent" || value === "off") return value;
  return undefined;
}

/** Yoklama listesi — her (personel, gün) için Tam/Yarım/Gelmedi. */
router.get("/", async (req, res) => {
  const today = istanbulDateString();
  const from = parseDate(req.query.from, today);
  const to = parseDate(req.query.to, today);
  const employeeIdRaw = Number(req.query.employeeId);
  const employeeId = Number.isFinite(employeeIdRaw) && employeeIdRaw > 0 ? employeeIdRaw : undefined;

  try {
    const rows = await listAttendance({
      from,
      to,
      employeeId,
      status: parseStatusFilter(req.query.status),
    });
    res.json({
      rows,
      from,
      to,
      cutoff: halfDayCutoff().label,
      attendanceSettings: await getAttendanceSettings(),
      shopLocation: getShopLocation(),
      radiusM: getShopRadiusMeters(),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Yoklama yüklenemedi.",
    });
  }
});

/** Dashboard kartları — bugünün özeti. */
router.get("/summary", async (req, res) => {
  try {
    const workDate = parseDate(req.query.date, istanbulDateString());
    res.json({ summary: await getAttendanceSummary(workDate) });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Özet yüklenemedi.",
    });
  }
});

/** Haftalık / aylık rapor. */
router.get("/report", async (req, res) => {
  const today = istanbulDateString();
  const from = parseDate(req.query.from, today);
  const to = parseDate(req.query.to, today);
  const employeeIdRaw = Number(req.query.employeeId);
  const employeeId = Number.isFinite(employeeIdRaw) && employeeIdRaw > 0 ? employeeIdRaw : undefined;

  try {
    res.json({ report: await getAttendanceReport(from, to, employeeId) });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Rapor yüklenemedi.",
    });
  }
});

/** Tek personelin takvim detayı — gün gün durum + aylık özet. */
router.get("/employee/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isFinite(employeeId) || employeeId < 1) {
    res.status(400).json({ error: "Geçersiz personel id." });
    return;
  }

  const today = istanbulDateString();
  const from = parseDate(req.query.from, today.slice(0, 8) + "01");
  const to = parseDate(req.query.to, today);

  try {
    res.json({ detail: await getEmployeeAttendanceDetail(employeeId, from, to) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Personel yoklaması yüklenemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 500).json({ error: message });
  }
});

/** Gelmedi → Tam/Yarım Gün: elle kayıt açma. */
router.post("/", async (req, res) => {
  const employeeId = Number(req.body?.employeeId);
  const workDate = typeof req.body?.workDate === "string" ? req.body.workDate.trim() : "";
  const status = req.body?.status;
  const time = typeof req.body?.time === "string" ? req.body.time.trim() : "";
  const note = typeof req.body?.note === "string" ? req.body.note : null;

  if (!Number.isFinite(employeeId) || employeeId < 1) {
    res.status(400).json({ error: "Personel seçilmedi." });
    return;
  }
  if (!DATE_RE.test(workDate)) {
    res.status(400).json({ error: "Tarih formatı YYYY-MM-DD olmalı." });
    return;
  }
  if (!isAttendanceStatus(status)) {
    res.status(400).json({ error: "Durum 'full' veya 'half' olmalı." });
    return;
  }

  try {
    const defaultTime = status === "full" ? "09:00" : halfDayCutoff().label;
    const checkInAt = istanbulDateTimeToUtc(workDate, time || defaultTime);
    const entry = await adminCreateEntry({
      employeeId,
      workDate,
      checkInAt,
      status,
      note,
      createdBy: "admin",
    });
    logAuditFromContext(getAuditContext(req), {
      action: "shift.admin_create",
      resourceType: "shift",
      resourceId: String(entry.id),
      message: `Yoklama kaydı eklendi: ${entry.employeeName ?? employeeId} (${workDate})`,
      metadata: { workDate, status },
    });
    res.status(201).json({ entry });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Kayıt eklenemedi.",
    });
  }
});

/** Giriş saati / durum / açıklama düzenleme. */
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }

  const body = req.body ?? {};
  const updates: Parameters<typeof adminUpdateEntry>[1] = {};

  try {
    if (typeof body.time === "string" && body.time.trim()) {
      const workDate =
        typeof body.workDate === "string" && DATE_RE.test(body.workDate)
          ? body.workDate
          : null;
      if (!workDate) {
        res.status(400).json({ error: "Saat değişikliği için workDate gerekli." });
        return;
      }
      updates.checkInAt = istanbulDateTimeToUtc(workDate, body.time.trim());
    }
    if (body.status !== undefined) {
      if (!isAttendanceStatus(body.status)) {
        res.status(400).json({ error: "Durum 'full' veya 'half' olmalı." });
        return;
      }
      updates.status = body.status;
    }
    if (body.note !== undefined) {
      updates.note = typeof body.note === "string" ? body.note : null;
    }

    const entry = await adminUpdateEntry(id, updates);
    logAuditFromContext(getAuditContext(req), {
      action: "shift.admin_update",
      resourceType: "shift",
      resourceId: String(id),
      message: `Yoklama kaydı güncellendi: ${entry.employeeName ?? entry.employeeId} (${entry.workDate})`,
      metadata: { fields: Object.keys(updates) },
    });
    res.json({ entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncellenemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz id." });
    return;
  }
  try {
    const removed = await adminDeleteEntry(id);
    logAuditFromContext(getAuditContext(req), {
      action: "shift.admin_delete",
      resourceType: "shift",
      resourceId: String(id),
      message: `Yoklama kaydı silindi: ${removed.employeeName ?? removed.employeeId} (${removed.workDate})`,
    });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silinemedi.";
    res.status(message.includes("bulunamadı") ? 404 : 400).json({ error: message });
  }
});

export default router;
