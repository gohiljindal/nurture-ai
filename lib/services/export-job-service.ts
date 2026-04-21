import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { prisma } from "@/lib/prisma";

function toDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

async function buildGrowthPdf(jobId: string, userId: string): Promise<Uint8Array> {
  const rows = await prisma.growthMeasurement.findMany({
    where: { child: { userId } },
    orderBy: { measuredAt: "desc" },
    take: 80,
    include: { child: { select: { name: true } } },
  });
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("NurtureAI Growth Export", { x: 50, y: 800, size: 18, font, color: rgb(0.1, 0.15, 0.2) });
  page.drawText(`Job ${jobId}`, { x: 50, y: 780, size: 10, font });
  let y = 760;
  for (const r of rows) {
    if (y < 50) break;
    page.drawText(
      `${r.child.name} · ${toDateLabel(r.measuredAt.toISOString())} · ${r.weightKg ?? "-"}kg · ${r.heightCm ?? "-"}cm · ${r.headCm ?? "-"}cm hc`,
      { x: 50, y, size: 9, font }
    );
    y -= 12;
  }
  return pdf.save();
}

async function buildTimelinePdf(jobId: string, userId: string): Promise<Uint8Array> {
  const checks = await prisma.symptomCheck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { child: { select: { name: true } } },
  });
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("NurtureAI Timeline Export", { x: 50, y: 800, size: 18, font, color: rgb(0.1, 0.15, 0.2) });
  page.drawText(`Job ${jobId}`, { x: 50, y: 780, size: 10, font });
  let y = 760;
  for (const c of checks) {
    if (y < 50) break;
    page.drawText(
      `${toDateLabel(c.createdAt.toISOString())} · ${c.child.name} · ${c.urgency} · ${c.inputText.slice(0, 70)}`,
      { x: 50, y, size: 9, font }
    );
    y -= 12;
  }
  return pdf.save();
}

function publicBaseUrl(): string {
  const configured = process.env.EXPORT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function processExportJob(jobId: string, userId: string): Promise<{
  ok: true;
  storageUrl: string;
} | {
  ok: false;
  error: string;
}> {
  const job = await prisma.exportJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return { ok: false, error: "Job not found." };

  try {
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "processing", errorMessage: null },
    });

    const bytes =
      job.kind === "pdf_growth"
        ? await buildGrowthPdf(job.id, userId)
        : await buildTimelinePdf(job.id, userId);

    const outDir = path.join(process.cwd(), "public", "exports");
    await mkdir(outDir, { recursive: true });
    const fileName = `${job.id}.pdf`;
    const fullPath = path.join(outDir, fileName);
    await writeFile(fullPath, Buffer.from(bytes));

    const storageUrl = `${publicBaseUrl()}/exports/${fileName}`;
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "completed", storageUrl, errorMessage: null },
    });
    return { ok: true, storageUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed.";
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: message },
    });
    return { ok: false, error: message };
  }
}
