"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FilePlus2,
  FileText,
  FileUp,
  MoreHorizontal,
  PenLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RESUME_TEMPLATES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import styles from "./dashboard-workbench.module.scss";

interface ResumeSummary {
  id: string;
  title: string;
  templateId: string;
  updatedAt: string;
}

interface ResumeLimitPayload {
  max: number | null;
  reached: boolean;
}

type ResumeFillEntry = "upload" | "ai" | "template";

const monthDayFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function formatFullDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return fullDateFormatter.format(date);
}

function formatLastEdited(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return "时间未知";
  }

  const diff = Date.now() - timestamp;
  if (diff < 0) {
    return formatFullDate(value);
  }

  if (diff < DAY_MS) {
    return "今天";
  }

  if (diff < WEEK_MS) {
    return `${Math.floor(diff / DAY_MS)}天前`;
  }

  if (diff < WEEK_MS * 8) {
    return `${Math.floor(diff / WEEK_MS)}周前`;
  }

  if (diff < DAY_MS * 365) {
    return monthDayFormatter.format(date);
  }

  return formatFullDate(value);
}

export function ResumesSection() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeLimit, setResumeLimit] = useState<ResumeLimitPayload>({
    max: null,
    reached: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeMenuResumeId, setActiveMenuResumeId] = useState<string | null>(
    null,
  );
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [duplicatingResumeId, setDuplicatingResumeId] = useState<string | null>(
    null,
  );
  const [creatingEntry, setCreatingEntry] = useState<ResumeFillEntry | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/resumes", { cache: "no-store" });
        if (response.status === 401) {
          throw new Error("登录状态已失效，请重新登录。");
        }

        if (!response.ok) {
          throw new Error("简历列表加载失败");
        }

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        setResumes(
          Array.isArray(payload?.resumes)
            ? (payload.resumes as ResumeSummary[])
            : [],
        );
        setResumeLimit({
          max:
            typeof payload?.limit?.max === "number" ? payload.limit.max : null,
          reached: Boolean(payload?.limit?.reached),
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load resumes:", error);
        setLoadError(
          error instanceof Error ? error.message : "简历列表加载失败",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeMenuResumeId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-resume-menu-root="true"]')) {
        return;
      }
      setActiveMenuResumeId(null);
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMenuResumeId(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [activeMenuResumeId]);

  const creationLimitReached = resumeLimit.reached;
  const fillEntryCards: Array<{
    key: ResumeFillEntry;
    title: string;
    description: string;
    icon: typeof FileText;
    buildTitle: () => string;
    entryParams: string;
  }> = [
    {
      key: "upload",
      title: "上传 PDF / DOCX",
      description: "从已有简历文件继续完善内容与排版，快速进入编辑流程。",
      icon: FileUp,
      buildTitle: () => `上传简历 ${resumes.length + 1}`,
      entryParams: "entry=upload",
    },
    {
      key: "ai",
      title: "AI 驱动简历生成",
      description: "直接进入 AI 面板，让模型先生成结构与措辞，再细调细节。",
      icon: Sparkles,
      buildTitle: () => `AI 简历 ${resumes.length + 1}`,
      entryParams: "entry=ai&panel=ai",
    },
    {
      key: "template",
      title: "默认填充模板",
      description: "使用默认模板内容骨架进入编辑页，手动补齐岗位信息与经历。",
      icon: FileText,
      buildTitle: () => `模板简历 ${resumes.length + 1}`,
      entryParams: "entry=template&panel=template",
    },
  ];

  const handleEnterFillEntry = async (
    entry: (typeof fillEntryCards)[number],
  ) => {
    if (creatingEntry) return;

    if (creationLimitReached) {
      toast.error("当前套餐可创建的简历数量已达上限，请升级后继续。");
      router.push("/pricing");
      return;
    }

    setCreatingEntry(entry.key);
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.buildTitle(),
          templateId: RESUME_TEMPLATES[0]?.id || "template-1",
          mode: "form",
        }),
      });

      if (response.status === 401) {
        throw new Error("登录状态已失效，请重新登录。");
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "创建简历失败");
      }

      const resumeId =
        typeof payload?.resume?.id === "string" ? payload.resume.id : "";
      if (!resumeId) {
        throw new Error("创建简历失败");
      }

      const loadingToastId = toast.loading("正在进入编辑页...");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("resume:just-created-id", resumeId);
        window.sessionStorage.setItem(
          "resume:editor-loading-toast-id",
          String(loadingToastId),
        );
      }
      router.push(
        `/builder/editor/${encodeURIComponent(resumeId)}?${entry.entryParams}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建简历失败");
    } finally {
      setCreatingEntry(null);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    const confirmed = window.confirm("确认删除这份简历吗？删除后不可恢复。");
    if (!confirmed) {
      return;
    }

    setDeletingResumeId(resumeId);

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        throw new Error("登录后才能删除简历");
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "删除失败");
      }

      setResumes((current) => {
        const next = current.filter((resume) => resume.id !== resumeId);
        setResumeLimit((limit) => {
          if (limit.max === null) return limit;
          return {
            ...limit,
            reached: next.length >= limit.max,
          };
        });
        return next;
      });
      setActiveMenuResumeId(null);
      toast.success("简历已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingResumeId(null);
    }
  };

  const handleDuplicateResume = async (resume: ResumeSummary) => {
    setDuplicatingResumeId(resume.id);

    try {
      const response = await fetch(`/api/resumes/${resume.id}/duplicate`, {
        method: "POST",
      });

      if (response.status === 401) {
        throw new Error("登录后才能复制简历");
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "复制失败");
      }

      const duplicatedResume = payload?.resume as Partial<ResumeSummary> | null;
      if (!duplicatedResume?.id) {
        throw new Error("复制失败");
      }

      const nextResume: ResumeSummary = {
        id: String(duplicatedResume.id),
        title:
          typeof duplicatedResume.title === "string"
            ? duplicatedResume.title
            : `${resume.title} - 副本`,
        templateId:
          typeof duplicatedResume.templateId === "string"
            ? duplicatedResume.templateId
            : resume.templateId,
        updatedAt:
          typeof duplicatedResume.updatedAt === "string"
            ? duplicatedResume.updatedAt
            : new Date().toISOString(),
      };

      setResumes((current) => {
        const next = [nextResume, ...current];
        setResumeLimit((limit) => {
          if (limit.max === null) return limit;
          return {
            ...limit,
            reached: next.length >= limit.max,
          };
        });
        return next;
      });

      setActiveMenuResumeId(null);
      toast.success("已复制简历");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "复制失败");
    } finally {
      setDuplicatingResumeId(null);
    }
  };

  return (
    <div className={styles.sectionShell}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.sectionEyebrow}>Resume Library</span>
          <div className={styles.sectionHeadingRow}>
            <h1 className={styles.sectionTitle}>简历资产</h1>
            <span className={styles.sectionPill}>{resumes.length} 份</span>
          </div>
          <p className={styles.sectionDescription}>
            这里集中管理你保存过的简历版本和模板预览。工作台保留总览与跳转，编辑仍进入原有简历编辑器。
            {creationLimitReached && resumeLimit.max !== null
              ? ` 当前基础版已达到 ${resumeLimit.max} 份简历上限，升级后可继续创建更多版本。`
              : ""}
          </p>
        </div>

        <div className={styles.sectionHeaderActions}>
          <Link
            href="/builder/templates"
            className={cn(styles.buttonBase, styles.secondaryButton)}
          >
            模板中心
          </Link>
          <Link
            href={creationLimitReached ? "/pricing" : "/builder/templates"}
            className={cn(styles.buttonBase, styles.primaryButton)}
          >
            <FilePlus2 size={16} />
            {creationLimitReached ? "升级解锁更多" : "新建简历"}
          </Link>
        </div>
      </header>

      <section className={styles.denseMetricGrid}>
        {fillEntryCards.map((card) => {
          const Icon = card.icon;
          const isPending = creatingEntry === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={cn(
                styles.panel,
                styles.denseMetricCard,
                styles.resumeEntryCard,
                isPending && styles.resumeEntryCardPending,
              )}
              onClick={() => void handleEnterFillEntry(card)}
              disabled={Boolean(creatingEntry)}
            >
              <p className={styles.resumeEntryTitle}>{card.title}</p>
              <p className={styles.metricSubtext}>{card.description}</p>
            </button>
          );
        })}
      </section>

      {loadError ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>简历列表暂时不可用</h2>
          <p className={styles.stateText}>{loadError}</p>
        </section>
      ) : loading ? (
        <section className={styles.resumeGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={styles.loadingPanel} />
          ))}
        </section>
      ) : resumes.length === 0 ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>还没有保存过简历</h2>
          <p className={styles.stateText}>
            从模板中心选择一个模板开始，工作台会自动把你的已保存简历统一收纳在这里。
          </p>
          <div className={styles.stateActions}>
            <Link
              href="/builder/templates"
              className={cn(styles.buttonBase, styles.primaryButton)}
            >
              开始创建
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.resumeGrid}>
          {resumes.map((resume) => {
            const template =
              RESUME_TEMPLATES.find((item) => item.id === resume.templateId) ||
              RESUME_TEMPLATES[0];

            return (
              <article
                key={resume.id}
                className={cn(styles.panel, styles.resumeCard)}
              >
                <div className={styles.resumePreviewShell}>
                  <Link
                    href={`/builder/editor/${resume.id}`}
                    className={styles.resumePreviewLink}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.preview}
                      alt={`${template.name} 模板预览`}
                      className={styles.resumePreview}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </Link>
                  <span
                    className={styles.resumePreviewOverlay}
                    aria-hidden="true"
                  />
                  <div
                    className={cn(
                      styles.resumeCardMenu,
                      activeMenuResumeId === resume.id &&
                        styles.resumeCardMenuOpen,
                    )}
                    data-resume-menu-root="true"
                  >
                    <button
                      type="button"
                      className={styles.resumeCardMenuTrigger}
                      aria-label="更多操作"
                      aria-haspopup="menu"
                      aria-expanded={activeMenuResumeId === resume.id}
                      onClick={() => {
                        setActiveMenuResumeId((current) =>
                          current === resume.id ? null : resume.id,
                        );
                      }}
                      disabled={
                        deletingResumeId === resume.id ||
                        duplicatingResumeId === resume.id
                      }
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeMenuResumeId === resume.id ? (
                      <div className={styles.resumeCardMenuList} role="menu">
                        <Link
                          href={`/builder/editor/${resume.id}`}
                          role="menuitem"
                          className={styles.resumeCardMenuItem}
                          onClick={() => {
                            setActiveMenuResumeId(null);
                          }}
                        >
                          <PenLine size={14} />
                          编辑
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.resumeCardMenuItem}
                          onClick={() => void handleDuplicateResume(resume)}
                          disabled={
                            duplicatingResumeId === resume.id ||
                            deletingResumeId === resume.id
                          }
                        >
                          <Copy size={14} />
                          {duplicatingResumeId === resume.id
                            ? "复制中..."
                            : "复制"}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={cn(
                            styles.resumeCardMenuItem,
                            styles.resumeCardMenuItemDanger,
                          )}
                          onClick={() => void handleDeleteResume(resume.id)}
                          disabled={
                            deletingResumeId === resume.id ||
                            duplicatingResumeId === resume.id
                          }
                        >
                          <Trash2 size={14} />
                          {deletingResumeId === resume.id
                            ? "删除中..."
                            : "删除"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={styles.resumeBody}>
                  <h2 className={styles.resumeTitle}>{resume.title}</h2>
                  <p
                    className={styles.resumeUpdatedAt}
                    title={formatFullDate(resume.updatedAt)}
                  >
                    最后编辑 {formatLastEdited(resume.updatedAt)}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
