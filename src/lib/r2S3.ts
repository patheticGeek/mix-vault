import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AwsClient } from "aws4fetch";

const BUCKET_NAME = "mix-vault";
const PRESIGN_EXPIRES_SECONDS = 60 * 60; // 1 hour, generous enough for a slow upload

function getClient() {
  const { env } = getCloudflareContext();
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured. Run `pnpm generate:auth-secrets` docs or see .dev.vars.example.",
    );
  }

  return {
    aws: new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    }),
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  };
}

function objectUrl(endpoint: string, key: string): string {
  return `${endpoint}/${BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  if (!match) throw new Error(`Missing <${tag}> in R2 response`);
  return match[1];
}

async function assertOk(res: Response, action: string): Promise<string> {
  const body = await res.text();
  if (!res.ok) {
    console.error(`R2 ${action} failed (${res.status}):`, body);
    throw new Error(`R2 ${action} failed`);
  }
  return body;
}

export async function createMultipartUpload(
  key: string,
  contentType: string | undefined,
): Promise<string> {
  const { aws, endpoint } = getClient();
  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;

  const res = await aws.fetch(`${objectUrl(endpoint, key)}?uploads`, {
    method: "POST",
    headers,
  });
  const body = await assertOk(res, "createMultipartUpload");
  return extractTag(body, "UploadId");
}

export async function presignUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> {
  const { aws, endpoint } = getClient();
  const url = new URL(objectUrl(endpoint, key));
  url.searchParams.set("partNumber", String(partNumber));
  url.searchParams.set("uploadId", uploadId);
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_EXPIRES_SECONDS));

  const signed = await aws.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<void> {
  const { aws, endpoint } = getClient();
  const url = new URL(objectUrl(endpoint, key));
  url.searchParams.set("uploadId", uploadId);

  const body = `<CompleteMultipartUpload>${parts
    .map(
      (part) =>
        `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${part.etag}</ETag></Part>`,
    )
    .join("")}</CompleteMultipartUpload>`;

  const res = await aws.fetch(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/xml" },
  });
  await assertOk(res, "completeMultipartUpload");
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  const { aws, endpoint } = getClient();
  const url = new URL(objectUrl(endpoint, key));
  url.searchParams.set("uploadId", uploadId);

  const res = await aws.fetch(url, { method: "DELETE" });
  await assertOk(res, "abortMultipartUpload");
}
