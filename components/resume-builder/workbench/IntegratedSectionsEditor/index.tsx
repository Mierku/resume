'use client'

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Award,
  BadgeCheck,
  BookOpen,
  Eye,
  EyeOff,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  Heart,
  Languages,
  Link2,
  Pencil,
  Sparkles,
  Target,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Modal } from '@/components/ui/Modal'
import type { PreviewNavigationTarget } from '@/components/resume-reactive-preview'
import { STANDARD_SECTION_IDS, type ResumeData, type StandardSectionType } from '@/lib/resume/types'
import {
  dedupeSectionIds,
  getSectionDisplayTitle,
  isSectionHidden,
  isStandardSectionId,
  STANDARD_SECTION_LABELS,
} from '../../editor/section-editor-shared'
import { Button, IconChevronRight, IconDelete, IconGrip, IconPlus, Input, Message } from '../../primitives'
import { useResumeBuilderStore } from '../../store/useResumeBuilderStore'
import type { ResumeCompletenessResult } from '../resume-completeness'
import { EditorActionIconButton } from './EditorActionIconButton'
import { setStandardSectionExpandedItem } from './section'
import './IntegratedSectionsEditor.scss'

export type EditorFocusRequest = PreviewNavigationTarget & { requestId: number }

const DEFAULT_EDITOR_SECTION_ORDER: string[] = ['experience', 'projects', 'education', 'summary', 'skills']
const DEFAULT_EDITOR_SECTION_SET = new Set(DEFAULT_EDITOR_SECTION_ORDER)
const ADDABLE_EDITOR_SECTION_ORDER: string[] = [
  ...DEFAULT_EDITOR_SECTION_ORDER,
  'profiles',
  'languages',
  'interests',
  'awards',
  'certifications',
  'publications',
  'volunteer',
  'references',
]

const RESUME_EDITOR_TAB_CHROME_PATH =
  'M 0,36 C 10,36 13.5,34 14,24 L 14,10 C 14.5,2 18,0 30,0 L 130,0 C 142,0 145.5,2 146,10 L 146,24 C 146.5,34 150,36 160,36 Z'
const RESUME_EDITOR_TAB_CHROME_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 0,
}

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  basics: User,
  intention: Target,
  summary: FileText,
  experience: Briefcase,
  projects: FolderOpen,
  education: GraduationCap,
  skills: Wrench,
  profiles: Link2,
  languages: Languages,
  interests: Heart,
  awards: Award,
  certifications: BadgeCheck,
  publications: BookOpen,
  volunteer: Handshake,
  references: User,
}

const EDITOR_FOCUSABLE_SELECTOR =
  'input, textarea, select, button, [role="combobox"], [contenteditable="true"]'

const TAB_SORT_ACTIVATION_CONSTRAINT = {
  distance: 4,
} as const

function createBuilderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function resolveLatestStandardSectionItemId(sectionId: StandardSectionType) {
  const sectionItems = useResumeBuilderStore.getState().data.sections[sectionId].items
  const latestItemIndex = sectionItems.length - 1
  if (latestItemIndex < 0) return null

  const latestItem = sectionItems[latestItemIndex] as { id?: unknown }
  const normalizedId = typeof latestItem.id === 'string' ? latestItem.id : String(latestItem.id ?? '')
  return normalizedId.trim() || `${sectionId}-${latestItemIndex}`
}

function renderEditorTabIcon(sectionId: string) {
  const Icon = TAB_ICON_MAP[sectionId] || FileText
  return <Icon className="resume-editor-tab-icon" size={13} strokeWidth={2} aria-hidden="true" />
}

function hasMeaningfulSectionValue(value: unknown, key?: string): boolean {
  if (key === 'id' || key === 'hidden' || key === 'options' || key === 'icon') return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.some(item => hasMeaningfulSectionValue(item))
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([nestedKey, nestedValue]) =>
      hasMeaningfulSectionValue(nestedValue, nestedKey),
    )
  }
  return false
}

function hasMeaningfulStandardSectionContent(data: ResumeData, sectionId: StandardSectionType) {
  const section = data.sections[sectionId]
  if (!section) return false
  if (section.title.trim() || section.intro.trim()) return true
  return section.items.some(item => hasMeaningfulSectionValue(item))
}

function EditorSectionTabChromeBg() {
  return (
    <svg
      className="resume-editor-tab-bg"
      viewBox="0 0 160 36"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={RESUME_EDITOR_TAB_CHROME_STYLE}
      focusable="false"
    >
      <path d={RESUME_EDITOR_TAB_CHROME_PATH} />
    </svg>
  )
}

function useEditorTabSortSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: TAB_SORT_ACTIVATION_CONSTRAINT,
    }),
  )
}

function resolveItemReorderIndexes(itemIds: string[], event: DragEndEvent) {
  const { active, over } = event
  if (!over) return null

  const activeId = String(active.id)
  const overId = String(over.id)
  if (!activeId || !overId || activeId === overId) return null

  const fromIndex = itemIds.indexOf(activeId)
  const toIndex = itemIds.indexOf(overId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null

  return {
    fromIndex,
    toIndex,
  }
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function escapeAttributeValue(value: string) {
  if (typeof globalThis.CSS !== 'undefined' && typeof globalThis.CSS.escape === 'function') {
    return globalThis.CSS.escape(value)
  }

  return value.replace(/["\\]/g, '\\$&')
}

function findEditorFocusElement(root: ParentNode, target: PreviewNavigationTarget) {
  const sectionSelector = `[data-editor-section-id="${escapeAttributeValue(target.sectionId)}"]`
  const itemSelector = target.itemId
    ? `[data-editor-item-id="${escapeAttributeValue(target.itemId)}"]`
    : ''
  const fieldSelector = target.fieldKey
    ? `[data-editor-field-key~="${escapeAttributeValue(target.fieldKey)}"]`
    : ''

  if (target.itemId && target.fieldKey) {
    const exact = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector}${fieldSelector}`)
    if (exact) return exact

    const nestedExact = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector} ${fieldSelector}`)
    if (nestedExact) return nestedExact
  }

  if (target.fieldKey) {
    const sectionField = root.querySelector<HTMLElement>(`${sectionSelector}${fieldSelector}`)
    if (sectionField) return sectionField

    const nestedSectionField = root.querySelector<HTMLElement>(`${sectionSelector} ${fieldSelector}`)
    if (nestedSectionField) return nestedSectionField
  }

  if (target.itemId) {
    const item = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector}`)
    if (item) return item

    const nestedItem = root.querySelector<HTMLElement>(`${sectionSelector} ${itemSelector}`)
    if (nestedItem) return nestedItem
  }

  return root.querySelector<HTMLElement>(sectionSelector)
}

function AddRowButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" className="resume-add-row-button" onClick={onClick} disabled={disabled}>
      <span className="resume-add-row-button-icon" aria-hidden>
        <IconPlus />
      </span>
      <span>{label}</span>
    </button>
  )
}

interface IntegratedSectionsEditorProps {
  focusRequest: EditorFocusRequest | null
  completeness: ResumeCompletenessResult
  scrollContainerRef: RefObject<HTMLDivElement | null>
  completenessAction: 'ai-diagnosis' | 'auto-fill'
  onOpenAIDiagnosis: () => void
  renderBasicInfoEditor: () => ReactNode
  renderSectionEditorBody: (sectionId: string) => ReactNode
}

interface SortableEditorSectionTabProps {
  sectionId: string;
  title: string;
  active: boolean;
  hidden: boolean;
  locked?: boolean;
  onSelect: () => void;
}

function SortableEditorSectionTab({
  sectionId,
  title,
  active,
  hidden,
  locked = false,
  onSelect,
}: SortableEditorSectionTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionId,
    transition: {
      duration: 250,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });
  const horizontalTransform = transform ? { ...transform, y: 0 } : null;
  const resolvedTransition = isDragging
    ? "none"
    : transition
      ? `${transition}, background-color 200ms ease, border-color 200ms ease, color 200ms ease, opacity 200ms ease`
      : undefined;
  const style: CSSProperties = {
    transform: CSS.Transform.toString(horizontalTransform),
    transition: resolvedTransition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={joinClassNames(
        "resume-editor-tab",
        active && "is-active",
        hidden && "is-hidden",
        locked && "is-locked",
        isDragging && "is-dragging",
      )}
      role="presentation"
      data-dragging={isDragging ? "true" : undefined}
    >
      <EditorSectionTabChromeBg />
      <span className="resume-editor-tab-hover-bg" aria-hidden="true" />
      <button
        type="button"
        className="resume-editor-tab-select"
        data-editor-tab-id={sectionId}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        {...attributes}
        {...listeners}
      >
        <span className="resume-editor-tab-label-row">
          {renderEditorTabIcon(sectionId)}
          <span className="resume-editor-tab-title">{title}</span>
          {hidden ? (
            <span className="resume-editor-tab-meta">已隐藏</span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

interface SortableExistingModuleRowProps {
  sectionId: string;
  title: string;
  showActions?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
}

function SortableExistingModuleRow({
  sectionId,
  title,
  showActions = true,
  canRename = false,
  canDelete = false,
  onRename,
  onDelete,
}: SortableExistingModuleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionId,
    transition: {
      duration: 180,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={joinClassNames(
        "resume-editor-existing-module-row",
        isDragging && "is-dragging",
      )}
      data-dragging={isDragging ? "true" : undefined}
    >
      <button
        type="button"
        className="resume-editor-existing-module-grip"
        aria-label={`拖拽排序${title}`}
        {...attributes}
        {...listeners}
      >
        <IconGrip />
      </button>
      <span className="resume-editor-existing-module-label">{title}</span>
      {showActions ? (
        <div className="resume-editor-existing-module-actions">
          <button
            type="button"
            className={joinClassNames(
              "resume-editor-existing-module-action",
              !canRename && "is-disabled",
            )}
            disabled={!canRename}
            onClick={(event) => {
              event.stopPropagation();
              if (!canRename || !onRename) return;
              onRename();
            }}
            aria-label={`重命名${title}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className={joinClassNames(
              "resume-editor-existing-module-action",
              !canDelete && "is-disabled",
            )}
            disabled={!canDelete}
            onClick={(event) => {
              event.stopPropagation();
              if (!canDelete || !onDelete) return;
              onDelete();
            }}
            aria-label={`删除${title}`}
          >
            <IconDelete />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function IntegratedSectionsEditor({
  focusRequest,
  completeness,
  scrollContainerRef,
  completenessAction,
  onOpenAIDiagnosis,
  renderBasicInfoEditor,
  renderSectionEditorBody,
}: IntegratedSectionsEditorProps) {
  const data = useResumeBuilderStore((state) => state.data);
  const addStandardSectionItem = useResumeBuilderStore(
    (state) => state.addStandardSectionItem,
  );
  const addCustomSectionItem = useResumeBuilderStore(
    (state) => state.addCustomSectionItem,
  );
  const removeCustomSection = useResumeBuilderStore(
    (state) => state.removeCustomSection,
  );
  const updateResumeData = useResumeBuilderStore(
    (state) => state.updateResumeData,
  );
  const [activeSectionId, setActiveSectionId] = useState<string>("basics");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    sectionId: string | null;
    value: string;
  }>({
    open: false,
    sectionId: null,
    value: "",
  });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    sectionId: string | null;
    title: string;
  }>({
    open: false,
    sectionId: null,
    title: "",
  });
  const tabTrackShellRef = useRef<HTMLDivElement | null>(null);
  const lastHandledFocusRequestIdRef = useRef<number>(0);
  const [showTabsLeftMask, setShowTabsLeftMask] = useState(false);
  const [showTabsRightMask, setShowTabsRightMask] = useState(false);
  const tabSortSensors = useEditorTabSortSensors();

  const updateTabsOverflowMask = useCallback(() => {
    const shell = tabTrackShellRef.current;
    if (!shell) {
      setShowTabsLeftMask(false);
      setShowTabsRightMask(false);
      return;
    }

    const maxScrollLeft = shell.scrollWidth - shell.clientWidth;
    if (maxScrollLeft <= 1) {
      setShowTabsLeftMask(false);
      setShowTabsRightMask(false);
      return;
    }

    const leftVisible = shell.scrollLeft > 5;
    const rightVisible =
      shell.scrollLeft + shell.clientWidth < shell.scrollWidth - 5;
    setShowTabsLeftMask(leftVisible);
    setShowTabsRightMask(rightVisible);
  }, []);

  const scrollTabToAnchor = useCallback(
    (sectionId: string, behavior: ScrollBehavior = "smooth") => {
      const shell = tabTrackShellRef.current;
      if (!shell) return;

      const selector = `[data-editor-tab-id="${escapeAttributeValue(sectionId)}"]`;
      const tabButton = shell.querySelector<HTMLElement>(selector);
      if (!tabButton) return;

      const shellRect = shell.getBoundingClientRect();
      const tabRect = tabButton.getBoundingClientRect();
      const relativeTabLeft = tabRect.left - shellRect.left + shell.scrollLeft;
      const desiredLeft = relativeTabLeft - shell.clientWidth * 0.34;
      const maxScrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth);
      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, desiredLeft));

      shell.scrollTo({
        left: nextScrollLeft,
        behavior,
      });
    },
    [],
  );

  const handleTabSelect = useCallback(
    (sectionId: string) => {
      if (sectionId === activeSectionId) {
        scrollTabToAnchor(sectionId);
      } else {
        setActiveSectionId(sectionId);
      }
      setSortMenuOpen(false);
      setAddMenuOpen(false);
    },
    [activeSectionId, scrollTabToAnchor],
  );

  const layoutSectionIds = useMemo(() => {
    const firstPage = data.metadata.layout.pages[0];
    const customIds = data.customSections.map((section) => section.id);
    const known = new Set(["summary", ...STANDARD_SECTION_IDS, ...customIds]);
    const shouldDisplayByContent = (sectionId: string) => {
      if (DEFAULT_EDITOR_SECTION_SET.has(sectionId)) return true;
      if (sectionId === "summary") {
        return Boolean(data.summary.content?.trim());
      }

      if (isStandardSectionId(sectionId)) {
        return hasMeaningfulStandardSectionContent(data, sectionId);
      }

      return customIds.includes(sectionId);
    };

    if (!firstPage) {
      return [...DEFAULT_EDITOR_SECTION_ORDER, ...customIds];
    }

    return dedupeSectionIds([
      ...(firstPage.main || []),
      ...(firstPage.sidebar || []),
    ]).filter(
      (sectionId) => known.has(sectionId) && shouldDisplayByContent(sectionId),
    );
  }, [data]);

  const tabs = useMemo(() => {
    const dynamicTabs = layoutSectionIds
      .filter(
        (sectionId) => sectionId !== "basics" && sectionId !== "intention",
      )
      .map((sectionId) => ({
        id: sectionId,
        title: getSectionDisplayTitle(data, sectionId),
        hidden: isSectionHidden(data, sectionId),
        locked: false,
        removable: true,
        sortable: true,
      }));

    return [
      {
        id: "basics",
        title: "基本信息",
        hidden: false,
        locked: true,
        removable: false,
        sortable: false,
      },
      ...dynamicTabs,
    ];
  }, [data, layoutSectionIds]);

  const sortableTabIds = useMemo(
    () => tabs.filter((tab) => tab.sortable).map((tab) => tab.id),
    [tabs],
  );

  useEffect(() => {
    if (tabs.some((tab) => tab.id === activeSectionId)) return;
    setActiveSectionId(tabs[0]?.id || "basics");
  }, [activeSectionId, tabs]);

  useEffect(() => {
    updateTabsOverflowMask();
  }, [tabs, updateTabsOverflowMask]);

  useEffect(() => {
    const shell = tabTrackShellRef.current;
    if (!shell) return;

    const onScroll = () => {
      updateTabsOverflowMask();
    };

    shell.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateTabsOverflowMask);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateTabsOverflowMask();
      });
      resizeObserver.observe(shell);
      const track = shell.querySelector(".resume-editor-tabs-track");
      if (track instanceof HTMLElement) {
        resizeObserver.observe(track);
      }
    }

    return () => {
      shell.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateTabsOverflowMask);
      resizeObserver?.disconnect();
    };
  }, [updateTabsOverflowMask, tabs.length]);

  useEffect(() => {
    if (!sortMenuOpen && !addMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(".resume-editor-sort-shell") ||
        event.target.closest(".resume-editor-add-shell")
      )
        return;
      setSortMenuOpen(false);
      setAddMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSortMenuOpen(false);
        setAddMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [addMenuOpen, sortMenuOpen]);

  useEffect(() => {
    if (!focusRequest) return;
    if (lastHandledFocusRequestIdRef.current === focusRequest.requestId) return;
    lastHandledFocusRequestIdRef.current = focusRequest.requestId;

    let cancelled = false;
    let retryTimer: number | null = null;
    let frameA = 0;
    let frameB = 0;
    const normalizedSectionId =
      focusRequest.sectionId === "intention" ? "basics" : focusRequest.sectionId;
    const normalizedTarget = {
      ...focusRequest,
      sectionId: normalizedSectionId,
    };

    const revealTarget = (attempt = 0) => {
      if (cancelled) return;
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const targetElement = findEditorFocusElement(
        scrollContainer,
        normalizedTarget,
      );
      if (!targetElement) {
        if (attempt < 8) {
          retryTimer = window.setTimeout(() => revealTarget(attempt + 1), 70);
        }
        return;
      }

      targetElement.scrollIntoView({
        behavior: attempt === 0 ? "smooth" : "auto",
        block: "center",
        inline: "nearest",
      });

      const focusable = targetElement.matches(EDITOR_FOCUSABLE_SELECTOR)
        ? targetElement
        : targetElement.querySelector<HTMLElement>(EDITOR_FOCUSABLE_SELECTOR);
      focusable?.focus({ preventScroll: true });
    };

    if (tabs.some((tab) => tab.id === normalizedSectionId)) {
      setActiveSectionId(normalizedSectionId);
    }

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        scrollTabToAnchor(normalizedSectionId, "auto");
        revealTarget();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [focusRequest, scrollContainerRef, scrollTabToAnchor, tabs]);

  const toggleSectionHidden = (sectionId: string, nextHidden: boolean) => {
    if (sectionId === "basics") {
      Message.warning("基础板块不支持隐藏");
      return;
    }

    updateResumeData((draft) => {
      if (sectionId === "summary") {
        draft.summary.hidden = nextHidden;
        return;
      }

      if (isStandardSectionId(sectionId)) {
        draft.sections[sectionId].hidden = nextHidden;
        return;
      }

      const custom = draft.customSections.find(
        (section) => section.id === sectionId,
      );
      if (custom) {
        custom.hidden = nextHidden;
      }
    });
  };

  const openRenameDialog = (sectionId: string) => {
    if (sectionId === "basics") {
      Message.warning("基础板块不支持重命名");
      return;
    }

    const currentTitle = getSectionDisplayTitle(data, sectionId);
    setRenameModal({
      open: true,
      sectionId,
      value: currentTitle,
    });
    setSortMenuOpen(false);
  };

  const openDeleteDialog = (sectionId: string) => {
    if (sectionId === "basics") {
      Message.warning("基础板块不支持删除");
      return;
    }

    setDeleteModal({
      open: true,
      sectionId,
      title: getSectionDisplayTitle(data, sectionId),
    });
    setSortMenuOpen(false);
  };

  const addSectionItem = (sectionId: string) => {
    if (
      sectionId === "summary" ||
      sectionId === "basics"
    ) {
      return;
    }

    if (isStandardSectionId(sectionId)) {
      addStandardSectionItem(sectionId);
      const latestItemId = resolveLatestStandardSectionItemId(sectionId);
      if (latestItemId) {
        setStandardSectionExpandedItem(sectionId, latestItemId);
      }
      return;
    }

    addCustomSectionItem(sectionId);
  };

  const resolveNextActiveTab = (removedSectionId: string) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === removedSectionId);
    if (currentIndex < 0) return tabs[0]?.id || "basics";
    return tabs[currentIndex + 1]?.id || tabs[currentIndex - 1]?.id || "basics";
  };

  const handleRenameConfirm = () => {
    if (!renameModal.sectionId) return;
    const nextTitle = renameModal.value.trim();
    if (!nextTitle) {
      Message.warning("名称不能为空");
      return;
    }

    updateResumeData((draft) => {
      const sectionId = renameModal.sectionId as string;
      if (sectionId === "summary") {
        draft.summary.title = nextTitle;
        return;
      }

      if (isStandardSectionId(sectionId)) {
        draft.sections[sectionId].title = nextTitle;
        return;
      }

      const custom = draft.customSections.find(
        (section) => section.id === sectionId,
      );
      if (custom) {
        custom.title = nextTitle;
      }
    });

    setRenameModal({ open: false, sectionId: null, value: "" });
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.sectionId) return;

    const sectionId = deleteModal.sectionId;
    const nextActiveTab = resolveNextActiveTab(sectionId);
    const isCustomSection =
      !isStandardSectionId(sectionId) && sectionId !== "summary";

    if (isCustomSection) {
      removeCustomSection(sectionId);
    } else {
      updateResumeData((draft) => {
        if (sectionId === "summary") {
          draft.summary.hidden = true;
        } else if (isStandardSectionId(sectionId)) {
          draft.sections[sectionId].hidden = true;
        }

        draft.metadata.layout.pages = draft.metadata.layout.pages.map(
          (page) => ({
            ...page,
            main: page.main.filter((item) => item !== sectionId),
            sidebar: page.sidebar.filter((item) => item !== sectionId),
          }),
        );
      });
    }

    setActiveSectionId(nextActiveTab);
    setSortMenuOpen(false);
    setDeleteModal({ open: false, sectionId: null, title: "" });
  };

  const handleTabDragEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(sortableTabIds, event);
    if (!indexes) return;

    const moved = arrayMove(sortableTabIds, indexes.fromIndex, indexes.toIndex);
    updateResumeData((draft) => {
      const firstPage = draft.metadata.layout.pages[0];
      if (!firstPage) return;
      firstPage.main = moved;
      firstPage.sidebar = [];
      firstPage.fullWidth = true;
    });
  };

  const presentLayoutSectionIds = useMemo(
    () => new Set(layoutSectionIds),
    [layoutSectionIds],
  );
  const addableSectionIds = useMemo(
    () =>
      ADDABLE_EDITOR_SECTION_ORDER.filter(
        (sectionId) => !presentLayoutSectionIds.has(sectionId),
      ),
    [presentLayoutSectionIds],
  );
  const addSectionToEditor = (sectionId: string) => {
    const shouldSeedDefaultItem =
      isStandardSectionId(sectionId) &&
      data.sections[sectionId].items.length === 0;

    updateResumeData((draft) => {
      const firstPage = draft.metadata.layout.pages[0] || {
        fullWidth: true,
        main: [],
        sidebar: [],
      };
      if (!draft.metadata.layout.pages[0]) {
        draft.metadata.layout.pages = [firstPage];
      }

      const merged = dedupeSectionIds([
        ...(firstPage.main || []),
        ...(firstPage.sidebar || []),
      ]);
      if (!merged.includes(sectionId)) {
        merged.push(sectionId);
      }
      firstPage.main = merged;
      firstPage.sidebar = [];
      firstPage.fullWidth = true;

      if (sectionId === "summary") {
        draft.summary.hidden = false;
      } else if (isStandardSectionId(sectionId)) {
        if (!draft.sections[sectionId].title.trim()) {
          draft.sections[sectionId].title = STANDARD_SECTION_LABELS[sectionId];
        }
        draft.sections[sectionId].hidden = false;
      }
    });

    if (shouldSeedDefaultItem) {
      addStandardSectionItem(sectionId);
      const latestItemId = resolveLatestStandardSectionItemId(sectionId);
      if (latestItemId) {
        setStandardSectionExpandedItem(sectionId, latestItemId);
      }
    }

    setActiveSectionId(sectionId);
    setAddMenuOpen(false);
    setSortMenuOpen(false);
  };

  const addCustomSectionFromHeader = () => {
    const sectionId = createBuilderId();
    updateResumeData((draft) => {
      draft.customSections.push({
        id: sectionId,
        type: "summary",
        title: "自定义板块",
        columns: 1,
        hidden: false,
        items: [
          {
            id: createBuilderId(),
            hidden: false,
            content: "",
          },
        ],
      });

      const firstPage = draft.metadata.layout.pages[0] || {
        fullWidth: true,
        main: [],
        sidebar: [],
      };
      if (!draft.metadata.layout.pages[0]) {
        draft.metadata.layout.pages = [firstPage];
      }

      firstPage.main = dedupeSectionIds([
        ...(firstPage.main || []),
        ...(firstPage.sidebar || []),
        sectionId,
      ]);
      firstPage.sidebar = [];
      firstPage.fullWidth = true;
    });

    setActiveSectionId(sectionId);
    setAddMenuOpen(false);
    setSortMenuOpen(false);
  };

  const activeSectionTab =
    tabs.find((tab) => tab.id === activeSectionId) || tabs[0];
  const existingModuleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== "basics"),
    [tabs],
  );
  const existingModuleSortableIds = useMemo(
    () => existingModuleTabs.map((tab) => tab.id),
    [existingModuleTabs],
  );
  const existingModuleSortSensors = useEditorTabSortSensors();
  const resolvedActiveSectionId = activeSectionTab?.id || "basics";
  const showAddItemRow =
    resolvedActiveSectionId !== "summary" &&
    resolvedActiveSectionId !== "basics";
  const activeHiddenLabel = activeSectionTab?.hidden ? "显示板块" : "隐藏板块";
  const activeCanRename = Boolean(activeSectionTab && !activeSectionTab.locked);
  const activeCanDelete = Boolean(activeSectionTab?.removable);
  const activeCanToggleHidden = Boolean(
    activeSectionTab && !activeSectionTab.locked,
  );
  const activeCanSort = existingModuleTabs.length > 1;
  const showAddSectionMenu = addMenuOpen;
  const isAutoFillCompletenessAction = completenessAction === "auto-fill";
  const completenessActionLabel = isAutoFillCompletenessAction
    ? "自动填写"
    : "AI 诊断";
  const completenessActionHint = isAutoFillCompletenessAction
    ? "点击使用自动填写，快速补全简历关键信息"
    : "点击使用 AI 诊断，获得结构与措辞优化建议";

  const handleExistingModuleSortEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(existingModuleSortableIds, event);
    if (!indexes) return;

    const moved = arrayMove(
      existingModuleSortableIds,
      indexes.fromIndex,
      indexes.toIndex,
    );
    updateResumeData((draft) => {
      const firstPage = draft.metadata.layout.pages[0];
      if (!firstPage) return;

      const merged = dedupeSectionIds([
        ...(firstPage.main || []),
        ...(firstPage.sidebar || []),
      ]);
      const rest = merged.filter(
        (sectionId) => !existingModuleSortableIds.includes(sectionId),
      );
      firstPage.main = [...moved, ...rest];
      firstPage.sidebar = [];
      firstPage.fullWidth = true;
    });
  };

  return (
    <div className="resume-editor-tabs-layout">
      <div className="resume-editor-tabs-head">
        <button
          type="button"
          className={`resume-editor-ai-diagnosis-card is-${completeness.tone}`}
          aria-label={`内容完善度 ${completeness.score} 分，点击使用${completenessActionLabel}`}
          onClick={onOpenAIDiagnosis}
        >
          <div className="resume-editor-ai-diagnosis-copy">
            <strong>内容完善度 {completeness.score}%</strong>
            <span>{completenessActionHint}</span>
          </div>
          <div className="resume-editor-ai-diagnosis-cta">
            <Sparkles size={14} aria-hidden="true" />
            <span>{completenessActionLabel}</span>
            <IconChevronRight />
          </div>
        </button>

        <div className="resume-editor-tabs-head-main">
          <div
            className="resume-editor-tabs-track-wrap"
            data-left-mask={showTabsLeftMask ? "true" : "false"}
            data-right-mask={showTabsRightMask ? "true" : "false"}
          >
            <span
              className="resume-editor-tabs-scroll-mask is-left"
              aria-hidden="true"
            />
            <span
              className="resume-editor-tabs-scroll-mask is-right"
              aria-hidden="true"
            />
            <div
              ref={tabTrackShellRef}
              className="resume-editor-tabs-track-shell"
            >
              <DndContext
                sensors={tabSortSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTabDragEnd}
              >
                <SortableContext
                  items={sortableTabIds}
                  strategy={horizontalListSortingStrategy}
                >
                  <div
                    className="resume-editor-tabs-track"
                    role="tablist"
                    aria-label="属性编辑器板块标签"
                  >
                    {tabs.map((tab) => {
                      if (!tab.sortable) {
                        return (
                          <div
                            key={tab.id}
                            className={joinClassNames(
                              "resume-editor-tab",
                              activeSectionId === tab.id && "is-active",
                              tab.hidden && "is-hidden",
                              tab.locked && "is-locked",
                            )}
                            role="presentation"
                          >
                            <EditorSectionTabChromeBg />
                            <span
                              className="resume-editor-tab-hover-bg"
                              aria-hidden="true"
                            />
                            <button
                              type="button"
                              className="resume-editor-tab-select"
                              role="tab"
                              aria-selected={activeSectionId === tab.id}
                              tabIndex={activeSectionId === tab.id ? 0 : -1}
                              data-editor-tab-id={tab.id}
                              onClick={() => handleTabSelect(tab.id)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  handleTabSelect(tab.id);
                                }
                              }}
                            >
                              <span className="resume-editor-tab-label-row">
                                {renderEditorTabIcon(tab.id)}
                                <span className="resume-editor-tab-title">
                                  {tab.title}
                                </span>
                                {tab.hidden ? (
                                  <span className="resume-editor-tab-meta">
                                    已隐藏
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <SortableEditorSectionTab
                          key={tab.id}
                          sectionId={tab.id}
                          title={tab.title}
                          active={activeSectionId === tab.id}
                          hidden={tab.hidden}
                          locked={tab.locked}
                          onSelect={() => {
                            handleTabSelect(tab.id);
                          }}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="resume-editor-tabs-head-actions">
            <div
              className="resume-editor-add-shell"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className={joinClassNames(
                  "resume-item-menu",
                  "resume-editor-add-menu",
                  showAddSectionMenu && "is-open",
                )}
              >
                <Button
                  type="text"
                  size="mini"
                  className="resume-inline-icon-btn"
                  icon={<IconPlus />}
                  onClick={() => {
                    setSortMenuOpen(false);
                    setAddMenuOpen((open) => !open);
                  }}
                  aria-label="添加板块"
                />
                {showAddSectionMenu ? (
                  <div className="resume-item-menu-popover resume-editor-add-menu-panel">
                    <section className="resume-editor-add-menu-section">
                      <h4 className="resume-editor-add-menu-title">已有模块</h4>
                      <div className="resume-editor-existing-modules-list">
                        {existingModuleTabs.length > 0 ? (
                          <DndContext
                            sensors={existingModuleSortSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleExistingModuleSortEnd}
                          >
                            <SortableContext
                              items={existingModuleSortableIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {existingModuleTabs.map((tab) => (
                                <SortableExistingModuleRow
                                  key={tab.id}
                                  sectionId={tab.id}
                                  title={tab.title}
                                  canRename={!tab.locked}
                                  canDelete={tab.removable}
                                  onRename={() => {
                                    openRenameDialog(tab.id);
                                    setAddMenuOpen(false);
                                    setSortMenuOpen(false);
                                  }}
                                  onDelete={() => {
                                    openDeleteDialog(tab.id);
                                    setAddMenuOpen(false);
                                    setSortMenuOpen(false);
                                  }}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="resume-editor-existing-module-empty">
                            暂无模块
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="resume-editor-add-menu-section">
                      <h4 className="resume-editor-add-menu-title">添加模块</h4>
                      <div className="resume-editor-add-modules-list">
                        {addableSectionIds.map((sectionId) => (
                          <button
                            key={sectionId}
                            type="button"
                            className="resume-editor-add-module-row"
                            onClick={(event) => {
                              event.stopPropagation();
                              addSectionToEditor(sectionId);
                              setSortMenuOpen(false);
                            }}
                          >
                            <span
                              className="resume-editor-add-module-plus"
                              aria-hidden="true"
                            >
                              <IconPlus />
                            </span>
                            <span>
                              {getSectionDisplayTitle(data, sectionId)}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="resume-editor-add-module-row"
                          onClick={(event) => {
                            event.stopPropagation();
                            addCustomSectionFromHeader();
                            setSortMenuOpen(false);
                          }}
                        >
                          <span
                            className="resume-editor-add-module-plus"
                            aria-hidden="true"
                          >
                            <IconPlus />
                          </span>
                          <span>自定义</span>
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="scroll-shell resume-scroll-shell resume-editor-tab-content-scroll"
        data-scroll-tone="panel"
        data-scroll-reveal="always"
        data-scroll-axis="y"
      >
        <div className="resume-side-panel-body resume-workbench-panel-body resume-editor-panel-body resume-editor-tab-content-body">
          <div
            data-editor-section-id={resolvedActiveSectionId}
            className="resume-editor-tab-content resume-focus-target"
          >
            <div className="resume-editor-content-head">
              <div className="resume-editor-content-head-main">
                <h3 className="resume-editor-content-title">
                  {activeSectionTab?.title || "基本信息"}
                </h3>
                {activeCanRename ? (
                  <EditorActionIconButton
                    label="重命名"
                    icon={<Pencil size={14} />}
                    onClick={() => {
                      openRenameDialog(resolvedActiveSectionId);
                    }}
                  />
                ) : null}
              </div>
              <div className="resume-editor-content-head-actions">
                {activeCanSort ? (
                  <div
                    className="resume-editor-sort-shell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div
                      className={joinClassNames(
                        "resume-item-menu",
                        "resume-editor-sort-menu",
                        sortMenuOpen && "is-open",
                      )}
                    >
                      <EditorActionIconButton
                        label="排序"
                        icon={<IconGrip />}
                        active={sortMenuOpen}
                        onClick={() => {
                          setAddMenuOpen(false);
                          setSortMenuOpen((open) => !open);
                        }}
                      />
                      {sortMenuOpen ? (
                        <div className="resume-item-menu-popover resume-editor-sort-menu-panel">
                          <h4 className="resume-editor-sort-menu-title">
                            拖拽排序
                          </h4>
                          <div className="resume-editor-existing-modules-list">
                            <DndContext
                              sensors={existingModuleSortSensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleExistingModuleSortEnd}
                            >
                              <SortableContext
                                items={existingModuleSortableIds}
                                strategy={verticalListSortingStrategy}
                              >
                                {existingModuleTabs.map((tab) => (
                                  <SortableExistingModuleRow
                                    key={tab.id}
                                    sectionId={tab.id}
                                    title={tab.title}
                                    showActions={false}
                                  />
                                ))}
                              </SortableContext>
                            </DndContext>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activeCanToggleHidden && activeSectionTab ? (
                  <EditorActionIconButton
                    label={activeHiddenLabel}
                    icon={
                      activeSectionTab.hidden ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} />
                      )
                    }
                    onClick={() => {
                      toggleSectionHidden(
                        activeSectionTab.id,
                        !activeSectionTab.hidden,
                      );
                    }}
                  />
                ) : null}

                {activeCanDelete ? (
                  <EditorActionIconButton
                    label="删除"
                    icon={<IconDelete />}
                    danger
                    onClick={() => {
                      openDeleteDialog(resolvedActiveSectionId);
                    }}
                  />
                ) : null}
              </div>
            </div>

            {resolvedActiveSectionId === "basics" ? (
              renderBasicInfoEditor()
            ) : (
              renderSectionEditorBody(resolvedActiveSectionId)
            )}

            {showAddItemRow ? (
              <div className="resume-editor-tab-add-row">
                <AddRowButton
                  label="新增条目"
                  onClick={() => addSectionItem(resolvedActiveSectionId)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        open={renameModal.open}
        onClose={() =>
          setRenameModal({ open: false, sectionId: null, value: "" })
        }
        title="重命名板块"
        footer={
          <>
            <Button
              type="text"
              onClick={() =>
                setRenameModal({ open: false, sectionId: null, value: "" })
              }
            >
              取消
            </Button>
            <Button type="secondary" onClick={handleRenameConfirm}>
              确认
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">
            板块名称
          </label>
          <Input
            value={renameModal.value}
            onChange={(value) => setRenameModal((prev) => ({ ...prev, value }))}
          />
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        onClose={() =>
          setDeleteModal({ open: false, sectionId: null, title: "" })
        }
        title="删除板块"
        footer={
          <>
            <Button
              type="text"
              onClick={() =>
                setDeleteModal({ open: false, sectionId: null, title: "" })
              }
            >
              取消
            </Button>
            <Button
              type="secondary"
              status="danger"
              onClick={handleDeleteConfirm}
            >
              删除
            </Button>
          </>
        }
      >
        <p>确认删除「{deleteModal.title}」吗？删除后不可恢复。</p>
      </Modal>
    </div>
  );
}
