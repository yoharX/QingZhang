import { useEffect, useState } from 'react';
import { AI_PRESETS, testAiConnection } from '../lib/ai';
import type { AiConfig, AiMode } from '../lib/types';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  config: AiConfig;
  onSave: (cfg: AiConfig) => void;
  onClose: () => void;
}

export function AiSettings({ open, config, onSave, onClose }: Props) {
  const [mode, setMode] = useState<AiMode>(config.mode);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testOk, setTestOk] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(config.mode);
    setBaseUrl(config.baseUrl);
    setApiKey(config.apiKey);
    setModel(config.model);
    setTestMsg('');
    setTestOk(false);
    setError('');
    setShowKey(false);
  }, [open, config]);

  const applyPreset = (i: number) => {
    const p = AI_PRESETS[i];
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setTestMsg('');
    setError('');
  };

  const test = async () => {
    setTesting(true);
    setTestMsg('');
    const msg = await testAiConnection({ mode: 'remote', baseUrl, apiKey, model });
    setTesting(false);
    setTestOk(!msg);
    setTestMsg(msg || '连接正常，模型有响应');
  };

  const save = () => {
    if (mode === 'remote') {
      if (!baseUrl.trim()) {
        setError('接口地址没填');
        return;
      }
      if (!model.trim()) {
        setError('模型名没填');
        return;
      }
    }
    onSave({
      mode,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI 分析方式"
      subtitle="本地算得快、不联网；模型说得更细，但要填自己的密钥"
      width={480}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" style={{ minWidth: 96 }} onClick={save}>
            保存
          </button>
        </>
      }
    >
      <div className="seg" role="tablist" aria-label="分析方式">
        <button
          role="tab"
          aria-selected={mode === 'local'}
          className={`seg-item${mode === 'local' ? ' is-active' : ''}`}
          onClick={() => setMode('local')}
        >
          本地规则
        </button>
        <button
          role="tab"
          aria-selected={mode === 'remote'}
          className={`seg-item${mode === 'remote' ? ' is-active' : ''}`}
          onClick={() => setMode('remote')}
        >
          接入大模型
        </button>
      </div>

      {mode === 'local' ? (
        <div className="ai-local-note">
          <Icon name="shield" size={18} />
          <div>
            <p className="ai-local-title">全部在设备上计算</p>
            <p className="ai-local-body">
              环比、预算预测、储蓄率、健康分都是现算的规则，不联网、不上传。适合日常快速看一眼。
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <span className="field-label">快速填充</span>
            <div className="bank-row">
              {AI_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  className={`bank-chip${baseUrl === p.baseUrl ? ' is-active' : ''}`}
                  onClick={() => applyPreset(i)}
                  title={p.note}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ai-url">
              接口地址
            </label>
            <input
              id="ai-url"
              className="input"
              value={baseUrl}
              placeholder="https://api.deepseek.com/v1"
              spellCheck={false}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setTestMsg('');
              }}
            />
            <span className="field-hint">OpenAI 兼容格式，填到 /v1 这一层即可</span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ai-key">
              API Key
            </label>
            <div className="input-affix">
              <Icon name="lock" size={16} />
              <input
                id="ai-key"
                className="input has-icon has-trailing"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestMsg('');
                }}
              />
              <button
                type="button"
                className="affix-btn"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? '隐藏密钥' : '显示密钥'}
              >
                <Icon name={showKey ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ai-model">
              模型名
            </label>
            <input
              id="ai-model"
              className="input"
              value={model}
              placeholder="deepseek-chat"
              spellCheck={false}
              onChange={(e) => {
                setModel(e.target.value);
                setTestMsg('');
              }}
            />
          </div>

          <div className="ai-test-row">
            <button className="btn btn-ghost" onClick={test} disabled={testing}>
              {testing ? <span className="spinner" /> : <Icon name="bolt" size={15} />}
              {testing ? '测试中' : '测试连接'}
            </button>
            {testMsg && (
              <span className={`ai-test-msg${testOk ? ' is-ok' : ' is-bad'}`}>
                <Icon name={testOk ? 'check' : 'alert'} size={13} />
                {testMsg}
              </span>
            )}
          </div>

          <p className="ai-privacy">
            <Icon name="shield" size={13} />
            密钥只写在本机 localStorage，不经过轻帐的服务器（本来也没有服务器）。分析时账目摘要会直接发给你填的这个服务商。
          </p>
        </>
      )}

      {error && (
        <div className="field-error">
          <Icon name="alert" size={13} />
          {error}
        </div>
      )}
    </Modal>
  );
}
