export type ServerBuildInfo = {
  windows: VersionList;
  linux: VersionList;
}

export interface VersionList {
  stable: string;
  preview: string;
  versions: string[];
  preview_versions: string[];
}

export interface VersionInfo {
  version: string;
  isPreview?: boolean;
}