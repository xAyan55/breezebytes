import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { fileManager } from '../daemon/fileManager.js';

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), 'temp_uploads') });

// Ensure temp upload directory exists
if (!fs.existsSync(path.join(process.cwd(), 'temp_uploads'))) {
  fs.mkdirSync(path.join(process.cwd(), 'temp_uploads'), { recursive: true });
}

// GET /api/v1/servers/:id/files
router.get('/:id/files', authenticate, requireServerAccess('server.files.read'), async (req, res) => {
  const dirPath = req.query.path || '';
  try {
    const list = await fileManager.listFiles(req.server.id, dirPath);
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'FILE_ERROR', message: err.message } });
  }
});

// GET /api/v1/servers/:id/files/content
router.get('/:id/files/content', authenticate, requireServerAccess('server.files.read'), async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Path is required.' } });
  }

  try {
    const content = await fileManager.readFile(req.server.id, filePath);
    return res.json({ success: true, data: { content } });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'FILE_READ_ERROR', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/write
router.post('/:id/files/write', authenticate, requireServerAccess('server.files.write'), async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Path is required.' } });
  }

  try {
    await fileManager.writeFile(req.server.id, filePath, content || '');
    return res.json({ success: true, message: 'File saved successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'FILE_WRITE_ERROR', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/folder
router.post('/:id/files/folder', authenticate, requireServerAccess('server.files.write'), async (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Path is required.' } });
  }

  try {
    await fileManager.createFolder(req.server.id, folderPath);
    return res.json({ success: true, message: 'Folder created successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'FOLDER_CREATE_ERROR', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/upload
router.post('/:id/files/upload', authenticate, requireServerAccess('server.files.upload'), upload.array('files'), async (req, res) => {
  const destDir = req.body.directory || '';
  const uploadedFiles = req.files || [];

  try {
    for (const file of uploadedFiles) {
      const targetRelPath = path.join(destDir, file.originalname);
      const { fullPath } = fileManager.resolveSafePath(req.server.id, targetRelPath);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.copyFileSync(file.path, fullPath);
      fs.unlinkSync(file.path);
    }
    return res.json({ success: true, message: `Uploaded ${uploadedFiles.length} file(s).` });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'UPLOAD_FAILED', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/rename
router.post('/:id/files/rename', authenticate, requireServerAccess('server.files.write'), async (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Both old and new paths are required.' } });
  }

  try {
    await fileManager.renamePath(req.server.id, oldPath, newPath);
    return res.json({ success: true, message: 'Renamed successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'RENAME_FAILED', message: err.message } });
  }
});

// DELETE /api/v1/servers/:id/files
router.delete('/:id/files', authenticate, requireServerAccess('server.files.delete'), async (req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Path is required.' } });
  }

  try {
    await fileManager.deletePath(req.server.id, targetPath);
    return res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/archive
router.post('/:id/files/archive', authenticate, requireServerAccess('server.files.write'), async (req, res) => {
  const { files = [], name = 'archive.tar.gz' } = req.body;
  try {
    const result = await fileManager.archiveFiles(req.server.id, files, name);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'ARCHIVE_FAILED', message: err.message } });
  }
});

// POST /api/v1/servers/:id/files/extract
router.post('/:id/files/extract', authenticate, requireServerAccess('server.files.write'), async (req, res) => {
  const { path: archivePath, destination = '' } = req.body;
  try {
    await fileManager.extractArchive(req.server.id, archivePath, destination);
    return res.json({ success: true, message: 'Archive extracted successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'EXTRACT_FAILED', message: err.message } });
  }
});

export default router;
