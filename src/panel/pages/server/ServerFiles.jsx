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
  Loader2,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const ServerFiles = () => {
  const { server } = useOutletContext();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fetchFiles = useCallback(async (path = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/files`, { path });
      if (res.success) {
        setFiles(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
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
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentPath('');
      return;
    }
    const parts = currentPath.split('/');
    const newPath = parts.slice(0, index + 1).join('/');
    setCurrentPath(newPath);
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
      alert(`Cannot open file: ${err.message}`);
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
      alert('File saved successfully!');
    } catch (err) {
      alert(`Failed to save file: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
    try {
      await api.post(`/servers/${server.id}/files/folder`, { path: folderPath });
      setNewFolderModal(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err) {
      alert(`Folder creation failed: ${err.message}`);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const filePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
    try {
      await api.post(`/servers/${server.id}/files/write`, { path: filePath, content: '' });
      setNewFileModal(false);
      setNewFileName('');
      fetchFiles(currentPath);
      setEditingFile(filePath);
      setFileContent('');
    } catch (err) {
      alert(`File creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (file) => {
    const targetPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
    try {
      await api.delete(`/servers/${server.id}/files`, { path: targetPath });
      fetchFiles(currentPath);
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget.trim() || !renameModal) return;
    const oldPath = currentPath ? `${currentPath}/${renameModal.name}` : renameModal.name;
    const newPath = currentPath ? `${currentPath}/${renameTarget}` : renameTarget;
    try {
      await api.post(`/servers/${server.id}/files/rename`, { oldPath, newPath });
      setRenameModal(null);
      setRenameTarget('');
      fetchFiles(currentPath);
    } catch (err) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const handleUpload = async (e) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;
    const formData = new FormData();
    formData.append('directory', currentPath);
    for (let i = 0; i < uploaded.length; i++) {
      formData.append('files', uploaded[i]);
    }
    try {
      setLoading(true);
      await api.post(`/servers/${server.id}/files/upload`, formData);
      fetchFiles(currentPath);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // File Editor View
  if (editingFile) {
    return (
      <div className="flex flex-col gap-4">
        <BreezeCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingFile(null);
                fetchFiles(currentPath);
              }}
              className="p-2 rounded-2xl border-2 border-s3 bg-s1 text-p5 hover:text-p4 hover:border-s4 transition-all duration-500"
              title="Back to Files"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="small-compact font-bold text-p4 font-mono">{editingFile}</p>
              <p className="small-2 text-p5">Text / Config Editor</p>
            </div>
          </div>
          <BreezeButton
            variant="primary"
            size="md"
            icon={savingFile ? Loader2 : Save}
            loading={savingFile}
            onClick={handleSaveFile}
          >
            Save File
          </BreezeButton>
        </BreezeCard>

        <div className="border-2 border-s3 rounded-3xl bg-s1 overflow-hidden">
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
    <div className="flex flex-col gap-6">
      {/* Toolbar & Breadcrumbs */}
      <BreezeCard className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 small-compact font-mono overflow-x-auto max-w-full">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={clsx(
              'px-2 py-1 rounded-xl hover:bg-s5/40 transition-colors duration-500',
              currentPath === '' ? 'text-p1 font-bold' : 'text-p5',
            )}
          >
            /root
          </button>
          {pathParts.map((part, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-s3" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={clsx(
                  'px-2 py-1 rounded-xl hover:bg-s5/40 transition-colors duration-500',
                  idx === pathParts.length - 1 ? 'text-p1 font-bold' : 'text-p5',
                )}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </BreezeCard>

      {/* Files Table */}
      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
            <p className="body-3 font-medium">Loading directory contents...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-p5 small-2">This directory is empty.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Last Modified</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60 font-mono">
                {files.map((file) => (
                  <tr
                    key={file.name}
                    className="hover:bg-s5/30 transition-colors duration-500 group cursor-pointer"
                    onClick={() =>
                      file.isDirectory ? handleOpenFolder(file.name) : handleOpenFile(file)
                    }
                  >
                    <td className="py-3 px-4 flex items-center gap-3">
                      {file.isDirectory ? (
                        <FolderOpen size={18} className="text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileCode size={18} className="text-p1 flex-shrink-0" />
                      )}
                      <span className="text-p4 font-semibold group-hover:text-p1 transition-colors duration-500">
                        {file.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-p5">
                      {file.isDirectory ? '-' : formatSize(file.size)}
                    </td>
                    <td className="py-3 px-4 text-p5">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setRenameModal(file);
                            setRenameTarget(file.name);
                          }}
                          className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/40 transition-colors duration-500"
                          title="Rename"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"
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
            required
            placeholder="Folder name (e.g. plugins, world)..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <BreezeButton variant="ghost" size="md" onClick={() => setNewFolderModal(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">
              Create
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
            required
            placeholder="File name (e.g. motd.txt, server.properties)..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <BreezeButton variant="ghost" size="md" onClick={() => setNewFileModal(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">
              Create & Edit
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>

      {/* Rename Modal */}
      <BreezeModal
        open={!!renameModal}
        onClose={() => setRenameModal(null)}
        title="Rename File or Folder"
      >
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <BreezeInput
            required
            value={renameTarget}
            onChange={(e) => setRenameTarget(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <BreezeButton variant="ghost" size="md" onClick={() => setRenameModal(null)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">
              Rename
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerFiles;
