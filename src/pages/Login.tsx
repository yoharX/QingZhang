import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const err =
        mode === 'register'
          ? await register(name, email, password)
          : await login(email, password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  const useDemo = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    const err = await login('demo@qingzhang.app', '123456');
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="auth">
      {/* 左：品牌区 */}
      <section className="auth-aside">
        <div className="auth-aside-top">
          <Logo size={34} />
          <span className="auth-aside-name">轻帐</span>
        </div>

        <div className="auth-aside-body">
          <p className="auth-kicker">PERSONAL LEDGER</p>
          <h1 className="auth-slogan">
            把每一笔，
            <br />
            记清楚。
          </h1>
          <p className="auth-desc">
            不啰嗦、不弹窗、不催你消费。
            <br />
            只回答一个问题：这个月的钱，去哪了。
          </p>
        </div>

        <div className="auth-aside-foot">
          <div className="auth-stat">
            <span className="auth-stat-num num">3</span>
            <span className="auth-stat-label">秒记一笔</span>
          </div>
          <div className="auth-stat">
            <span className="auth-stat-num num">100%</span>
            <span className="auth-stat-label">数据留在本机</span>
          </div>
          <div className="auth-stat">
            <span className="auth-stat-num num">0</span>
            <span className="auth-stat-label">广告与推荐</span>
          </div>
        </div>

        {/* 装饰：账本刻度线 */}
        <div className="auth-ruler" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ opacity: i % 4 === 0 ? 0.5 : 0.18 }} />
          ))}
        </div>
      </section>

      {/* 右：表单区 */}
      <section className="auth-form-wrap">
        <div className="auth-mobile-brand">
          <Logo size={28} />
          <span>轻帐</span>
        </div>

        <div className="auth-card">
          <div className="seg seg-auth" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={`seg-item${mode === 'login' ? ' is-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              登录
            </button>
            <button
              role="tab"
              aria-selected={mode === 'register'}
              className={`seg-item${mode === 'register' ? ' is-active' : ''}`}
              onClick={() => switchMode('register')}
            >
              注册
            </button>
          </div>

          <h2 className="auth-title">
            {mode === 'login' ? '欢迎回来' : '创建你的账本'}
          </h2>
          <p className="auth-sub">
            {mode === 'login' ? '继续记录这个月的生活。' : '用邮箱注册，30 秒开始。'}
          </p>

          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === 'register' && (
              <div className="field">
                <label className="field-label" htmlFor="name">
                  昵称
                </label>
                <input
                  id="name"
                  className="input"
                  placeholder="怎么称呼你"
                  value={name}
                  maxLength={16}
                  autoComplete="nickname"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="email">
                邮箱
              </label>
              <div className="input-affix">
                <Icon name="mail" size={17} />
                <input
                  id="email"
                  className={`input has-icon${error && !email.includes('@') ? ' is-error' : ''}`}
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">
                密码
              </label>
              <div className="input-affix">
                <Icon name="lock" size={17} />
                <input
                  id="password"
                  className="input has-icon has-trailing"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="至少 6 位"
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
                <button
                  type="button"
                  className="affix-btn"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                >
                  <Icon name={showPwd ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <Icon name="alert" size={14} />
                {error}
              </div>
            )}

            <button className="btn btn-primary btn-block auth-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  处理中
                </>
              ) : mode === 'login' ? (
                '登录'
              ) : (
                '创建账本'
              )}
            </button>

            {mode === 'login' && (
              <button type="button" className="auth-demo" onClick={useDemo} disabled={loading}>
                用演示账号进去看看
                <Icon name="chevronRight" size={14} />
              </button>
            )}
          </form>

          <p className="auth-legal">
            这一版是纯前端 Demo，账号与流水只存在这台设备的浏览器里。
          </p>
        </div>
      </section>
    </div>
  );
}
