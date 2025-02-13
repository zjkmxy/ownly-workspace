export type IWorkspace = {
  /** Readable label for the space */
  label: string;
  /** Data prefix of the space */
  name: string;
  /** Is the current user the owner */
  owner: boolean;
};

export type IChatMessage = {
  /** Unique ID for each message */
  uuid: number;
  /** User who sent the message */
  user: string;
  /** Timestamp when the message was sent */
  ts: number;
  /** Message content */
  message: string;

  /** Cached time string (too expensive) */
  tsStr?: string;
};

export type IChatChannel = {
  /** Channel ID */
  id: number;
  /** Channel name */
  name: string;
};

export type IProject = {
  /** Project ID */
  id: number;
  /** Project name */
  name: string;
};

export type IProjectFile = {
  /** Full path of file */
  path: string;
};
