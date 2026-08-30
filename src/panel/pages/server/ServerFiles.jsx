import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import {
  FolderOpen,
  FileCode,
  FolderPlus,
  FilePlus,
  UploadCloud,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
  ChevronRight,
  Search,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { BreezeSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';

const ServerFiles = () => {
  const { server } = useOutletContext();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [editingFile, setEditingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileModal, setNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameModal, setRenameModal] = useState(null);
  const [renameTarget, setRenameTarget] = useState('');

  const fileInputRef = useRef(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchFiles = useCallback(async (path = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/files`, { path });
      if (res.success) {
        setFiles(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      showNotification('error', err.message || 'Failed to list files');
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  const handleOpenFolder = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    setSearch('');
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentPath('');
      setSearch('');
      return;
    }
    const parts = currentPath.split('/');
    const newPath = parts.slice(0, index + 1).join('/');
    setCurrentPath(newPath);
    setSearch('');
  };

  const handleOpenFile = async (file) => {
    try {
      setLoading(true);
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      const res = await api.get(`/servers/${server.id}/files/content`, { path: filePath });
      if (res.success) {
        setEditingFile(filePath);
        setFileContent(res.data.content || '');
      }
    } catch (err) {
      showNotification('error', `Cannot open file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    try {
      setSavingFile(true);
      await api.post(`/servers/${server.id}/files/write`, {
        path: editingFile,
        content: fileContent,
      });
      showNotification('success', 'File saved successfully!');
    } catch (err) {
      showNotification('error', `Failed to save file: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
    try {
      await api.post(`/servers/${server.id}/files/folder`, { path: folderPath });
      setNewFolderModal(false);
      setNewFolderName('');
      showNotification('success', 'Folder created.');
      fetchFiles(currentPath);
    } catch (err) {
      showNotification('error', `Folder creation failed: ${err.message}`);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const filePath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    try {
      await api.post(`/servers/${server.id}/files/write`, { path: filePath, content: '' });
      setNewFileModal(false);
      setNewFileName('');
      fetchFiles(currentPath);
      setEditingFile(filePath);
      setFileContent('');
      showNotification('success', 'File created.');
    } catch (err) {
      showNotification('error', `File creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (file) => {
    const targetPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    try {
      await api.delete(`/servers/${server.id}/files`, { path: targetPath });
      showNotification('success', 'Item deleted.');
      fetchFiles(currentPath);
    } catch (err) {
      showNotification('error', `Failed to delete: ${err.message}`);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget.trim() || !renameModal) return;
    const oldPath = currentPath ? `${currentPath}/${renameModal.name}` : renameModal.name;
    const newPath = currentPath ? `${currentPath}/${renameTarget.trim()}` : renameTarget.trim();
    try {
      await api.post(`/servers/${server.id}/files/rename`, { oldPath, newPath });
      setRenameModal(null);
      setRenameTarget('');
      showNotification('success', 'Renamed successfully.');
      fetchFiles(currentPath);
    } catch (err) {
      showNotification('error', `Rename failed: ${err.message}`);
    }
  };

  const uploadFiles = async (uploaded) => {
    if (!uploaded || uploaded.length === 0) return;
    const formData = new FormData();
    formData.append('directory', currentPath);
    for (let i = 0; i < uploaded.length; i++) {
      formData.append('files', uploaded[i]);
    }
    try {
      setLoading(true);
      await api.post(`/servers/${server.id}/files/upload`, formData);
      showNotification('success', `Uploaded ${uploaded.length} file(s).`);
      fetchFiles(currentPath);
    } catch (err) {
      showNotification('error', `Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadInput = (e) => {
    uploadFiles(e.target.files);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  // File Editor View
  if (editingFile) {
    return (
      <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        {/* Editor Toolbar */}
        <BreezeCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setEditingFile(null);
                fetchFiles(currentPath);
              }}
              className="p-2 rounded-2xl border-2 border-s3 bg-s1 text-p5 hover:text-p4 hover:border-s4 transition-all duration-300 flex-shrink-0"
              title="Back to Directory"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold text-p4 font-mono truncate">{editingFile}</p>
              <p className="text-[11px] text-p5">Text / Config Editor</p>
            </div>
          </div>
          <BreezeButton
            variant="primary"
            size="sm"
            icon={Save}
            loading={savingFile}
            onClick={handleSaveFile}
          >
            Save File
          </BreezeButton>
        </BreezeCard>

        {statusMessage && (
          <div
            className={clsx(
              'p-3 rounded-2xl border-2 text-xs flex items-center gap-2',
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400',
            )}
          >
            {statusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage.message}</span>
          </div>
        )}

        <div className="border-2 border-s3 rounded-3xl bg-[#07080c] overflow-hidden">
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="w-full h-[550px] p-4 bg-transparent text-p4 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-p1 selection:text-black"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col gap-5 max-w-6xl mx-auto w-full relative"
    >
      {/* Drag overlay notice */}
      {isDragging && (
        <div className="absolute inset-0 bg-s1/90 border-2 border-dashed border-p1 rounded-3xl z-40 flex flex-col items-center justify-center gap-3 backdrop-blur-sm pointer-events-none">
          <UploadCloud size={36} className="text-p1 animate-bounce" />
          <p className="text-sm font-bold text-p4">Drop files here to upload to /{currentPath || 'root'}</p>
        </div>
      )}

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 text-xs flex items-center gap-2.5',
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400',
          )}
        >
          {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.message}</span>
        </div>
      )}

      {/* Toolbar & Breadcrumbs */}
      <BreezeCard className="p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto max-w-full py-0.5">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={clsx(
              'px-2.5 py-1 rounded-xl hover:bg-s5/50 transition-colors duration-300 font-semibold',
              currentPath === '' ? 'text-p1 bg-s4/20 border border-s4/40' : 'text-p5',
            )}
          >
            /root
          </button>
          {pathParts.map((part, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <ChevronRight size={13} className="text-s3 flex-shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={clsx(
                  'px-2.5 py-1 rounded-xl hover:bg-s5/50 transition-colors duration-300 truncate max-w-[150px]',
                  idx === pathParts.length - 1 ? 'text-p1 bg-s4/20 border border-s4/40 font-semibold' : 'text-p5',
                )}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Search & File Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search within folder */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-p5/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-s1 border-2 border-s3 rounded-xl text-xs text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-colors w-36 sm:w-44"
            />
          </div>

          <BreezeButton
            variant="secondary"
            size="sm"
            icon={FilePlus}
            onClick={() => setNewFileModal(true)}
          >
            New File
          </BreezeButton>
          <BreezeButton
            variant="secondary"
            size="sm"
            icon={FolderPlus}
            onClick={() => setNewFolderModal(true)}
          >
            New Folder
          </BreezeButton>
          <label>
            <BreezeButton variant="primary" size="sm" icon={UploadCloud} as="span">
              Upload
            </BreezeButton>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUploadInput}
              className="hidden"
            />
          </label>
        </div>
      </BreezeCard>

      {/* Files Table */}
      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-p5 text-xs flex flex-col items-center justify-center gap-2">
            <FileText size={28} className="text-p5/40 mb-1" />
            <p className="font-semibold text-p4">{search ? 'No matching files found' : 'This directory is empty'}</p>
            <p className="text-[11px] text-p5/70">
              {search
                ? `No files or folders in current directory match "${search}".`
                : 'Upload files or create folders using the toolbar above or drag and drop files directly.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Last Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60 font-mono">
                {filteredFiles.map((file) => (
                  <tr
                    key={file.name}
                    className="hover:bg-s5/30 transition-colors duration-300 group cursor-pointer"
                    onClick={() =>
                      file.isDirectory ? handleOpenFolder(file.name) : handleOpenFile(file)
                    }
                  >
                    <td className="py-2.5 px-4 flex items-center gap-3">
                      {file.isDirectory ? (
                        <FolderOpen size={17} className="text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileCode size={17} className="text-p1 flex-shrink-0" />
                      )}
                      <span className="text-p4 font-medium group-hover:text-p1 transition-colors duration-300 truncate max-w-sm">
                        {file.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-p5">
                      {file.isDirectory ? '-' : formatSize(file.size)}
                    </td>
                    <td className="py-2.5 px-4 text-p5">
                      {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setRenameModal(file);
                            setRenameTarget(file.name);
                          }}
                          className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors duration-300"
                          title="Rename"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-300"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BreezeCard>

      {/* New Folder Modal */}
      <BreezeModal
        open={newFolderModal}
        onClose={() => setNewFolderModal(false)}
        title="Create New Folder"
      >
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
          <BreezeInput
            label="Folder Name"
            required
            placeholder="e.g. plugins, world, config"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setNewFolderModal(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Create Folder
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>

      {/* New File Modal */}
      <BreezeModal
        open={newFileModal}
        onClose={() => setNewFileModal(false)}
        title="Create New File"
      >
        <form onSubmit={handleCreateFile} className="flex flex-col gap-4">
          <BreezeInput
            label="File Name"
            required
            placeholder="e.g. server.properties, motd.txt"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setNewFileModal(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Create & Edit
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>

      {/* Rename Modal */}
      <BreezeModal
        open={!!renameModal}
        onClose={() => setRenameModal(null)}
        title="Rename Item"
      >
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <BreezeInput
            label="New Name"
            required
            value={renameTarget}
            onChange={(e) => setRenameTarget(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setRenameModal(null)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Save Name
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerFiles;
