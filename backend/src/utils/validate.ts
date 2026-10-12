import type { ZodError } from 'zod';

/**
 * Converts a ZodError into a flat, frontend-friendly `{ field: message }` map.
 *
 * Zod v4 exposes `error.issues`, and each issue carries the full `path` to the
 * offending value. We take the last path segment so nested payloads still
 * produce readable keys (e.g. "status" instead of "body.status").
 *
 * Usage:
 *   const parsed = someSchema.safeParse(req.body);
 *   if (!parsed.success) {
 *     return res.status(400).json({ message: 'Invalid payload', errors: formatZodError(parsed.error) });
 *   }
 */
export const formatZodError = (error: ZodError): Record<string, string> => {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : 'root';
    // Keep the first message per field — it is always the most specific one.
    if (!formatted[field]) formatted[field] = issue.message;
  }

  return formatted;
};
