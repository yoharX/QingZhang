import { useCallback, useEffect, useState } from 'react';
import { Icon } from './Icon';
import {
  CITIES,
  describe,
  loadWeather,
  loadWeatherAt,
  setPreferredCity,
  weatherAge,
  type City,
  type WeatherIconKey,
  type WeatherNow,
} from '../lib/weather';

/* ---------- 天气图标：多色，只用色板里的颜色 ---------- */
const SUN = 'var(--accent)';
const SUN_EDGE = 'var(--c5)';
const CLOUD = 'var(--line-strong)';
const CLOUD_EDGE = 'var(--ink-3)';
const RAIN = 'var(--brand)';
const SNOW = 'var(--brand-mist)';

function WeatherGlyph({ icon, size = 56 }: { icon: WeatherIconKey; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true } as const;
  switch (icon) {
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="9.5" fill={SUN} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1="24"
              y1="6.5"
              x2="24"
              y2="11"
              stroke={SUN_EDGE}
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${a} 24 24)`}
            />
          ))}
        </svg>
      );
    case 'moon':
      return (
        <svg {...common}>
          <path
            d="M31 8.5a16 16 0 1 0 8.6 27.4A17.5 17.5 0 0 1 31 8.5z"
            fill={SUN}
          />
          <circle cx="14" cy="14" r="1.6" fill={SUN_EDGE} />
          <circle cx="10" cy="22" r="1.1" fill={SUN_EDGE} />
        </svg>
      );
    case 'cloud-sun':
      return (
        <svg {...common}>
          <circle cx="30" cy="17" r="7.5" fill={SUN} />
          <path
            d="M15 37a8 8 0 0 1 .6-15.9 10.5 10.5 0 0 1 19.6 2.6A7.2 7.2 0 0 1 34 37z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'cloud':
      return (
        <svg {...common}>
          <path
            d="M14 36a8.5 8.5 0 0 1 .7-16.9 11 11 0 0 1 20.6 2.7A7.6 7.6 0 0 1 34 36z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'fog':
      return (
        <svg {...common}>
          <path
            d="M15 27a7.5 7.5 0 0 1 .6-14.8 9.8 9.8 0 0 1 18.4 2.4A6.8 6.8 0 0 1 33 27z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M11 33.5h26M14 39h20"
            stroke={CLOUD_EDGE}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'drizzle':
      return (
        <svg {...common}>
          <path
            d="M14 28a8 8 0 0 1 .6-15.6 10.4 10.4 0 0 1 19.4 2.6A7.2 7.2 0 0 1 33 28z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M17 33.5l-1.6 3.4M25 33.5l-1.6 3.4M33 33.5l-1.6 3.4" stroke={RAIN} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'rain':
      return (
        <svg {...common}>
          <path
            d="M14 27a8 8 0 0 1 .6-15.6 10.4 10.4 0 0 1 19.4 2.6A7.2 7.2 0 0 1 33 27z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M17 31.5 14 38M25 31.5 22 38M33 31.5 30 38"
            stroke={RAIN}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'snow':
      return (
        <svg {...common}>
          <path
            d="M14 27a8 8 0 0 1 .6-15.6 10.4 10.4 0 0 1 19.4 2.6A7.2 7.2 0 0 1 33 27z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          {[
            [16, 34],
            [24, 37],
            [32, 34],
          ].map(([cx, cy], i) => (
            <g key={i} stroke={SNOW} strokeWidth="2" strokeLinecap="round">
              <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
              <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} />
            </g>
          ))}
        </svg>
      );
    case 'thunder':
      return (
        <svg {...common}>
          <path
            d="M14 26a8 8 0 0 1 .6-15.6 10.4 10.4 0 0 1 19.4 2.6A7.2 7.2 0 0 1 33 26z"
            fill={CLOUD}
            stroke={CLOUD_EDGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M26.5 29 20 38.5h5l-1.5 6 7-9.5h-5z" fill={SUN} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="14" fill={CLOUD} />
        </svg>
      );
  }
}

type Status = 'loading' | 'ready' | 'error';

export function WeatherCard({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<WeatherNow | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const fetchWeather = useCallback(async (opts: { preferGPS?: boolean; force?: boolean } = {}) => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setRefreshing(true);
    try {
      const w = await loadWeather(opts);
      setData(w);
      setStatus('ready');
      setError('');
    } catch (err) {
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
      setError(err instanceof Error ? err.message : '天气加载失败');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const pickCity = async (c: City) => {
    setCityOpen(false);
    setPreferredCity(c);
    setRefreshing(true);
    try {
      const w = await loadWeatherAt(c);
      setData(w);
      setStatus('ready');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '换城市失败');
    } finally {
      setRefreshing(false);
    }
  };

  const useGPS = async () => {
    setCityOpen(false);
    await fetchWeather({ preferGPS: true });
  };

  const meta = data ? describe(data.code, data.isDay) : null;

  if (status === 'loading') {
    return (
      <section className="weather-card is-loading" aria-busy="true" aria-label="天气加载中">
        <div className="weather-skeleton-icon" />
        <div style={{ flex: 1 }}>
          <div className="skeleton sk-line sk-lg" style={{ width: '38%' }} />
          <div className="skeleton sk-line" style={{ width: '62%', marginTop: 10 }} />
        </div>
      </section>
    );
  }

  if (status === 'error' || !data || !meta) {
    return (
      <section className="weather-card weather-error" aria-label="天气不可用">
        <div className="weather-icon-wrap">
          <Icon name="info" size={24} />
        </div>
        <div className="weather-main">
          <p className="weather-city">天气暂时拿不到</p>
          <p className="weather-desc">{error || '检查网络后重试'}</p>
        </div>
        <button className="btn btn-quiet weather-retry" onClick={() => fetchWeather({ force: true })}>
          重试
        </button>
      </section>
    );
  }

  return (
    <section className={`weather-card${compact ? ' is-compact' : ''}`} aria-label="当前天气">
      <div className="weather-icon-wrap">
        <WeatherGlyph icon={meta.icon} size={compact ? 44 : 54} />
      </div>

      <div className="weather-main">
        <div className="weather-temp-line">
          <span className="weather-temp num">{data.temp}°</span>
          <span className="weather-desc">{meta.text}</span>
        </div>
        <p className="weather-city">
          <button className="weather-city-btn" onClick={() => setCityOpen((v) => !v)}>
            {data.city}
            <Icon name="chevronDown" size={11} />
          </button>
          <span className="weather-dot">·</span>
          <span className="dim">{weatherAge(data.updatedAt)}</span>
        </p>
      </div>

      <div className="weather-side">
        <div className="weather-cell">
          <span className="wc-k">体感</span>
          <span className="wc-v num">{data.feels}°</span>
        </div>
        <div className="weather-cell">
          <span className="wc-k">湿度</span>
          <span className="wc-v num">{data.humidity}%</span>
        </div>
        <div className="weather-cell">
          <span className="wc-k">高低温</span>
          <span className="wc-v num">
            {data.hi}°/{data.lo}°
          </span>
        </div>
      </div>

      <div className="weather-actions">
        <button
          className="weather-act"
          onClick={() => fetchWeather({ force: true })}
          disabled={refreshing}
          aria-label="刷新天气"
          title="刷新"
        >
          <Icon name="refresh" size={15} className={refreshing ? 'spin' : undefined} />
        </button>
        <button
          className="weather-act"
          onClick={() => fetchWeather({ preferGPS: true })}
          disabled={refreshing}
          aria-label="使用我的定位"
          title="用当前定位"
        >
          <Icon name="pin" size={15} />
        </button>
      </div>

      {cityOpen && (
        <>
          <div className="city-scrim" onClick={() => setCityOpen(false)} />
          <div className="city-panel">
            <div className="city-panel-head">
              <span>选择城市</span>
              <button
                className="btn btn-quiet"
                onClick={() => setCityOpen(false)}
                aria-label="关闭"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="city-grid">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  className={`city-chip${data.city === c.name ? ' is-active' : ''}`}
                  onClick={() => pickCity(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <button className="city-auto" onClick={useGPS}>
              <Icon name="pin" size={13} />
              用当前定位
            </button>
          </div>
        </>
      )}
    </section>
  );
}
