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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Award,
  BadgeCheck,
  BookOpen,
  CircleHelp,
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
import { Tip } from '@/components/ui/Tip'
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

const RESUME_EDITOR_NAV_TAB_CHROME_PATH =
  'M0 0C0 4.41822 3.5818 7.99991 8 8H126C130.418 8 134 11.5817 134 16V40C134 44.4183 130.418 48 126 48H8C3.5818 48.0001 0 51.5818 0 56V0Z'
const RESUME_EDITOR_NAV_TAB_CHROME_STYLE: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 0,
  width: '100%',
  height: '56px',
  transform: 'translateY(-50%) scaleX(-1)',
  transformOrigin: 'center center',
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

function EditorSectionNavTabChromeBg() {
  return (
    <svg
      className="resume-editor-section-nav-bg"
      viewBox="0 0 134 56"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={RESUME_EDITOR_NAV_TAB_CHROME_STYLE}
      focusable="false"
    >
      <path d={RESUME_EDITOR_NAV_TAB_CHROME_PATH} />
    </svg>
  )
}

function renderSectionNavItemInner(
  sectionId: string,
  title: string,
  hidden: boolean,
  custom = false,
) {
  return (
    <>
      <EditorSectionNavTabChromeBg />
      <span
        className="resume-editor-section-nav-hover-bg"
        aria-hidden="true"
      />
      <span className="resume-editor-section-nav-icon-wrap">
        {renderEditorTabIcon(sectionId)}
      </span>
      <span className="resume-editor-section-nav-copy">
        <span className="resume-editor-section-nav-title-text">
          {title}
        </span>
        {custom ? (
          <span className="resume-editor-section-nav-custom-tag">
            自定义
          </span>
        ) : null}
      </span>
    </>
  )
}

interface EditorSectionNavButtonProps {
  sectionId: string
  title: string
  active: boolean
  hidden: boolean
  custom?: boolean
  locked?: boolean
  sortable?: boolean
  dragging?: boolean
  style?: CSSProperties
  setNodeRef?: (node: HTMLButtonElement | null) => void
  attributes?: Record<string, any>
  listeners?: Record<string, any>
  onSelect: () => void
}

function EditorSectionNavButton({
  sectionId,
  title,
  active,
  hidden,
  custom = false,
  locked = false,
  sortable = false,
  dragging = false,
  style,
  setNodeRef,
  attributes,
  listeners,
  onSelect,
}: EditorSectionNavButtonProps) {
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={joinClassNames(
        'resume-editor-section-nav-item',
        sortable && 'is-sortable',
        active && 'is-active',
        hidden && 'is-hidden',
        locked && 'is-locked',
        dragging && 'is-dragging',
      )}
      {...attributes}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      data-editor-nav-id={sectionId}
      data-dragging={dragging ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      {...listeners}
    >
      {renderSectionNavItemInner(sectionId, title, hidden, custom)}
    </button>
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

interface SortableEditorSectionNavItemProps {
  sectionId: string
  title: string
  active: boolean
  hidden: boolean
  custom?: boolean
  locked?: boolean
  onSelect: () => void
}

function SortableEditorSectionNavItem({
  sectionId,
  title,
  active,
  hidden,
  custom = false,
  locked = false,
  onSelect,
}: SortableEditorSectionNavItemProps) {
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
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  })

  const verticalTransform = transform ? { ...transform, x: 0 } : null
  const style: CSSProperties = {
    transform: verticalTransform
      ? CSS.Transform.toString(verticalTransform)
      : undefined,
    transition: isDragging ? 'none' : transition,
  }

  return (
    <EditorSectionNavButton
      sectionId={sectionId}
      title={title}
      active={active}
      hidden={hidden}
      custom={custom}
      locked={locked}
      sortable
      dragging={isDragging}
      style={style}
      setNodeRef={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      onSelect={onSelect}
    />
  )
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

interface EditorSectionNavGroupProps {
  label?: string
  tabs: Array<{
    id: string
    title: string
    hidden: boolean
    custom?: boolean
    locked?: boolean
    sortable?: boolean
    removable?: boolean
  }>
  sortableIds: string[]
  activeSectionId: string
  sensors: ReturnType<typeof useEditorTabSortSensors>
  onSelect: (sectionId: string) => void
  onDragEnd: (event: DragEndEvent) => void
  emptyMessage?: string
}

function EditorSectionNavGroup({
  label,
  tabs,
  sortableIds,
  activeSectionId,
  sensors,
  onSelect,
  onDragEnd,
  emptyMessage,
}: EditorSectionNavGroupProps) {
  if (tabs.length === 0 && !emptyMessage) {
    return null
  }

  return (
    <div className="resume-editor-section-nav-group">
      {label ? (
        <div className="resume-editor-section-nav-group-label">
          {label}
        </div>
      ) : null}
      {tabs.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {tabs.map((tab) => (
              sortableIds.includes(tab.id) ? (
                <SortableEditorSectionNavItem
                  key={tab.id}
                  sectionId={tab.id}
                  title={tab.title}
                  active={activeSectionId === tab.id}
                  hidden={tab.hidden}
                  custom={tab.custom}
                  locked={tab.locked}
                  onSelect={() => onSelect(tab.id)}
                />
              ) : (
                <EditorSectionNavButton
                  key={tab.id}
                  sectionId={tab.id}
                  title={tab.title}
                  active={activeSectionId === tab.id}
                  hidden={tab.hidden}
                  custom={tab.custom}
                  locked={tab.locked}
                  onSelect={() => onSelect(tab.id)}
                />
              )
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <div className="resume-editor-section-nav-empty">
          {emptyMessage}
        </div>
      )}
    </div>
  )
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
  const [onlineApplyInfoOpen, setOnlineApplyInfoOpen] = useState(false);
  const sectionNavListRef = useRef<HTMLDivElement | null>(null);
  const lastHandledFocusRequestIdRef = useRef<number>(0);

  const scrollSectionNavToAnchor = useCallback(
    (sectionId: string, behavior: ScrollBehavior = "smooth") => {
      const shell = sectionNavListRef.current;
      if (!shell) return;

      const selector = `[data-editor-nav-id="${escapeAttributeValue(sectionId)}"]`;
      const navItem = shell.querySelector<HTMLElement>(selector);
      if (!navItem) return;

      navItem.scrollIntoView({
        block: "nearest",
        behavior,
      });
    },
    [],
  );

  const handleTabSelect = useCallback(
    (sectionId: string) => {
      if (sectionId === activeSectionId) {
        scrollSectionNavToAnchor(sectionId);
      } else {
        setActiveSectionId(sectionId);
      }
      setSortMenuOpen(false);
      setAddMenuOpen(false);
    },
    [activeSectionId, scrollSectionNavToAnchor],
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
    const customSectionIdSet = new Set(data.customSections.map((section) => section.id));
    const dynamicTabs = layoutSectionIds
      .filter(
        (sectionId) => sectionId !== "basics" && sectionId !== "intention",
      )
      .map((sectionId) => ({
        id: sectionId,
        title: getSectionDisplayTitle(data, sectionId),
        hidden: isSectionHidden(data, sectionId),
        custom: customSectionIdSet.has(sectionId),
        locked: false,
        removable: true,
        sortable: true,
      }));

    return [
      {
        id: "basics",
        title: "基本信息",
        hidden: false,
        custom: false,
        locked: true,
        removable: false,
        sortable: false,
      },
      ...dynamicTabs,
    ];
  }, [data, layoutSectionIds]);
  const presentEditorSectionIds = useMemo(
    () => new Set(tabs.filter((tab) => tab.id !== "basics").map((tab) => tab.id)),
    [tabs],
  );
  const latentHiddenTabs = useMemo(
    () =>
      ADDABLE_EDITOR_SECTION_ORDER.filter(
        (sectionId) => !presentEditorSectionIds.has(sectionId),
      ).map((sectionId) => ({
        id: sectionId,
        title: getSectionDisplayTitle(data, sectionId),
        hidden: true,
        custom: false,
        locked: false,
        removable: false,
        sortable: false,
      })),
    [data, presentEditorSectionIds],
  );
  const navTabs = useMemo(
    () => [...tabs, ...latentHiddenTabs],
    [tabs, latentHiddenTabs],
  );

  useEffect(() => {
    if (navTabs.some((tab) => tab.id === activeSectionId)) return;
    setActiveSectionId(navTabs[0]?.id || "basics");
  }, [activeSectionId, navTabs]);

  useEffect(() => {
    scrollSectionNavToAnchor(activeSectionId, "auto");
  }, [activeSectionId, scrollSectionNavToAnchor, tabs.length]);

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

    if (navTabs.some((tab) => tab.id === normalizedSectionId)) {
      setActiveSectionId(normalizedSectionId);
    }

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        scrollSectionNavToAnchor(normalizedSectionId, "auto");
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
  }, [focusRequest, navTabs, scrollContainerRef, scrollSectionNavToAnchor]);

  const toggleSectionHidden = (sectionId: string, nextHidden: boolean) => {
    if (sectionId === "basics") {
      Message.warning("基础板块不支持隐藏");
      return;
    }

    updateResumeData((draft) => {
      if (sectionId === "summary") {
        draft.summary.hidden = nextHidden;
        if (!nextHidden) {
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
        }
        return;
      }

      if (isStandardSectionId(sectionId)) {
        draft.sections[sectionId].hidden = nextHidden;
        if (!nextHidden) {
          if (!draft.sections[sectionId].title.trim()) {
            draft.sections[sectionId].title = STANDARD_SECTION_LABELS[sectionId];
          }

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
        }
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

  const addableSectionIds = useMemo(
    () =>
      ADDABLE_EDITOR_SECTION_ORDER.filter(
        (sectionId) => !presentEditorSectionIds.has(sectionId),
      ),
    [presentEditorSectionIds],
  );
  const addSectionToEditor = (sectionId: string) => {
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
    navTabs.find((tab) => tab.id === activeSectionId) || navTabs[0];
  const existingModuleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== "basics"),
    [tabs],
  );
  const existingModuleSortableIds = useMemo(
    () => existingModuleTabs.map((tab) => tab.id),
    [existingModuleTabs],
  );
  const visibleModuleTabs = useMemo(
    () => existingModuleTabs.filter((tab) => !tab.hidden),
    [existingModuleTabs],
  );
  const hiddenModuleTabs = useMemo(
    () => existingModuleTabs.filter((tab) => tab.hidden),
    [existingModuleTabs],
  );
  const applyOnlyHiddenTabs = useMemo(
    () => [...hiddenModuleTabs, ...latentHiddenTabs],
    [hiddenModuleTabs, latentHiddenTabs],
  );
  const visibleModuleSortableIds = useMemo(
    () => visibleModuleTabs.map((tab) => tab.id),
    [visibleModuleTabs],
  );
  const hiddenModuleSortableIds = useMemo(
    () => hiddenModuleTabs.map((tab) => tab.id),
    [hiddenModuleTabs],
  );
  const navSectionSortSensors = useEditorTabSortSensors();
  const existingModuleSortSensors = useEditorTabSortSensors();
  const resolvedActiveSectionId = activeSectionTab?.id || "basics";
  const onlineApplyEnabled = Boolean(data.metadata.onlineApply?.enabled);
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

  const reorderSectionGroup = useCallback(
    (groupIds: string[], event: DragEndEvent) => {
      const indexes = resolveItemReorderIndexes(groupIds, event);
      if (!indexes) return;

      const moved = arrayMove(groupIds, indexes.fromIndex, indexes.toIndex);
      updateResumeData((draft) => {
        const firstPage = draft.metadata.layout.pages[0];
        if (!firstPage) return;

        const merged = dedupeSectionIds([
          ...(firstPage.main || []),
          ...(firstPage.sidebar || []),
        ]);
        const groupSet = new Set(groupIds);
        const groupOrderLookup = new Map(
          moved.map((sectionId, index) => [sectionId, index]),
        );

        const sorted = [...merged].sort((left, right) => {
          const leftInGroup = groupSet.has(left);
          const rightInGroup = groupSet.has(right);
          if (leftInGroup && rightInGroup) {
            return (
              (groupOrderLookup.get(left) ?? 0) -
              (groupOrderLookup.get(right) ?? 0)
            );
          }
          return 0;
        });

        firstPage.main = sorted;
        firstPage.sidebar = [];
        firstPage.fullWidth = true;
      });
    },
    [updateResumeData],
  );

  const handleExistingModuleSortEnd = useCallback(
    (event: DragEndEvent) => {
      reorderSectionGroup(existingModuleSortableIds, event);
    },
    [existingModuleSortableIds, reorderSectionGroup],
  );

  const handleVisibleSectionNavSortEnd = useCallback(
    (event: DragEndEvent) => {
      reorderSectionGroup(visibleModuleSortableIds, event);
    },
    [reorderSectionGroup, visibleModuleSortableIds],
  );

  const handleHiddenSectionNavSortEnd = useCallback(
    (event: DragEndEvent) => {
      reorderSectionGroup(hiddenModuleSortableIds, event);
    },
    [hiddenModuleSortableIds, reorderSectionGroup],
  );

  return (
    <div className="resume-editor-tabs-layout">
      <div className="resume-editor-tabs-head">
        <div className="resume-editor-ai-diagnosis-row">
          <div
            className={`resume-editor-ai-diagnosis-card is-${completeness.tone}`}
          >
            <div className="resume-editor-ai-diagnosis-copy">
              <strong>内容完善度 {completeness.score}%</strong>
              <span>{completenessActionHint}</span>
            </div>
            <button
              type="button"
              className="resume-editor-ai-diagnosis-cta"
              aria-label={`点击使用${completenessActionLabel}`}
              onClick={onOpenAIDiagnosis}
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>{completenessActionLabel}</span>
              <IconChevronRight />
            </button>
          </div>
          <div className="resume-editor-apply-switch-controls">
            <button
              type="button"
              className="resume-typesetting-switch-row resume-editor-apply-switch-row"
              role="switch"
              aria-checked={onlineApplyEnabled}
              onClick={() =>
                updateResumeData((draft) => {
                  draft.metadata.onlineApply.enabled =
                    !draft.metadata.onlineApply.enabled;
                })
              }
            >
              <span
                className={`resume-typesetting-switch${onlineApplyEnabled ? " is-on" : ""}`}
                aria-hidden="true"
              >
                <span className="resume-typesetting-switch-thumb" />
              </span>
              <span
                className={`resume-typesetting-switch-label${onlineApplyEnabled ? " is-on" : ""}`}
              >
                允许网申
              </span>
            </button>
            <Tip
              content="查看允许网申说明"
              placement="bottom"
              triggerClassName="resume-editor-apply-switch-tip-trigger"
            >
              <button
                type="button"
                className="resume-editor-apply-switch-info"
                aria-label="查看允许网申说明"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOnlineApplyInfoOpen(true);
                }}
              >
                <CircleHelp size={14} />
              </button>
            </Tip>
          </div>
        </div>

      </div>

      <div className="resume-editor-split-layout">
        <aside className="resume-editor-sections-nav">
          <div className="resume-editor-sections-nav-head">
            <h4 className="resume-editor-sections-nav-title">板块</h4>
            <div className="resume-editor-sections-nav-head-actions">
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
                    tip="添加与布局"
                    tipPlacement="bottom"
                    onClick={() => {
                      setSortMenuOpen(false);
                      setAddMenuOpen((open) => !open);
                    }}
                    aria-label="添加与布局"
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

          <div
            ref={sectionNavListRef}
            className="resume-editor-sections-nav-list"
            role="tablist"
            aria-label="属性编辑器板块列表"
            aria-orientation="vertical"
          >
            {tabs[0] ? (
              <EditorSectionNavButton
                sectionId={tabs[0].id}
                title={tabs[0].title}
                active={activeSectionId === tabs[0].id}
                hidden={tabs[0].hidden}
                locked={tabs[0].locked}
                onSelect={() => handleTabSelect(tabs[0].id)}
              />
            ) : null}

            {onlineApplyEnabled ? (
              <>
                <EditorSectionNavGroup
                  label="简历显示"
                  tabs={visibleModuleTabs}
                  sortableIds={visibleModuleSortableIds}
                  activeSectionId={activeSectionId}
                  sensors={navSectionSortSensors}
                  onSelect={handleTabSelect}
                  onDragEnd={handleVisibleSectionNavSortEnd}
                />
                <EditorSectionNavGroup
                  label="仅网申隐藏"
                  tabs={applyOnlyHiddenTabs}
                  sortableIds={hiddenModuleSortableIds}
                  activeSectionId={activeSectionId}
                  sensors={navSectionSortSensors}
                  onSelect={handleTabSelect}
                  onDragEnd={handleHiddenSectionNavSortEnd}
                  emptyMessage="暂无隐藏板块"
                />
              </>
            ) : (
              <EditorSectionNavGroup
                tabs={existingModuleTabs}
                sortableIds={existingModuleSortableIds}
                activeSectionId={activeSectionId}
                sensors={navSectionSortSensors}
                onSelect={handleTabSelect}
                onDragEnd={handleExistingModuleSortEnd}
              />
            )}
          </div>
        </aside>

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
        open={onlineApplyInfoOpen}
        onClose={() => setOnlineApplyInfoOpen(false)}
        title="允许网申说明"
        footer={
          <Button
            type="secondary"
            onClick={() => setOnlineApplyInfoOpen(false)}
          >
            知道了
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>开启后，左侧板块会拆分为“简历显示”和“仅网申隐藏”两组。</p>
          <p>两组内容都可以正常填写、维护，也都可以在后续网申填写时被使用。</p>
          <p>区别只在于：放到“仅网申隐藏”的内容不会出现在简历预览里，但会继续作为网申资料保留。</p>
          <p>这样你只需要维护这一套简历数据，不再需要单独维护一份独立的数据源。</p>
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
