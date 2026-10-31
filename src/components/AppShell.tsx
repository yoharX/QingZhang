import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../store/AppContext';
import { Icon, type IconName } from './Icon';
import { Logo, Wordmark } from './Logo';
import { Avatar } from './Avatar';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '主页', icon: 'home' },
  { to: '/txns', label: '收支', icon: 'list' },
  { to: '/insights', label: 'AI 分析', icon: 'sparkle' },
  { to: '/me', label: '我的', icon: 'user' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, openComposer } = useApp();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={30} />
          <Wordmark />
        </div>

        <nav className="nav" aria-label="主导航">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 22 }}>
          <button className="btn btn-primary btn-block" onClick={openComposer}>
            <Icon name="plus" size={17} />
            记一笔
          </button>
        </div>

        <div className="sidebar-foot">
          <button className="user-pill" onClick={() => navigate('/me')}>
            <Avatar name={user?.name ?? ''} avatar={user?.avatar} size={32} />
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{user?.name ?? '未登录'}</div>
              <div className="user-mail">{user?.email ?? ''}</div>
            </div>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={26} />
            <span style={{ fontWeight: 620, fontSize: 15 }}>轻帐</span>
          </div>
          <button
            className="avatar-btn"
            onClick={() => navigate('/me')}
            aria-label="我的"
          >
            <Avatar name={user?.name ?? ''} avatar={user?.avatar} size={30} />
          </button>
        </header>

        {children}
      </div>

      <nav className="tabbar" aria-label="底部导航">
        <div className="tabbar-inner">
          <NavLink to="/" end className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            <Icon name="home" size={21} />
            主页
          </NavLink>
          <NavLink to="/txns" className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            <Icon name="list" size={21} />
            收支
          </NavLink>
          <button className="tab tab-fab" onClick={openComposer} aria-label="记一笔">
            <span>
              <Icon name="plus" size={24} />
            </span>
          </button>
          <NavLink
            to="/insights"
            className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}
          >
            <Icon name="sparkle" size={21} />
            AI
          </NavLink>
          <NavLink to="/me" className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            <Icon name="user" size={21} />
            我的
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
