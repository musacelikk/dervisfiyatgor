import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { getAuditContext } from "../lib/auditContext";
import { logAuditFromContext } from "../services/audit";
import { parseHourMinute } from "../lib/attendance";
import {
  addClosedDay,
  getAttendanceSettings,
  getCatalogShowPrices,
  getClosedDays,
  removeClosedDay,
  setCatalogShowPrices,
  updateAttendanceSettings,
  type AttendanceSettings,
  type ClosedDayType,
} from "../services/settings";

const router = Router();

router.use(requireAdmin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseClosedDayType(value: unknown): ClosedDayType {
  return value === "half" ? "half" : "full";
}

router.get("/", async (_req, res) => {
  try {
    res.json({
      settings: {
        catalogShowPrices: await getCatalogShowPrices(),
        attendance: await getAttendanceSettings(),
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Ayarlar yüklenemedi.",
    });
  }
});

router.patch("/", async (req, res) => {
  try {
    if (typeof req.body?.catalogShowPrices === "boolean") {
      await setCatalogShowPrices(req.body.catalogShowPrices);
      logAuditFromContext(getAuditContext(req), {
        action: "settings.update",
        resourceType: "settings",
        resourceId: "catalog_show_prices",
        message: `Satış kataloğu fiyatları ${req.body.catalogShowPrices ? "açıldı" : "gizlendi"}.`,
        metadata: { catalogShowPrices: req.body.catalogShowPrices },
      });
    }

    const attendance = req.body?.attendance;
    if (attendance && typeof attendance === "object") {
      const updates: Partial<AttendanceSettings> = {};
      if (attendance.shift1LateAfter !== undefined) {
        if (!parseHourMinute(attendance.shift1LateAfter)) {
          res.status(400).json({ error: "1. vardiya saati SS:DD biçiminde olmalı." });
          return;
        }
        updates.shift1LateAfter = attendance.shift1LateAfter;
      }
      if (attendance.shift2LateAfter !== undefined) {
        if (!parseHourMinute(attendance.shift2LateAfter)) {
          res.status(400).json({ error: "2. vardiya saati SS:DD biçiminde olmalı." });
          return;
        }
        updates.shift2LateAfter = attendance.shift2LateAfter;
      }
      if (attendance.weeklyOffDays !== undefined) {
        if (!Array.isArray(attendance.weeklyOffDays)) {
          res.status(400).json({ error: "Haftalık izin günleri liste olmalı." });
          return;
        }
        updates.weeklyOffDays = attendance.weeklyOffDays;
      }
      if (Object.keys(updates).length > 0) {
        const saved = await updateAttendanceSettings(updates);
        logAuditFromContext(getAuditContext(req), {
          action: "settings.update",
          resourceType: "settings",
          resourceId: "attendance_settings",
          message: `Yoklama ayarları güncellendi (1. vardiya ${saved.shift1LateAfter}, 2. vardiya ${saved.shift2LateAfter}).`,
          metadata: { ...saved },
        });
      }
    }

    res.json({
      settings: {
        catalogShowPrices: await getCatalogShowPrices(),
        attendance: await getAttendanceSettings(),
      },
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Ayar kaydedilemedi.",
    });
  }
});

router.get("/closed-days", async (_req, res) => {
  try {
    res.json({ closedDays: await getClosedDays() });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "İzinli günler yüklenemedi.",
    });
  }
});

router.post("/closed-days", async (req, res) => {
  const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
  const note = typeof req.body?.note === "string" ? req.body.note : null;
  const type = parseClosedDayType(req.body?.type);
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "Tarih formatı YYYY-MM-DD olmalı." });
    return;
  }
  try {
    const closedDays = await addClosedDay(date, note, type);
    logAuditFromContext(getAuditContext(req), {
      action: "settings.update",
      resourceType: "settings",
      resourceId: "shop_closed_days",
      message: `İzinli gün eklendi: ${date} (${type === "half" ? "yarım gün" : "tam gün"})`,
      metadata: { date, note, type },
    });
    res.status(201).json({ closedDays });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "İzinli gün eklenemedi.",
    });
  }
});

router.delete("/closed-days/:date", async (req, res) => {
  const date = req.params.date;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "Tarih formatı YYYY-MM-DD olmalı." });
    return;
  }
  try {
    const closedDays = await removeClosedDay(date);
    logAuditFromContext(getAuditContext(req), {
      action: "settings.update",
      resourceType: "settings",
      resourceId: "shop_closed_days",
      message: `İzinli gün kaldırıldı: ${date}`,
      metadata: { date },
    });
    res.json({ closedDays });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "İzinli gün kaldırılamadı.",
    });
  }
});

export default router;
