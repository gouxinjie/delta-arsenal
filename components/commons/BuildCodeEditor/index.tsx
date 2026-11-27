/**
 * @component BuildCodeEditor
 * @description 改枪码录入器：粘贴改枪码自动识别武器 / 场景，补齐方案名、价格、方案标签与备注，
 *              填好口令后「直接入库」（POST /api/builds 写入 data/builds.db，列表立即刷新）；
 *              无口令时可存本机 localStorage 草稿，并下载「已入库 + 草稿」合并的 JSON 作备份
 *              （面板数值统一由武器图鉴承载，录入器不再重复维护）
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27（新增直接入库；字号校准、对比度与下载兼容修复）
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SmartImage from '@/components/commons/SmartImage';
import { IconCopy, IconRifle } from '@/components/commons/icons';
import {
  BUILD_SCENARIOS,
  BUILD_TAG_BASE_CLASS,
  BUILD_TAG_LIMIT,
  BUILD_TAG_MAX_LENGTH,
  BUILD_TAG_OPTIONS,
  buildScenarioLabel,
  getBuildTagClass,
} from '@/constants/build-code';
import {
  getDraftsServerSnapshot,
  getDraftsSnapshot,
  subscribeDrafts,
  writeDrafts,
} from '@/lib/build-code-drafts';
import {
  getTokenServerSnapshot,
  getTokenSnapshot,
  subscribeToken,
  writeToken,
} from '@/lib/builds-token';
import { copyText } from '@/lib/clipboard';
import { formatPriceWan } from '@/lib/format';
import { normalizeWeaponName, shortWeaponName } from '@/lib/weapon-name';
import type {
  BuildCodeRecord,
  BuildCodeWriteResult,
  BuildScenario,
  BuildWeaponOption,
} from '@/types/build-code';
import SelectField from './SelectField';

/** 改枪码尾段格式：游戏生成的编码为 12–32 位字母数字 */
const CODE_PATTERN = /^[0-9A-Za-z]{12,32}$/;

/** 表单控件统一样式（14px 为暗色面板下正文舒适档，15px 会让下拉与输入框显得空旷） */
const INPUT_CLASS =
  'w-full rounded border border-edge bg-bg px-3 py-2 text-[14px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent';

/** 改枪码解析结果 */
interface ParsedBuildCode {
  /** 自动识别到的武器，未识别为 null */
  weapon: BuildWeaponOption | null;
  /** 从代码中段识别到的场景，未识别为 null */
  scenario: BuildScenario | null;
  /** 编码尾段（不含枪名与场景前缀） */
  suffix: string;
  /** 是否包含「枪名-场景-编码」完整前缀 */
  hasPrefix: boolean;
  /** 尾段字符是否合法 */
  validSuffix: boolean;
}

/**
 * 从改枪码中解析武器 / 场景 / 编码
 * @description 枪名本身可能带连字符（ASh-12、FS-12），因此从右往左取两段：
 *              最后一段是编码、倒数第二段是场景、其余全部是枪名
 * @param raw - 用户粘贴的原始文本
 * @param weapons - 武器下拉数据
 * @returns 解析结果；格式不完整时 weapon / scenario 为 null
 */
function parseBuildCode(raw: string, weapons: BuildWeaponOption[]): ParsedBuildCode {
  const text = raw.trim().replace(/[－–—]/g, '-');
  const segments = text.split('-').map((segment) => segment.trim()).filter(Boolean);

  if (segments.length < 3) {
    return {
      weapon: null,
      scenario: null,
      suffix: text,
      hasPrefix: false,
      validSuffix: CODE_PATTERN.test(text),
    };
  }

  const suffix = segments[segments.length - 1];
  const scenarioText = segments[segments.length - 2];
  const weaponText = segments.slice(0, -2).join('-');
  const weaponKey = normalizeWeaponName(weaponText);

  const weapon =
    weapons.find((item) => normalizeWeaponName(item.name) === weaponKey) ??
    weapons.find((item) => normalizeWeaponName(item.shortName) === weaponKey) ??
    // 归一后为空时不做包含匹配，否则空串会命中第一把武器
    (weaponKey ? weapons.find((item) => normalizeWeaponName(item.name).includes(weaponKey)) : undefined) ??
    null;

  const scenario: BuildScenario | null = scenarioText.includes('烽火')
    ? 'firestorm'
    : scenarioText.includes('全面')
      ? 'allout'
      : null;

  return { weapon, scenario, suffix, hasPrefix: true, validSuffix: CODE_PATTERN.test(suffix) };
}

/**
 * 生成记录 id：方案名（或枪名）+ 日期，冲突时由调用方追加序号
 * @param weaponName - 枪名
 * @param title - 方案名，可空
 * @param date - 录入日期
 * @returns 形如 `腾龙-23-万稳压版-2026-11-27` 的 id
 */
function buildRecordId(weaponName: string, title: string, date: string): string {
  const base = (title || shortWeaponName(weaponName))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'build'}-${date}`;
}

/**
 * 下载文本文件
 * @param filename - 文件名
 * @param content - 文件内容
 */
function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 点击后立即释放会让 Safari / 旧版 Firefox 中断正在进行的下载，延后回收地址
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 表单字段外壳
 * @param props.label - 字段名
 * @param props.hint - 右侧补充说明
 * @param props.required - 是否必填（显示红色星号）
 * @param props.children - 控件
 */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1 text-[12px] text-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
        {hint && <span className="text-[11px] text-muted/85">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** BuildCodeEditor 组件入参 */
interface BuildCodeEditorProps {
  /** 数据库全部武器，供下拉与预览使用 */
  weapons: BuildWeaponOption[];
  /** 数据文件已有记录，导出时与之合并 */
  existing: BuildCodeRecord[];
  /** 默认录入日期（由服务端传入，避免客户端时区导致水合不一致） */
  defaultDate: string;
  /**
   * 是否嵌入侧边抽屉
   * @default false
   * @description 为 true 时隐藏「返回改枪码列表」链接（抽屉自带关闭按钮，返回链接会造成双出口）
   */
  embedded?: boolean;
}

export default function BuildCodeEditor({
  weapons,
  existing,
  defaultDate,
  embedded = false,
}: BuildCodeEditorProps) {
  const [code, setCode] = useState('');
  const [weaponId, setWeaponId] = useState('');
  const [scenario, setScenario] = useState<BuildScenario>('firestorm');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  /** 已选方案标签（预置词 + 自定义） */
  const [tags, setTags] = useState<string[]>([]);
  /** 自定义标签输入框内容 */
  const [tagInput, setTagInput] = useState('');
  const [createdAt, setCreatedAt] = useState(defaultDate);
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  /** 是否正在提交入库请求（提交期间禁用按钮，避免重复写入） */
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  /** 最近一次复制成功的目标（记录 id 或 'merged'），用于按钮文字反馈 */
  const [copiedKey, setCopiedKey] = useState('');
  /** 「已复制」提示的定时器：抽屉随时会被关闭，卸载时必须清掉，避免组件消失后仍在计时 */
  const copyTimerRef = useRef<number | null>(null);

  // 本机草稿走外部存储订阅：水合前返回空快照，挂载后自动切换为 localStorage 内容
  const drafts = useSyncExternalStore(
    subscribeDrafts,
    getDraftsSnapshot,
    getDraftsServerSnapshot
  );
  // 入库口令同样走外部存储订阅：水合前是空串，挂载后自动取回本机记住的口令
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getTokenServerSnapshot
  );

  const parsed = useMemo(() => parseBuildCode(code, weapons), [code, weapons]);
  const selectedWeapon = useMemo(
    () => weapons.find((weapon) => weapon.id === weaponId) ?? null,
    [weapons, weaponId]
  );
  /** 枪械下拉选项：weapons 不变时不重复映射（每次输入都渲染表单，避免无谓重建数组） */
  const weaponOptions = useMemo(
    () => weapons.map((weapon) => ({ value: weapon.id, label: weapon.name })),
    [weapons]
  );
  /** 改装总价（已校验）：录入、预览、导出三处共用同一份口径，避免各写一套判断 */
  const priceValue = useMemo(() => {
    const value = price.trim() ? Number(price) : null;
    return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
  }, [price]);

  /** 输入改枪码时自动带出武器与场景（用户仍可手动改选） */
  const handleCodeChange = (value: string) => {
    setCode(value);
    setError('');
    const next = parseBuildCode(value, weapons);
    if (next.weapon) setWeaponId(next.weapon.id);
    if (next.scenario) setScenario(next.scenario);
  };

  /** 标签候选：预置词 + 已选的自定义标签（自定义项也要在列表里才能取消） */
  const tagOptions = useMemo(() => {
    const presets = BUILD_TAG_OPTIONS.map((option) => option.label);
    return [...presets, ...tags.filter((tag) => !presets.includes(tag))];
  }, [tags]);

  /** 点选 / 取消标签；已达上限时给出提示，不静默丢弃点击 */
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((item) => item !== tag));
      setError('');
      return;
    }
    if (tags.length >= BUILD_TAG_LIMIT) {
      setError(`标签最多 ${BUILD_TAG_LIMIT} 个，请先取消一个再选`);
      return;
    }
    setTags([...tags, tag]);
    setError('');
  };

  /** 添加自定义标签：超长截断、重复忽略 */
  const addTag = () => {
    const value = tagInput.trim().slice(0, BUILD_TAG_MAX_LENGTH);
    setTagInput('');
    if (!value || tags.includes(value)) return;
    if (tags.length >= BUILD_TAG_LIMIT) {
      setError(`标签最多 ${BUILD_TAG_LIMIT} 个，请先取消一个再选`);
      return;
    }
    setTags([...tags, value]);
    setError('');
  };

  /**
   * 组装当前表单对应的记录
   * @returns 记录对象；缺少枪械或编码不合法时返回 null
   */
  const composeRecord = useCallback((): BuildCodeRecord | null => {
    if (!selectedWeapon) return null;
    const suffix = parsed.suffix;
    if (!CODE_PATTERN.test(suffix)) return null;

    // 只有编码尾段时按「枪名-场景-编码」补全前缀，避免用户漏拷前缀导入失败
    const scenarioLabel = BUILD_SCENARIOS.find((item) => item.value === scenario)?.label ?? '烽火地带';
    const finalCode = parsed.hasPrefix
      ? code.trim().replace(/[－–—]/g, '-')
      : `${shortWeaponName(selectedWeapon.name)}-${scenarioLabel}-${suffix}`;

    return {
      id: buildRecordId(selectedWeapon.name, title, createdAt),
      ...(title.trim() ? { title: title.trim() } : {}),
      weapon: selectedWeapon.name,
      scenario,
      ...(priceValue !== null ? { price: priceValue } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(featured ? { featured: true } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      code: finalCode,
    };
  }, [
    selectedWeapon,
    parsed.suffix,
    parsed.hasPrefix,
    code,
    scenario,
    priceValue,
    title,
    createdAt,
    featured,
    note,
    tags,
  ]);

  const previewRecord = useMemo(() => composeRecord(), [composeRecord]);

  /** 复位表单：保留录入日期与已选枪械，方便同一天、同一把枪连续录入多套方案 */
  const resetForm = () => {
    setCode('');
    setTitle('');
    setPrice('');
    setNote('');
    setTags([]);
    setTagInput('');
    setFeatured(false);
  };

  /**
   * 提交前校验
   * @returns 通过时返回待提交记录；不通过返回 null，并已写好错误提示
   * @description 存草稿与直接入库共用，避免两处校验口径不一致
   */
  const checkBeforeSubmit = (): BuildCodeRecord | null => {
    if (!code.trim()) {
      setError('请先粘贴游戏内复制的改枪码');
      return null;
    }
    if (!parsed.validSuffix) {
      setError('编码格式不正确：尾段应为 12–32 位字母数字，请确认复制完整（含结尾字符）');
      return null;
    }
    if (!selectedWeapon) {
      setError('请选择对应的枪械');
      return null;
    }
    // previewRecord 由同一 composeRecord 派生，直接复用，避免提交时再组装一次
    if (!previewRecord) {
      setError('记录不完整，请检查枪械与改枪码');
      return null;
    }
    return previewRecord;
  };

  /** 保存草稿：同 id 时自动追加序号，避免本地草稿互相覆盖 */
  const handleSave = () => {
    setNotice('');
    const record = checkBeforeSubmit();
    if (!record) return;

    const usedIds = new Set([...existing, ...drafts].map((item) => item.id));
    let id = record.id;
    let index = 2;
    while (usedIds.has(id)) {
      id = `${record.id}-${index}`;
      index += 1;
    }

    const next = [...drafts, { ...record, id }];
    writeDrafts(next);
    setError('');
    setNotice(`已存入本地草稿：${record.title ?? shortWeaponName(record.weapon)}（共 ${next.length} 条）`);
    resetForm();
  };

  /**
   * 直接入库：把当前记录写入站点数据库（data/builds.db）
   * @description 成功后服务端已 revalidatePath('/builds')，这里再 router.refresh() 让当前页面数据同步；
   *              用命令式 fetch 而不是 Server Action，是为了把 401 / 409 等文案直接回显到表单
   */
  const handleSubmit = async () => {
    setNotice('');
    const record = checkBeforeSubmit();
    if (!record) return;
    if (!token.trim()) {
      setError('请先填写入库口令（服务端环境变量 BUILDS_WRITE_TOKEN）');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(record),
      });
      const result = (await response.json()) as BuildCodeWriteResult;

      if (!result.success) {
        setError(result.message || '入库失败，请稍后重试');
        return;
      }

      setError('');
      setNotice(`已入库：${record.title ?? shortWeaponName(record.weapon)}，列表已刷新`);
      resetForm();
      router.refresh();
    } catch (error) {
      console.warn('[build-code-editor] 入库请求失败', error);
      setError('入库失败：网络异常或服务未启动，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  /** 清空表单（连标签与提示一起复位） */
  const handleReset = () => {
    setCode('');
    setWeaponId('');
    setScenario('firestorm');
    setTitle('');
    setPrice('');
    setNote('');
    setTags([]);
    setTagInput('');
    setFeatured(false);
    setError('');
    setNotice('');
  };

  /**
   * 复制一条记录的 JSON
   * @param record - 待复制记录
   * @param key - 反馈用的标识
   */
  const copyRecord = async (record: BuildCodeRecord, key: string) => {
    const ok = await copyText(JSON.stringify(record, null, 2));
    if (!ok) {
      setError('复制失败，请手动选择 JSON 文本');
      return;
    }
    setCopiedKey(key);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedKey(''), 1600);
  };

  // 卸载清理：抽屉关闭时把未到期的复制反馈定时器一并回收
  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  /** 删除指定草稿 */
  const removeDraft = (id: string) => {
    const next = drafts.filter((item) => item.id !== id);
    writeDrafts(next);
  };

  /** 下载合并后的数据文件（已有记录 + 本地草稿） */
  const handleDownload = () => {
    const file = { updatedAt: defaultDate, items: [...existing, ...drafts] };
    downloadTextFile('build-codes.json', `${JSON.stringify(file, null, 2)}\n`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* ============ 表单 ============ */}
        <section className="tac-panel tac-panel-plain rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-accent">
              <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
              录入信息
            </h2>
            {!embedded && (
              <Link href="/builds" className="text-[12px] text-muted transition-colors hover:text-accent">
                返回改枪码列表
              </Link>
            )}
          </div>

          <div className="mt-3 space-y-3">
            <Field label="改枪码" required hint="粘贴游戏内复制的整串代码，可自动识别枪械与场景">
              <textarea
                value={code}
                onChange={(event) => handleCodeChange(event.target.value)}
                rows={2}
                spellCheck={false}
                placeholder="腾龙突击步枪-烽火地带-6GFL1T405DJM2O0M5J12S"
                className={`${INPUT_CLASS} num resize-y`}
              />
            </Field>

            {code.trim() && (
              <p className={`text-[12px] ${parsed.validSuffix ? 'text-muted' : 'text-danger'}`}>
                {parsed.weapon ? `已识别：${parsed.weapon.name}` : '未自动识别枪械，请在下方手动选择'}
                {parsed.scenario ? ` · ${buildScenarioLabel(parsed.scenario)}` : ''}
                {!parsed.validSuffix && ' · 编码尾段格式可疑（应为 12–32 位字母数字）'}
              </p>
            )}

            {/* 表单分两段：先粘码（单字段），再填方案信息；细线 + 小节标题避免 7 个输入框平铺、节奏发闷 */}
            <div className="flex items-center gap-2 border-t border-edge/40 pt-3">
              <span className="text-[11px] tracking-[0.18em] text-muted/80">方案信息</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="枪械" required>
                <SelectField
                  label="枪械"
                  value={weaponId}
                  onChange={setWeaponId}
                  placeholder="请选择枪械"
                  options={weaponOptions}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="场景" required>
                <SelectField
                  label="场景"
                  value={scenario}
                  onChange={(value) => setScenario(value as BuildScenario)}
                  options={BUILD_SCENARIOS}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="方案名" hint="留空则用枪械简称">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="如：全距离稳压版"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="改装总价" hint="哈夫币，可留空">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="如：230000"
                  className={`${INPUT_CLASS} num`}
                />
              </Field>

              <Field label="录入日期">
                <input
                  type="date"
                  value={createdAt}
                  onChange={(event) => setCreatedAt(event.target.value)}
                  className={`${INPUT_CLASS} num`}
                />
              </Field>
            </div>

            <Field label="备注" hint="选填，手感 / 适用距离 / 配件要点">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                className={`${INPUT_CLASS} resize-y`}
              />
            </Field>

            {/* 方案标签：预置词点选 + 自定义输入。不用 Field 包裹——Field 是 label，
                点内部按钮会同时触发 label 对首个可聚焦控件的转发，导致误聚焦 */}
            <div role="group" aria-label="方案标签">
              <span className="mb-1.5 flex items-baseline gap-1 text-[12px] text-muted">
                方案标签
                <span className="text-[11px] text-muted/85">
                  选填，最多 {BUILD_TAG_LIMIT} 个，展示在方案卡片上
                </span>
                {tags.length > 0 && (
                  <span className="num text-[11px] text-accent">
                    {tags.length}/{BUILD_TAG_LIMIT}
                  </span>
                )}
              </span>

              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                      className={`${BUILD_TAG_BASE_CLASS} transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 ${
                        active
                          ? `${getBuildTagClass(tag)} hover:opacity-85`
                          : 'border-edge bg-bg text-muted hover:border-accent/60 hover:text-accent'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    // 回车提交：表单没有 form 元素，需手动阻止默认行为
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  maxLength={BUILD_TAG_MAX_LENGTH}
                  placeholder="自定义标签，回车添加"
                  aria-label="自定义方案标签"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="shrink-0 rounded border border-edge px-3.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                >
                  添加
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              标记为站内推荐（卡片标题前显示 ★）
            </label>

            {/* 入库口令：只做一次校验并记在本机；服务端未配置环境变量时接口会直接拒绝写入 */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-muted">
                <span className="shrink-0">入库口令</span>
                <input
                  type="password"
                  value={token}
                  onChange={(event) => {
                    writeToken(event.target.value);
                    setError('');
                  }}
                  placeholder="服务端 BUILDS_WRITE_TOKEN"
                  autoComplete="off"
                  aria-label="入库口令"
                  className={`${INPUT_CLASS} num max-w-[280px]`}
                />
              </label>
              <span className="text-[11px] text-muted/85">仅用于入库校验，会记在本机浏览器</span>
            </div>

            {error && <p className="text-[12px] text-danger">{error}</p>}
            {notice && <p className="text-[12px] text-t2">{notice}</p>}

            {/* 抽屉内把操作条吸在底部：长表单滚到哪里都能直接保存，不必回滚到末尾 */}
            <div
              className={`flex flex-wrap gap-2 border-t border-edge/60 pt-3 ${
                embedded ? 'sticky bottom-0 -mb-4 bg-panel/95 pb-4 backdrop-blur' : ''
              }`}
            >
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded bg-accent px-4 py-2 text-[13px] font-semibold text-[color:var(--on-accent)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '入库中…' : '直接入库'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded border border-edge px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                存为本地草稿
              </button>
              <button
                type="button"
                onClick={() => {
                  if (previewRecord) void copyRecord(previewRecord, 'preview');
                }}
                disabled={!previewRecord}
                className="flex items-center gap-1.5 rounded border border-edge px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconCopy className="h-4 w-4" />
                {copiedKey === 'preview' ? '已复制' : '复制本条 JSON'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded border border-edge px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-danger/60 hover:text-danger"
              >
                清空表单
              </button>
            </div>
          </div>
        </section>

        {/* ============ 预览 + 导出 ============ */}
        <aside className="space-y-4">
          <section className="tac-panel tac-panel-plain rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-accent">
              <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
              卡片预览
            </h2>
            <div className="mt-3 overflow-hidden rounded-md border border-edge/60">
              <div className="thumb-bg flex h-[108px] items-center justify-center bg-thumb-slot px-4">
                <SmartImage
                  src={selectedWeapon?.image ?? ''}
                  alt={selectedWeapon?.name ?? '未选择枪械'}
                  className="weapon-img max-h-[88%] max-w-full object-contain"
                  fallback={
                    <span className="flex items-center justify-center text-muted/30">
                      <IconRifle className="h-10 w-10" />
                    </span>
                  }
                />
              </div>

              <div className="px-3.5 pb-2 pt-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-[15px] font-semibold leading-snug tracking-wide">
                    {featured && <span className="mr-1 text-t5">★</span>}
                    {title.trim() || selectedWeapon?.shortName || '未命名方案'}
                  </p>
                  <span className="num shrink-0 pt-0.5 text-[15px] font-bold leading-none text-main">
                    {priceValue === null ? (
                      <span className="text-[11px] font-normal text-muted/85">待补充</span>
                    ) : (
                      formatPriceWan(priceValue)
                    )}
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                  <span className="truncate">{selectedWeapon?.name ?? '未选择枪械'}</span>
                  {selectedWeapon && (
                    <span className="num rounded bg-accent/10 px-1 py-px text-accent">
                      {selectedWeapon.caliber}
                    </span>
                  )}
                  <span className="num ml-auto shrink-0 text-[11px] text-muted/75">
                    {buildScenarioLabel(scenario)}
                  </span>
                </p>
                {/* 标签实时回显：与列表卡片同一套配色与字号，录入时就能确认最终效果 */}
                {tags.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <li key={tag} className={`${BUILD_TAG_BASE_CLASS} ${getBuildTagClass(tag)}`}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 底部操作行：与真实卡片同样的「代码 + 复制」排布；复制接真实动作，
                  与底部「复制本条 JSON」写出的内容一致（key 独立，反馈互不干扰） */}
              <div className="flex items-center gap-2 border-t border-edge/40 bg-accent/10 px-3.5 py-2">
                <span className="num min-w-0 flex-1 select-all break-all text-[11px] leading-relaxed text-main/80">
                  {code.trim() || '改枪码将显示在这里'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (previewRecord) void copyRecord(previewRecord, 'preview-card');
                  }}
                  disabled={!previewRecord}
                  aria-label="复制当前预览记录的 JSON"
                  className="flex shrink-0 items-center gap-1 rounded border border-accent bg-accent px-2 py-1 text-[12px] font-medium leading-none text-[color:var(--on-accent)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconCopy className="h-3.5 w-3.5" />
                  {copiedKey === 'preview-card' ? '已复制' : '复制'}
                </button>
              </div>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-muted/85">
              预览即最终卡片效果：价格按「万」展示，标签配色与列表页一致。
            </p>
          </section>

          <section className="tac-panel tac-panel-plain rounded-lg p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-accent">
              <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
              导出到数据文件
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              入库数据存在运行时数据库
              <code className="num mx-1 rounded border border-edge bg-panel-hi px-1.5 py-0.5 text-[12px] text-main">
                data/builds.db
              </code>
              （<code className="num text-[12px] text-main">constants/build-codes.json</code>
              仅作首次播种的种子）。下面导出的 JSON 是「已入库 + 本地草稿」的合并快照，用于备份或迁移。
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 w-full rounded border border-accent/45 bg-accent/10 px-3 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              下载合并后的 JSON（已收录 {existing.length} + 草稿 {drafts.length}）
            </button>
            <p className="mt-2 text-[12px] leading-relaxed text-muted/85">
              注意：导出文件的 updatedAt 取今天，仅作备份，不会自动回写数据库。
            </p>
          </section>
        </aside>
      </div>

      {/* ============ 本地草稿 ============ */}
      <section className="tac-panel tac-panel-plain rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-accent">
            <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
            本地草稿
            <span className="num rounded border border-edge/70 bg-bg px-1.5 py-0.5 text-[11px] font-normal text-muted">
              {drafts.length}
            </span>
          </h2>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={() => writeDrafts([])}
              className="text-[12px] text-muted transition-colors hover:text-danger"
            >
              清空草稿
            </button>
          )}
        </div>

        {drafts.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted">
            暂无草稿。填写上方表单后点「保存为本地草稿」即可在这里排队。
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-edge/50">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px]">
                    {draft.title || shortWeaponName(draft.weapon)}
                    <span className="ml-1.5 text-muted">· {buildScenarioLabel(draft.scenario)}</span>
                  </p>
                  <p className="num truncate text-[11px] text-muted/80">{draft.code}</p>
                </div>
                <span className="num text-[12px] text-muted">
                  {typeof draft.price === 'number' ? formatPriceWan(draft.price) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => copyRecord(draft, draft.id)}
                  className="flex items-center gap-1 rounded border border-edge px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <IconCopy className="h-3.5 w-3.5" />
                  {copiedKey === draft.id ? '已复制' : 'JSON'}
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(draft.id)}
                  className="rounded border border-edge px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:border-danger/60 hover:text-danger"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
