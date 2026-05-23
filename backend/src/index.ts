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

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı." });
});

export default app;

const isVercel = Boolean(process.env.VERCEL);
if (!isVercel) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API http://0.0.0.0:${PORT}`);
    console.log(`  GET  /api/health`);
    console.log(`  GET  /api/products/search?by=&q=`);
    console.log(`  POST /api/import?replace=true`);
  });
}
