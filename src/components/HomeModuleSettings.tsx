import { useRef, useState } from 'react';
import type { HomeModule, HomeModuleKey } from '../lib/types';
import { HOME_MODULES, moduleMeta } from '../lib/homeModules';
import { Icon } from './Icon';
import { Modal } from './Modal';

const ROW_H = 64; // 行高 + 间距，拖拽换位按这个算

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface Props {
  open: boolean;
  modules: HomeModule[];
  onChange: (list: HomeModule[]) => void;
  onClose: () => void;
}

export function HomeModuleSettings({ open, modules, onChange, onClose }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const target =
    dragIndex === null
      ? null
      : Math.max(
          0,
          Math.min(modules.length - 1, Math.round((dragIndex * ROW_H + dragY) / ROW_H))
        );

  const toggle = (key: HomeModuleKey) => {
    onChange(modules.map((m) => (m.key === key ? { ...m, visible: !m.visible } : m)));
  };

  const shift = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= modules.length) return;
    onChange(move(modules, index, to));
  };

  const onPointerDown = (e: React.PointerEvent, index: number) => {
    // 只响应左键 / 触摸
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDragIndex(index);
    setDragY(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null) return;
    setDragY(e.clientY - startY.current);
  };

  const endDrag = () => {
    if (dragIndex !== null && target !== null && target !== dragIndex) {
      onChange(move(modules, dragIndex, target));
    }
    setDragIndex(null);
    setDragY(0);
  };

  const allVisible = modules.every((m) => m.visible);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="首页板块"
      subtitle="拖动手柄调整顺序，关掉不想看的"
      width={460}
      footer={
        <button className="btn btn-primary" onClick={onClose} style={{ minWidth: 96 }}>
          完成
        </button>
      }
    >
      <div className="mod-toolbar">
        <button
          className="btn btn-quiet"
          onClick={() =>
            onChange(modules.map((m) => ({ ...m, visible: !allVisible })))
          }
        >
          {allVisible ? '全部隐藏' : '全部显示'}
        </button>
        <span className="dim" style={{ fontSize: 12 }}>
          主卡「本月支出」固定在最上方
        </span>
      </div>

      <div className="mod-list" ref={listRef}>
        {modules.map((m, i) => {
          const meta = moduleMeta(m.key);
          const isDragging = dragIndex === i;
          // 让位：被拖行跨过谁，谁就往反方向挪一格
          let offset = 0;
          if (!isDragging && dragIndex !== null && target !== null) {
            if (dragIndex < target && i > dragIndex && i <= target) offset = -ROW_H;
            if (dragIndex > target && i >= target && i < dragIndex) offset = ROW_H;
          }
          return (
            <div
              key={m.key}
              className={`mod-row${isDragging ? ' is-dragging' : ''}${m.visible ? '' : ' is-off'}`}
              style={{
                height: ROW_H - 8,
                transform: isDragging ? `translateY(${dragY}px)` : `translateY(${offset}px)`,
                transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(.2,.8,.2,1)',
                zIndex: isDragging ? 5 : 1,
              }}
            >
              <span
                className="mod-grip"
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                role="button"
                tabIndex={-1}
                aria-label={`拖动 ${meta.label}`}
              >
                <Icon name="grip" size={18} />
              </span>

              <span className="mod-text">
                <span className="mod-label">{meta.label}</span>
                <span className="mod-desc">{meta.desc}</span>
              </span>

              <span className="mod-moves">
                <button
                  className="icon-btn mod-arrow"
                  onClick={() => shift(i, -1)}
                  disabled={i === 0}
                  aria-label={`${meta.label} 上移`}
                >
                  <Icon name="chevronUp" size={15} />
                </button>
                <button
                  className="icon-btn mod-arrow"
                  onClick={() => shift(i, 1)}
                  disabled={i === modules.length - 1}
                  aria-label={`${meta.label} 下移`}
                >
                  <Icon name="chevronDown" size={15} />
                </button>
              </span>

              <button
                role="switch"
                aria-checked={m.visible}
                aria-label={`显示${meta.label}`}
                className={`switch${m.visible ? ' is-on' : ''}`}
                onClick={() => toggle(m.key)}
              >
                <span className="switch-knob" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mod-hint">
        共 {modules.length} 个板块，当前显示 {modules.filter((m) => m.visible).length} 个。
        {HOME_MODULES.length !== modules.length && ' 新增板块会自动追加到末尾。'}
      </p>
    </Modal>
  );
}
