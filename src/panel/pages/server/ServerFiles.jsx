import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import {
  FolderOpen,
  FileText,
  FolderPlus,
  FilePlus,
  UploadCloud,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
  Loader2,
  FileCode,
  Archive,
  ChevronRight,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const ServerFiles = () => {
  const { server } = useOutletContext();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // File Editor State
  const [editingFile, setEditingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  // Modals State
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

  // If in file editor mode
  if (editingFile) {
    return (
      <div className="flex flex-col gap-4">
        {/* Editor Toolbar */}
        <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingFile(null);
                fetchFiles(currentPath);
              }}
              className="p-2 rounded-xl border border-[#222638] bg-[#08090d] text-p5 hover:text-p4 transition-colors"
              title="Back to Files"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-xs font-bold text-p4 font-mono">{editingFile}</p>
              <p className="text-[10px] text-p5">Text / Config Editor</p>
            </div>
          </div>

          <button
            onClick={handleSaveFile}
            disabled={savingFile}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 transition-all disabled:opacity-50"
          >
            {savingFile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save File</span>
          </button>
        </div>

        {/* Code Area */}
        <div className="rounded-2xl bg-[#06070a] border border-[#222638] overflow-hidden">
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
      {/* File Manager Toolbar & Breadcrumbs */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto max-w-full">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={clsx(
              'px-2 py-1 rounded hover:bg-s2/60 transition-colors',
              currentPath === '' ? 'text-p1 font-bold' : 'text-p5'
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
                  'px-2 py-1 rounded hover:bg-s2/60 transition-colors',
                  idx === pathParts.length - 1 ? 'text-p1 font-bold' : 'text-p5'
                )}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setNewFileModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08090d] border border-[#222638] text-xs font-semibold text-p4 hover:border-p1/50 transition-colors"
          >
            <FilePlus size={14} className="text-p1" />
            <span>New File</span>
          </button>

          <button
            onClick={() => setNewFolderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08090d] border border-[#222638] text-xs font-semibold text-p4 hover:border-p1/50 transition-colors"
          >
            <FolderPlus size={14} className="text-emerald-400" />
            <span>New Folder</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 cursor-pointer transition-colors">
            <UploadCloud size={14} />
            <span>Upload</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Files Table */}
      <div className="rounded-2xl bg-[#11141e] border border-[#222638] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
            <p className="text-sm font-medium">Loading directory contents...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-p5 text-xs">This directory is empty.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222638] bg-[#08090d] text-p5 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Last Modified</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222638]/60 font-mono">
                {files.map((file) => {
                  return (
                    <tr
                      key={file.name}
                      className="hover:bg-s2/30 transition-colors group cursor-pointer"
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
                        <span className="text-p4 font-semibold group-hover:text-p1 transition-colors">
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
                            className="p-1.5 rounded-lg text-p5 hover:text-p4 hover:bg-s2/60 transition-colors"
                            title="Rename"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {newFolderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="Folder name (e.g. plugins, world)..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {newFileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Create New File</h3>
            <form onSubmit={handleCreateFile} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="File name (e.g. motd.txt, server.properties)..."
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewFileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Rename File or Folder</h3>
            <form onSubmit={handleRename} className="flex flex-col gap-4">
              <input
                type="text"
                required
                value={renameTarget}
                onChange={(e) => setRenameTarget(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModal(null)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerFiles;
