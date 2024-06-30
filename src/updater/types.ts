export type VersionList = {
  windows: VersionEntry;
  linux: VersionEntry;
}
export interface VersionEntry {
  stable: string;
  preview: string;
  versions: string[];
  preview_versions: string[];
}