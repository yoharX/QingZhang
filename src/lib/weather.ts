export interface WeatherNow {
  city: string;
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  code: number;
  hi: number;
  lo: number;
  isDay: boolean;
  updatedAt: number;
}

export type WeatherIconKey =
  | 'sun'
  | 'moon'
  | 'cloud-sun'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

const CACHE_KEY = 'qingzhang.weather.v1';
const CACHE_TTL = 30 * 60 * 1000;

/** WMO 天气代码 → 中文描述 + 图标 */
export function describe(code: number, isDay: boolean): { text: string; icon: WeatherIconKey } {
  if (code === 0) return { text: '晴', icon: isDay ? 'sun' : 'moon' };
  if (code === 1) return { text: '少云', icon: isDay ? 'cloud-sun' : 'moon' };
  if (code === 2) return { text: '多云', icon: 'cloud-sun' };
  if (code === 3) return { text: '阴', icon: 'cloud' };
  if (code === 45 || code === 48) return { text: '有雾', icon: 'fog' };
  if (code >= 51 && code <= 57) return { text: '毛毛雨', icon: 'drizzle' };
  if (code >= 61 && code <= 67) return { text: '下雨', icon: 'rain' };
  if (code >= 71 && code <= 77) return { text: '下雪', icon: 'snow' };
  if (code >= 80 && code <= 82) return { text: '阵雨', icon: 'rain' };
  if (code === 85 || code === 86) return { text: '阵雪', icon: 'snow' };
  if (code >= 95) return { text: '雷阵雨', icon: 'thunder' };
  return { text: '未知', icon: 'cloud' };
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => window.clearTimeout(timer) };
}

async function fetchJSON<T>(url: string, ms = 8000): Promise<T> {
  const t = withTimeout(ms);
  try {
    const res = await fetch(url, { signal: t.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    t.clear();
  }
}

interface IpWho {
  success?: boolean;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

interface IpInfo {
  city?: string;
  region?: string;
  loc?: string;
}

/** IP 库返回的多数是英文城市名，常见城市转成中文 */
const CITY_ZH: Record<string, string> = {
  Beijing: '北京', Shanghai: '上海', Guangzhou: '广州', Shenzhen: '深圳',
  Hangzhou: '杭州', Chengdu: '成都', Chongqing: '重庆', Wuhan: '武汉',
  "Xi'an": '西安', Xian: '西安', Nanjing: '南京', Tianjin: '天津',
  Suzhou: '苏州', Zhengzhou: '郑州', Changsha: '长沙', Qingdao: '青岛',
  Shenyang: '沈阳', Dalian: '大连', Xiamen: '厦门', Fuzhou: '福州',
  Jinan: '济南', Hefei: '合肥', Kunming: '昆明', Harbin: '哈尔滨',
  Changchun: '长春', Shijiazhuang: '石家庄', Taiyuan: '太原', Nanchang: '南昌',
  Guiyang: '贵阳', Nanning: '南宁', Haikou: '海口', Urumqi: '乌鲁木齐',
  Lanzhou: '兰州', Hohhot: '呼和浩特', Yinchuan: '银川', Xining: '西宁',
  Lhasa: '拉萨', 'Hong Kong': '香港', Macau: '澳门', Taipei: '台北',
  Singapore: '新加坡', Tokyo: '东京', Seoul: '首尔', 'New York': '纽约',
  London: '伦敦', 'Los Angeles': '洛杉矶', 'San Francisco': '旧金山',
  Sydney: '悉尼', Paris: '巴黎', Berlin: '柏林', Toronto: '多伦多',
  Vancouver: '温哥华', Seattle: '西雅图', Boston: '波士顿', Chicago: '芝加哥',
};

function zhCity(name?: string): string {
  if (!name) return '当前位置';
  const trimmed = name.trim();
  return CITY_ZH[trimmed] ?? trimmed;
}

const DEFAULT_PLACE = { lat: 39.9042, lon: 116.4074, city: '北京' };

/** IP 定位：不需要权限弹窗。多家轮流试，谁先回算谁的 */
async function locateByIP(): Promise<{ lat: number; lon: number; city: string }> {
  // 1. ipwho.is —— 免费、支持 CORS、不用 key
  try {
    const d = await fetchJSON<IpWho>('https://ipwho.is/', 6000);
    const lat = Number(d.latitude);
    const lon = Number(d.longitude);
    if (d.success !== false && Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, city: zhCity(d.city || d.region) };
    }
  } catch {
    /* 换下一个 */
  }

  // 2. ipinfo.io —— 免费额度小，作备用
  try {
    const d = await fetchJSON<IpInfo>('https://ipinfo.io/json', 6000);
    const [lat, lon] = (d.loc || '').split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, city: zhCity(d.city || d.region) };
    }
  } catch {
    /* 换下一个 */
  }

  throw new Error('IP 定位失败');
}

/** 浏览器精确定位，用户主动点击时才用 */
function locateByGPS(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('设备不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || '定位失败')),
      { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false }
    );
  });
}

interface OpenMeteo {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
}

async function pull(lat: number, lon: number, city: string): Promise<WeatherNow> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
  const d = await fetchJSON<OpenMeteo>(url, 9000);
  const c = d.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new Error('天气数据为空');

  return {
    city,
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature ?? c.temperature_2m),
    humidity: Math.round(c.relative_humidity_2m ?? 0),
    wind: Math.round(c.wind_speed_10m ?? 0),
    code: c.weather_code ?? 0,
    hi: Math.round(d.daily?.temperature_2m_max?.[0] ?? c.temperature_2m),
    lo: Math.round(d.daily?.temperature_2m_min?.[0] ?? c.temperature_2m),
    isDay: (c.is_day ?? 1) === 1,
    updatedAt: Date.now(),
  };
}

function readCache(): WeatherNow | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as WeatherNow;
    if (!w || typeof w.temp !== 'number') return null;
    if (Date.now() - w.updatedAt > CACHE_TTL) return null;
    return w;
  } catch {
    return null;
  }
}

function writeCache(w: WeatherNow): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(w));
  } catch {
    /* 配额满了就算了，天气不是关键数据 */
  }
}

export function cachedWeather(): WeatherNow | null {
  return readCache();
}

/**
 * 拿天气：缓存优先 → IP 定位 → 浏览器定位 → 北京兜底
 * preferGPS 为 true 时跳过 IP 定位（用户主动点定位按钮）
 */
export async function loadWeather(opts: { preferGPS?: boolean; force?: boolean } = {}): Promise<WeatherNow> {
  const { preferGPS = false, force = false } = opts;

  if (preferGPS) {
    // 手动定位就放弃之前选的城市
    setPreferredCity(null);
    const pos = await locateByGPS();
    const w = await pull(pos.lat, pos.lon, '当前位置');
    writeCache(w);
    return w;
  }

  if (!force) {
    const hit = readCache();
    if (hit) return hit;
  }

  // 用户手动选过城市就用它，不再猜
  const pref = preferredCity();
  if (pref) {
    const w = await pull(pref.lat, pref.lon, pref.name);
    writeCache(w);
    return w;
  }

  // 自动流程：IP 定位最多等 3 秒，等不到就先出默认城市的数据。
  // 不自动调 GPS —— 那会弹权限框，用户没准备好就被打断。
  let loc: { lat: number; lon: number; city: string } | null = null;
  try {
    loc = await Promise.race([
      locateByIP(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000)),
    ]);
  } catch {
    loc = null;
  }

  const place = loc ?? DEFAULT_PLACE;
  const w = await pull(place.lat, place.lon, place.city);
  writeCache(w);
  return w;
}

export function weatherAge(updatedAt: number): string {
  const min = Math.floor((Date.now() - updatedAt) / 60000);
  if (min < 1) return '刚刚更新';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  return `${h} 小时前`;
}

/* ---------------- 手动选城市：定位不可用时的兜底 ---------------- */

export interface City {
  name: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: '北京', lat: 39.9042, lon: 116.4074 },
  { name: '上海', lat: 31.2304, lon: 121.4737 },
  { name: '广州', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', lat: 22.5431, lon: 114.0579 },
  { name: '杭州', lat: 30.2741, lon: 120.1551 },
  { name: '成都', lat: 30.5728, lon: 104.0668 },
  { name: '重庆', lat: 29.563, lon: 106.5516 },
  { name: '武汉', lat: 30.5928, lon: 114.3055 },
  { name: '西安', lat: 34.3416, lon: 108.9398 },
  { name: '南京', lat: 32.0603, lon: 118.7969 },
  { name: '天津', lat: 39.3434, lon: 117.3616 },
  { name: '苏州', lat: 31.2989, lon: 120.5853 },
  { name: '长沙', lat: 28.2282, lon: 112.9388 },
  { name: '青岛', lat: 36.0671, lon: 120.3826 },
  { name: '厦门', lat: 24.4798, lon: 118.0894 },
  { name: '昆明', lat: 25.0389, lon: 102.7183 },
  { name: '哈尔滨', lat: 45.8038, lon: 126.535 },
  { name: '沈阳', lat: 41.8057, lon: 123.4315 },
  { name: '郑州', lat: 34.7466, lon: 113.6254 },
  { name: '合肥', lat: 31.8206, lon: 117.2272 },
  { name: '香港', lat: 22.3193, lon: 114.1694 },
  { name: '台北', lat: 25.033, lon: 121.5654 },
  { name: '新加坡', lat: 1.3521, lon: 103.8198 },
  { name: '东京', lat: 35.6762, lon: 139.6503 },
];

const CITY_KEY = 'qingzhang.weather.city';

export function preferredCity(): City | null {
  try {
    const name = localStorage.getItem(CITY_KEY);
    if (!name) return null;
    return CITIES.find((c) => c.name === name) ?? null;
  } catch {
    return null;
  }
}

export function setPreferredCity(city: City | null): void {
  try {
    if (!city) localStorage.removeItem(CITY_KEY);
    else localStorage.setItem(CITY_KEY, city.name);
  } catch {
    /* 忽略配额问题 */
  }
}

/** 直接按城市拉，用于手动切换 */
export async function loadWeatherAt(city: City): Promise<WeatherNow> {
  const w = await pull(city.lat, city.lon, city.name);
  writeCache(w);
  return w;
}
