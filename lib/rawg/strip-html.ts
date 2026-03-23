/** Remove tags HTML simples da descrição RAWG (description_raw). */
export function stripHtml(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
