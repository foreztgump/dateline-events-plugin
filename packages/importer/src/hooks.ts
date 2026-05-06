export function afterSave(event: { collection: string }): void {
  if (event.collection !== "dateline_importer_settings") return;
}
