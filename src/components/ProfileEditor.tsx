import { useEffect, useRef, useState } from 'react';
import { Avatar, AVATAR_PRESETS } from './Avatar';
import { Icon } from './Icon';
import { Modal } from './Modal';

/** 压成 160×160 的 jpeg，一张约 8KB，localStorage 放得下 */
async function fileToAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片读不出来'));
      el.src = url;
    });
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持图片处理');
    // 居中裁正方形再缩，避免头像被拉变形
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  open: boolean;
  name: string;
  avatar: string;
  onSave: (patch: { name?: string; avatar?: string }) => void;
  onClose: () => void;
}

export function ProfileEditor({ open, name, avatar, onSave, onClose }: Props) {
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatar || 'initial');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftName(name);
    setDraftAvatar(avatar || 'initial');
    setError('');
    setBusy(false);
  }, [open, name, avatar]);

  const pickFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('选一张图片');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('图片太大了，8MB 以内');
      return;
    }
    setBusy(true);
    try {
      const data = await fileToAvatar(file);
      setDraftAvatar(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '处理失败');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const n = draftName.trim();
    if (!n) {
      setError('昵称不能空着');
      return;
    }
    if (n.length > 16) {
      setError('昵称 16 个字以内');
      return;
    }
    onSave({ name: n, avatar: draftAvatar });
    onClose();
  };

  const isImage = draftAvatar.startsWith('data:');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="编辑资料"
      subtitle="名称和头像都存在这台设备上"
      width={440}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" style={{ minWidth: 96 }} onClick={save} disabled={busy}>
            保存
          </button>
        </>
      }
    >
      <div className="avatar-editor">
        <Avatar name={draftName || '你'} avatar={draftAvatar} size={76} />
        <div className="avatar-editor-side">
          <p className="avatar-editor-label">选一个头像</p>
          <div className="avatar-picks">
            <button
              className={`avatar-pick${draftAvatar === 'initial' ? ' is-active' : ''}`}
              onClick={() => setDraftAvatar('initial')}
              aria-label="用昵称首字"
              title="用昵称首字"
            >
              <Avatar name={draftName || '你'} avatar="initial" size={34} />
            </button>
            {AVATAR_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`avatar-pick${draftAvatar === p.id ? ' is-active' : ''}`}
                onClick={() => setDraftAvatar(p.id)}
                aria-label={`预设头像 ${p.id}`}
              >
                <Avatar name="" avatar={p.id} size={34} />
              </button>
            ))}
            {isImage && (
              <span className="avatar-pick is-active" aria-label="当前上传的图片">
                <Avatar name="" avatar={draftAvatar} size={34} />
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost avatar-upload"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Icon name="camera" size={15} />
            {busy ? '处理中' : '上传图片'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="profile-name">
          昵称
        </label>
        <input
          id="profile-name"
          className="input"
          value={draftName}
          maxLength={16}
          placeholder="怎么称呼你"
          onChange={(e) => {
            setDraftName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
      </div>

      {error && (
        <div className="field-error">
          <Icon name="alert" size={13} />
          {error}
        </div>
      )}
    </Modal>
  );
}
