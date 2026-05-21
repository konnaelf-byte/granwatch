import type { Express, Request, Response } from "express";
import { storagePut } from "./storage";
import { authenticateRequest } from "./_core/sdk";

// Simple multipart upload route for gran profile photos
// POST /api/upload/photo
// Body: multipart/form-data with field "photo" (image file)
// Returns: { url: string }

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload/photo", async (req: Request, res: Response) => {
    try {
      // Authenticate request
      const user = await authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Parse multipart manually using built-in Node.js streams
      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.includes("multipart/form-data")) {
        res.status(400).json({ error: "Expected multipart/form-data" });
        return;
      }

      // Extract boundary
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) {
        res.status(400).json({ error: "Missing boundary" });
        return;
      }
      const boundary = boundaryMatch[1];

      // Read raw body
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", resolve);
        req.on("error", reject);
      });
      const rawBody = Buffer.concat(chunks);

      // Parse the multipart body to extract the file
      const parsed = parseMultipart(rawBody, boundary);
      const filePart = parsed.find(p => p.name === "photo");

      if (!filePart) {
        res.status(400).json({ error: "No photo field found" });
        return;
      }

      // Validate file size (max 5MB)
      if (filePart.data.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: "Photo must be under 5MB" });
        return;
      }

      // Validate content type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(filePart.contentType)) {
        res.status(400).json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" });
        return;
      }

      const ext = filePart.contentType.split("/")[1].replace("jpeg", "jpg");
      const key = `gran-photos/${user.id}/photo.${ext}`;

      const { url } = await storagePut(key, filePart.data, filePart.contentType);

      res.json({ url });
    } catch (err: any) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: err.message ?? "Upload failed" });
    }
  });
}

// ─── Minimal multipart parser ──────────────────────────────────────────────

interface MultipartPart {
  name: string;
  filename?: string;
  contentType: string;
  data: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const delimiter = Buffer.from(`--${boundary}`);
  const finalDelimiter = Buffer.from(`--${boundary}--`);

  let offset = 0;

  while (offset < body.length) {
    // Find next delimiter
    const delimPos = indexOf(body, delimiter, offset);
    if (delimPos === -1) break;

    offset = delimPos + delimiter.length;

    // Check for final delimiter
    if (body.slice(offset, offset + 2).toString() === "--") break;

    // Skip CRLF after delimiter
    if (body.slice(offset, offset + 2).toString() === "\r\n") offset += 2;

    // Find end of headers (double CRLF)
    const headerEnd = indexOf(body, Buffer.from("\r\n\r\n"), offset);
    if (headerEnd === -1) break;

    const headerSection = body.slice(offset, headerEnd).toString("utf8");
    offset = headerEnd + 4;

    // Find next delimiter to get data end
    const nextDelim = indexOf(body, delimiter, offset);
    const dataEnd = nextDelim === -1 ? body.length : nextDelim - 2; // -2 for CRLF before delimiter

    const data = body.slice(offset, dataEnd);
    offset = nextDelim === -1 ? body.length : nextDelim;

    // Parse headers
    const headers: Record<string, string> = {};
    for (const line of headerSection.split("\r\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        headers[line.slice(0, colonIdx).trim().toLowerCase()] = line.slice(colonIdx + 1).trim();
      }
    }

    const disposition = headers["content-disposition"] ?? "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const contentType = headers["content-type"] ?? "application/octet-stream";

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch?.[1],
        contentType,
        data,
      });
    }
  }

  return parts;
}

function indexOf(haystack: Buffer, needle: Buffer, start = 0): number {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}
