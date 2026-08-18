export const ResourceType = {
  DATA_ROOM: "DATA_ROOM",
  FOLDER: "FOLDER",
  FILE: "FILE",
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ShareRole = {
  VIEWER: "VIEWER",
  EDITOR: "EDITOR",
} as const;
export type ShareRole = (typeof ShareRole)[keyof typeof ShareRole];

export const GrantType = {
  PUBLIC_LINK: "PUBLIC_LINK",
  USER: "USER",
} as const;
export type GrantType = (typeof GrantType)[keyof typeof GrantType];
