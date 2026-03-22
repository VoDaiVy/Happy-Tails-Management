export interface CameraItem {
  _id?: string;
  id?: string;
  cameraName?: string;
  name?: string;
  position?: string;
  resolution?: string;
  streamUrl?: string;
  cameraType?: string;
  isOnline?: boolean;
  isActive?: boolean;
}

export interface CameraAccessSession {
  accessToken: string;
  expiresAt?: string;
  cameras: CameraItem[];
}
