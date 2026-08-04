import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const loaded = dotenv.config({ path: envPath });
if (!loaded.parsed || Object.keys(loaded.parsed).length === 0) {
  dotenv.config({ path: path.join(__dirname, "../.env") });
}
if (!process.env.ADMIN_SECRET) {
  console.warn(
    `UYARI: ADMIN_SECRET yok. "${envPath}" dosyasını kontrol edip backend'i yeniden başlatın.`
  );
}

import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import productsRouter from "./routes/products";
import importRouter from "./routes/import";
import exportRouter from "./routes/export";
import adminProductsRouter from "./routes/adminProducts";
import employeesRouter from "./routes/employees";
import employeeAuthRouter from "./routes/employeeAuth";
import adminAuthRouter from "./routes/adminAuth";
import adminOrdersRouter from "./routes/adminOrders";
import adminAuditRouter from "./routes/adminAudit";
import adminExpensesRouter from "./routes/adminExpenses";
import productImagesRouter from "./routes/productImages";
import stockCountRouter from "./routes/stockCount";
import ordersRouter from "./routes/orders";
import shiftRouter from "./routes/shift";
import adminShiftsRouter from "./routes/adminShifts";
import adminSettingsRouter from "./routes/adminSettings";
import { initDatabase, isPostgres } from "./lib/database";
import { scheduleProductNormBackfill } from "./lib/backfillProductNorms";
import { closeExpiredShiftEntries } from "./services/shifts";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/products", productsRouter);
app.use("/api/import", importRouter);
app.use("/api/export", exportRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/audit", adminAuditRouter);
app.use("/api/admin/expenses", adminExpensesRouter);
app.use("/api/admin/product-images", productImagesRouter);
app.use("/api/admin/stock-count", stockCountRouter);
app.use("/api/auth/employee", employeeAuthRouter);
app.use("/api/auth/admin", adminAuthRouter);
app.use("/api/shift", shiftRouter);
app.use("/api/admin/shifts", adminShiftsRouter);
app.use("/api/admin/settings", adminSettingsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı." });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("İşlenmemiş route hatası:", err);
    if (res.headersSent) return;
    res.status(500).json({
      error: err instanceof Error ? err.message : "Sunucu hatası.",
    });
  }
);

export default app;

const isVercel = Boolean(process.env.VERCEL);
if (!isVercel) {
  initDatabase()
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        const authOk = Boolean(process.env.ADMIN_SECRET);
        const dbMode = isPostgres() ? "PostgreSQL" : "SQLite";
        console.log(
          `API http://localhost:${PORT} (ADMIN_SECRET: ${authOk ? "ok" : "eksik"}, DB: ${dbMode})`
        );
        scheduleProductNormBackfill();
        closeExpiredShiftEntries().catch((err) =>
          console.error("Mesai süpürme hatası:", err)
        );
        setInterval(() => {
          closeExpiredShiftEntries().catch((err) =>
            console.error("Mesai süpürme hatası:", err)
          );
        }, 15 * 60 * 1000);
      });
    })
    .catch((err) => {
      console.error("Veritabanı başlatılamadı:", err);
      process.exit(1);
    });
}
