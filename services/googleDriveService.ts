
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const FOLDER_NAME = 'Artho_Vault_Backups';
const FILE_NAME = 'artho_backup_v1.json';
const TOKEN_KEY = 'artho_drive_token';

export interface DriveSyncData {
  transactions: any[];
  accounts: any[];
  lastUpdated: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;

  async initGapi() {
    return new Promise<void>((resolve) => {
      (window as any).gapi.load('client', async () => {
        await (window as any).gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        resolve();
      });
    });
  }

  setAccessToken(token: string, expiresIn?: number) {
    this.accessToken = token;
    (window as any).gapi.client.setToken({ access_token: token });
    
    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiry }));
    }
  }

  getSavedToken(): string | null {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return null;
    
    const { token, expiry } = JSON.parse(saved);
    if (Date.now() > expiry) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  }

  clearToken() {
    this.accessToken = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async getOrCreateFolder(): Promise<string> {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (response.result.files.length > 0) {
      return response.result.files[0].id;
    }

    const folderMetadata = {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const createResponse = await (window as any).gapi.client.drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    return createResponse.result.id;
  }

  async findBackupFile(folderId: string): Promise<string | null> {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `'${folderId}' in parents and name = '${FILE_NAME}' and trashed = false`,
      fields: 'files(id)',
    });
    return response.result.files.length > 0 ? response.result.files[0].id : null;
  }

  async uploadData(data: DriveSyncData) {
    if (!this.accessToken) return;

    try {
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.findBackupFile(folderId);

      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
        parents: fileId ? undefined : [folderId],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        close_delim;

      const path = fileId 
        ? `/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : '/upload/drive/v3/files?uploadType=multipart';

      await (window as any).gapi.client.request({
        path,
        method: fileId ? 'PATCH' : 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body,
      });
    } catch (error) {
      console.error('Upload failed', error);
      throw error;
    }
  }

  async downloadData(): Promise<DriveSyncData | null> {
    if (!this.accessToken) return null;

    try {
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.findBackupFile(folderId);

      if (!fileId) return null;

      const response = await (window as any).gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      return response.result;
    } catch (error) {
      console.error('Download failed', error);
      return null;
    }
  }
}

export const driveService = new GoogleDriveService();
