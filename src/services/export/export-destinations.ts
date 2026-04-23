export type ExportDestinationId = "local" | "google-drive" | "onedrive" | "email";

export type ExportDestination = {
  id: ExportDestinationId;
  labelKey: string;
  description: string;
  configured: boolean;
  setupRequired: boolean;
};

export const EXPORT_DESTINATIONS: ExportDestination[] = [
  {
    id: "local",
    labelKey: "workspace.exportLocal",
    description: "Download the processed image to the current workstation.",
    configured: true,
    setupRequired: false,
  },
  {
    id: "google-drive",
    labelKey: "workspace.exportGoogleDrive",
    description: "Future Google Drive upload destination via Google OAuth.",
    configured: false,
    setupRequired: true,
  },
  {
    id: "onedrive",
    labelKey: "workspace.exportOneDrive",
    description: "Future OneDrive upload destination via Microsoft Graph.",
    configured: false,
    setupRequired: true,
  },
  {
    id: "email",
    labelKey: "workspace.exportEmail",
    description: "Future Gmail or Outlook delivery destination.",
    configured: false,
    setupRequired: true,
  },
];

export function getExportDestination(
  id: ExportDestinationId
): ExportDestination | undefined {
  return EXPORT_DESTINATIONS.find((destination) => destination.id === id);
}

export function normalizeExportDestination(value: unknown): ExportDestinationId {
  return EXPORT_DESTINATIONS.some((destination) => destination.id === value)
    ? (value as ExportDestinationId)
    : "local";
}
