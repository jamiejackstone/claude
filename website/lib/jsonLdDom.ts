export function upsertJsonLd(id: string, data: Record<string, unknown> | null): void {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement('script');
  script.id = id;
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}
