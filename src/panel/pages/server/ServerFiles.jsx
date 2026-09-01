import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  FolderOpen,
  FileCode,
  FolderPlus,
  FilePlus,
  UploadCloud,
  Search,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerFiles = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Editing state
  const [editingFile, setEditingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileSaving, setFileSaving] = useState(false);

  // Modals & inputs
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchFiles = useCallback(async (dirPath = currentPath) => {
    if (!serverId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/servers/${serverId}/files?path=${encodeURIComponent(dirPath)}`);
      if (res.success && Array.isArray(res.data)) {
        setFiles(res.data);
      } else {
        throw new Error(res.error?.message || 'Could not load directory');
      }
    } catch (err) {
      console.error('Failed to list files:', err);
      setError(err.message || 'Unable to access directory.');
    } finally {
      setLoading(false);
    }
  }, [serverId, currentPath]);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [fetchFiles, currentPath]);

  const handleNavigate = (newPath) => {
    setEditingFile(null);
    setCurrentPath(newPath);
  };

  const handleOpenFile = async (file) => {
    if (file.isDirectory) {
      const separator = currentPath === '/' ? '' : '/';
      handleNavigate(`${currentPath}${separator}${file.name}`);
      return;
    }

    try {
      setLoading(true);
      const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const res = await api.get(`/servers/${serverId}/files/read?path=${encodeURIComponent(fullPath)}`);
      if (res.success) {
        setEditingFile(fullPath);
        setFileContent(res.data.content || '');
      } else {
        showToast('error', res.error?.message || 'Failed to read file content.');
      }
    } catch (err) {
      showToast('error', `Could not open file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile || fileSaving) return;
    try {
      setFileSaving(true);
      const res = await api.post(`/servers/${serverId}/files/write`, {
        path: editingFile,
        content: fileContent,
      });
      if (res.success) {
        showToast('success', 'File saved successfully.');
      } else {
        throw new Error(res.error?.message || 'Save failed');
      }
    } catch (err) {
      showToast('error', `Failed to save file: ${err.message}`);
    } finally {
      setFileSaving(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const fullPath = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
      const res = await api.post(`/servers/${serverId}/files/folder`, { path: fullPath });
      if (res.success) {
        setShowNewFolderModal(false);
        setNewFolderName('');
        showToast('success', 'Folder created.');
        fetchFiles(currentPath);
      } else {
        throw new Error(res.error?.message || 'Failed to create folder');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      const fullPath = currentPath === '/' ? `/${newFileName.trim()}` : `${currentPath}/${newFileName.trim()}`;
      const res = await api.post(`/servers/${serverId}/files/write`, { path: fullPath, content: '' });
      if (res.success) {
        setShowNewFileModal(false);
        setNewFileName('');
        showToast('success', 'File created.');
        fetchFiles(currentPath);
        setEditingFile(fullPath);
        setFileContent('');
      } else {
        throw new Error(res.error?.message || 'Failed to create file');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDeleteItem = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    try {
      const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const res = await api.delete(`/servers/${serverId}/files?path=${encodeURIComponent(fullPath)}`);
      if (res.success) {
        showToast('success', `Deleted "${file.name}".`);
        fetchFiles(currentPath);
      } else {
        throw new Error(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const oldPath = currentPath === '/' ? `/${renameTarget.name}` : `${currentPath}/${renameTarget.name}`;
      const newPath = currentPath === '/' ? `/${renameValue.trim()}` : `${currentPath}/${renameValue.trim()}`;
      const res = await api.post(`/servers/${serverId}/files/rename`, { oldPath, newPath });
      if (res.success) {
        setRenameTarget(null);
        setRenameValue('');
        showToast('success', 'Renamed successfully.');
        fetchFiles(currentPath);
      } else {
        throw new Error(res.error?.message || 'Rename failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleUpload = async (e) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < uploadedFiles.length; i++) {
      formData.append('files', uploadedFiles[i]);
    }
    formData.append('path', currentPath);

    try {
      showToast('success', 'Uploading file(s)...');
      const res = await api.upload(`/servers/${serverId}/files/upload`, formData);
      if (res.success) {
        showToast('success', 'Upload complete.');
        fetchFiles(currentPath);
      } else {
        throw new Error(res.error?.message || 'Upload failed');
      }
    } catch (err) {
      showToast('error', `Upload error: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const pathParts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full flex flex-col gap-4 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300',
            toastMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          )}
        >
          <div className="flex items-center gap-2">
            <BreezeIcon icon={toastMessage.type === 'error' ? AlertCircle : Check} size={15} />
            <span>{toastMessage.message}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-3 text-p4 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* ===== In-Browser Code / Config Editor View ===== */}
      {editingFile ? (
        <div className="border-2 border-s3 rounded-2xl bg-s1 flex flex-col overflow-hidden shadow-sm">
          {/* Editor Header Bar */}
          <div className="p-3 bg-s2 border-b-2 border-s3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setEditingFile(null)}
                className="p-1.5 rounded-xl bg-s1 border border-s3 text-p5 hover:text-p4 hover:border-s4 transition-colors cursor-pointer"
                title="Back to file listing"
              >
                <BreezeIcon icon={ArrowLeft} size={15} />
              </button>
              <div className="flex items-center gap-2 min-w-0 font-mono text-xs text-p4 font-semibold truncate">
                <BreezeIcon icon={FileCode} size={16} className="text-p1 flex-shrink-0" />
                <span className="truncate">{editingFile}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BreezeButton
                variant="secondary"
                size="sm"
                onClick={() => setEditingFile(null)}
              >
                Cancel
              </BreezeButton>
              <BreezeButton
                variant="primary"
                size="sm"
                icon={Save}
                loading={fileSaving}
                onClick={handleSaveFile}
              >
                Save File
              </BreezeButton>
            </div>
          </div>

          {/* Editor Textarea */}
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            spellCheck={false}
            className="w-full h-[600px] p-4 bg-[#08090d] text-zinc-200 font-mono text-xs sm:text-[13px] leading-relaxed focus:outline-none resize-none select-text"
          />
        </div>
      ) : (
        /* ===== Standard Full-Width File Listing View ===== */
        <div className="border-2 border-s3 rounded-2xl bg-s1 flex flex-col overflow-hidden shadow-sm">
          {/* Top Breadcrumb & Action Toolbar */}
          <div className="p-4 bg-s2 border-b-2 border-s3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            {/* Breadcrumb Path Bar */}
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-p4 overflow-x-auto py-1">
              <button
                onClick={() => handleNavigate('/')}
                className={clsx(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors cursor-pointer',
                  currentPath === '/' ? 'bg-s4/20 text-p1' : 'text-p5 hover:text-p4 hover:bg-s5/50',
                )}
              >
                <BreezeIcon icon={FolderOpen} size={16} />
                <span>/</span>
              </button>

              {pathParts.map((part, idx) => {
                const subPath = '/' + pathParts.slice(0, idx + 1).join('/');
                const isLast = idx === pathParts.length - 1;

                return (
                  <div key={subPath} className="flex items-center gap-1 flex-shrink-0">
                    <BreezeIcon icon={ChevronRight} size={13} className="text-p5/50" />
                    <button
                      onClick={() => handleNavigate(subPath)}
                      className={clsx(
                        'px-2.5 py-1 rounded-xl transition-colors cursor-pointer truncate max-w-[150px]',
                        isLast ? 'bg-s4/20 text-p1 font-bold' : 'text-p5 hover:text-p4 hover:bg-s5/50',
                      )}
                    >
                      {part}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Filter */}
              <div className="relative">
                <BreezeIcon icon={Search} size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p5" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-s1 border border-s3 rounded-xl pl-8 pr-3 py-1.5 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-s4 transition-colors w-[140px] sm:w-[170px]"
                />
              </div>

              {/* Upload Input & Button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="file-upload"
              />
              <BreezeButton
                variant="secondary"
                size="sm"
                icon={UploadCloud}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </BreezeButton>

              <BreezeButton
                variant="secondary"
                size="sm"
                icon={FolderPlus}
                onClick={() => setShowNewFolderModal(true)}
              >
                New Folder
              </BreezeButton>

              <BreezeButton
                variant="primary"
                size="sm"
                icon={FilePlus}
                onClick={() => setShowNewFileModal(true)}
              >
                New File
              </BreezeButton>

              <button
                onClick={() => fetchFiles(currentPath)}
                className="p-2 rounded-xl bg-s1 border border-s3 text-p5 hover:text-p4 hover:border-s4 transition-colors cursor-pointer"
                title="Refresh Directory"
              >
                <BreezeIcon icon={RefreshCw} size={16} />
              </button>
            </div>
          </div>

          {/* Files Table */}
          <div className="overflow-x-auto min-h-[450px]">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
                <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
                <span className="text-xs font-mono">Reading container filesystem...</span>
              </div>
            ) : error ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-center text-red-400">
                <BreezeIcon icon={AlertCircle} size={24} />
                <p className="text-xs font-semibold">{error}</p>
                <BreezeButton variant="secondary" size="xs" onClick={() => fetchFiles(currentPath)} className="mt-2">
                  Retry
                </BreezeButton>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center gap-2 text-center text-p5">
                <BreezeIcon icon={FileText} size={28} className="text-p5/30 mb-1" />
                <p className="text-xs font-semibold text-p4">Directory is empty</p>
                <p className="text-[11px] text-p5/70">Upload server JARs, mods, plugins, or config files above.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-s3/80 bg-s2/50 text-p5 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4 w-28">Size</th>
                    <th className="py-2.5 px-4 w-44">Last Modified</th>
                    <th className="py-2.5 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-s3/40">
                  {filteredFiles.map((file) => {
                    const isDir = file.isDirectory;

                    return (
                      <tr
                        key={file.name}
                        onClick={() => handleOpenFile(file)}
                        className="hover:bg-s5/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-p4 flex items-center gap-3">
                          {isDir ? (
                            <BreezeIcon icon={FolderOpen} size={18} className="text-p1 flex-shrink-0" />
                          ) : (
                            <BreezeIcon icon={FileCode} size={18} className="text-p5 group-hover:text-p4 flex-shrink-0" />
                          )}
                          <span className={clsx(isDir && 'font-bold text-p1/90 group-hover:underline')}>
                            {file.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-p5/80 text-[11px]">
                          {isDir ? '—' : formatFileSize(file.size)}
                        </td>
                        <td className="py-3 px-4 font-sans text-p5/70 text-[11px]">
                          {file.modified ? new Date(file.modified).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setRenameTarget(file);
                                setRenameValue(file.name);
                              }}
                              className="p-1.5 rounded-lg text-p5 hover:text-p4 hover:bg-s5/60 transition-colors"
                              title="Rename Item"
                            >
                              <BreezeIcon icon={Edit} size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(file)}
                              className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Item"
                            >
                              <BreezeIcon icon={Trash2} size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFolder}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Create New Folder</h3>
            <input
              type="text"
              placeholder="e.g. plugins, mods, config"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
            />
            <div className="flex items-center justify-end gap-2">
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowNewFolderModal(false)}
              >
                Cancel
              </BreezeButton>
              <BreezeButton type="submit" variant="primary" size="sm" disabled={!newFolderName.trim()}>
                Create
              </BreezeButton>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create New File */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFile}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Create New File</h3>
            <input
              type="text"
              placeholder="e.g. server.properties, ops.json"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
              className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
            />
            <div className="flex items-center justify-end gap-2">
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowNewFileModal(false)}
              >
                Cancel
              </BreezeButton>
              <BreezeButton type="submit" variant="primary" size="sm" disabled={!newFileName.trim()}>
                Create & Edit
              </BreezeButton>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Rename Item */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRename}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Rename {renameTarget.isDirectory ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </BreezeButton>
              <BreezeButton type="submit" variant="primary" size="sm" disabled={!renameValue.trim()}>
                Rename
              </BreezeButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServerFiles;
