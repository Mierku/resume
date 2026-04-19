"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  normalizeResumeContent,
  type ResumeDataSource,
} from "@/lib/resume/mappers";
import { AuthRequiredModal } from "@/components/ui/Modal";
import { toast } from "@/lib/toast";
import type { PreviewNavigationTarget } from "@/components/resume-reactive-preview";
import { useResumeBuilderStore } from "./store/useResumeBuilderStore";
import { FillToolPanel } from "./workbench/ResumeToolRail/tools/FillToolPanel/FillToolPanel";
import { AIChatPanel } from "./workbench/ResumeToolRail/tools/AIChatPanel/AIChatPanel";
import { HeightDebugPanel } from "./workbench/ResumeToolRail/tools/HeightDebugPanel/HeightDebugPanel";
import { LayoutAndStylePanel } from "./workbench/ResumeToolRail/tools/LayoutAndStylePanel/LayoutAndStylePanel";
import { ResumeBuilderToolbar } from "./workbench/ResumeBuilderToolbar/ResumeBuilderToolbar";
import { SaveStatusTag } from "./workbench/ResumeBuilderToolbar/SaveStatusTag";
import { useAuthSnapshot } from "@/lib/hooks/useAuthSnapshot";
import type { HeightDebugSnapshot } from "@/components/resume-reactive-preview/height-debug";
import { resolveSmartOnePageComputation } from "@/components/resume-reactive-preview/templates/smart-one-page";
import { ResumeWorkbench } from "./workbench";
import {
  IntegratedSectionsEditor,
  type EditorFocusRequest,
} from "./workbench/IntegratedSectionsEditor";
import {
  BasicInfoSectionEditor,
  SectionEditorBody,
} from "./workbench/IntegratedSectionsEditor/section";
import { computeResumeCompleteness } from "./workbench/resume-completeness";
import { type ActiveBuilderTool, type BuilderTool } from "./workbench/types";
import { useEditorPanelWidth } from "./hooks/useEditorPanelWidth";
import { usePreviewWorkspaceControls } from "./hooks/usePreviewWorkspaceControls";
import { useResumeExport } from "./hooks/useResumeExport";
import { useResumeTitleSave } from "./hooks/useResumeTitleSave";
import { useAuthRedirectDraft } from "./hooks/useAuthRedirectDraft";
import { useAIPreviewDraft } from "./hooks/useAIPreviewDraft";
import { useManualSave } from "./hooks/useManualSave";
import { useDataSourceFill } from "./hooks/useDataSourceFill";
// Global style layers: foundation -> workbench override -> feature globals.
import "./builder.scss";
import "./workbench/workbench-layout.scss";
import "./ResumeBuilderClient.scss";
import "./workbench/ResumeBuilderToolbar/ResumeBuilderToolbar.scss";
import "./workbench/ResumeToolRail/tools/FillToolPanel/FillToolPanel.scss";
import "./workbench/IntegratedSectionsEditor/IntegratedSectionsEditor.scss";
import "./workbench/IntegratedSectionsEditor/section/SectionEditorBody.scss";

const ResumeReactivePreview = dynamic(
  () =>
    import("@/components/resume-reactive-preview").then(
      (module) => module.ResumeReactivePreview,
    ),
  { ssr: false },
);

interface ResumeBuilderClientProps {
  initialResume: {
    id: string;
    title: string;
    templateId: string;
    dataSourceId?: string | null;
    shareVisibility?: "private" | "public";
    shareWithRecruiters?: boolean;
    content: unknown;
  };
  dataSources: ResumeDataSource[];
}

export function ResumeBuilderClient({
  initialResume,
  dataSources,
}: ResumeBuilderClientProps) {
  const router = useRouter();
  const { auth, ensureAuthenticated } = useAuthSnapshot({ eager: true });
  const builderScopeRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null);

  const initialize = useResumeBuilderStore((state) => state.initialize);
  const data = useResumeBuilderStore((state) => state.data);
  const initialized = useResumeBuilderStore((state) => state.initialized);
  const storeResumeId = useResumeBuilderStore((state) => state.resumeId);
  const updateResumeData = useResumeBuilderStore(
    (state) => state.updateResumeData,
  );
  const selectedDataSourceId = useResumeBuilderStore(
    (state) => state.selectedDataSourceId,
  );
  const setSelectedDataSourceId = useResumeBuilderStore(
    (state) => state.setSelectedDataSourceId,
  );
  const applyDataSource = useResumeBuilderStore(
    (state) => state.applyDataSource,
  );
  const saveState = useResumeBuilderStore((state) => state.save);

  const [activeTool, setActiveTool] =
    useState<ActiveBuilderTool>("typesetting");
  const [fillStrategy, setFillStrategy] = useState<"overwrite" | "preserve">(
    "overwrite",
  );
  const [sidePanelScrolling, setSidePanelScrolling] = useState(false);
  const [heightDebugSnapshotState, setHeightDebugSnapshotState] = useState<{
    resumeId: string;
    snapshot: HeightDebugSnapshot | null;
  }>({
    resumeId: initialResume.id,
    snapshot: null,
  });
  const [editorFocusRequest, setEditorFocusRequest] =
    useState<EditorFocusRequest | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const focusRequestCounterRef = useRef(0);
  const sidePanelScrollTimerRef = useRef<number | null>(null);
  const isGuestDraft = initialResume.id.startsWith("guest-");
  const [shareVisibility, setShareVisibility] = useState<"private" | "public">(
    initialResume.shareVisibility || "private",
  );
  const [shareWithRecruiters, setShareWithRecruiters] = useState<boolean>(
    Boolean(initialResume.shareWithRecruiters),
  );
  const [shareSaving, setShareSaving] = useState(false);

  const {
    resumeTitle,
    setResumeTitle,
    resumeTitleRef,
    isSavingTitle,
    saveResumeTitle,
  } = useResumeTitleSave({
    resumeId: initialResume.id,
    initialTitle: initialResume.title,
    isGuestDraft,
  });

  const {
    aiPreviewState,
    aiPreviewActionLoading,
    resolvedDraftId,
    activeAIDraftId,
    handlePreviewDraftInCanvas,
    handleCardPreviewRequest,
    runPreviewDraftAction,
    clearAIPreviewOverlay,
    resetAIPreview,
  } = useAIPreviewDraft({
    dataSources,
    initialTemplateId: initialResume.templateId,
  });

  const isTranslateCompareMode =
    activeTool === "ai" && aiPreviewState?.intent === "translate_resume";
  const baseSmartOnePage = useMemo(
    () => resolveSmartOnePageComputation(data),
    [data],
  );
  const aiSmartOnePage = useMemo(
    () =>
      aiPreviewState
        ? resolveSmartOnePageComputation(aiPreviewState.data)
        : null,
    [aiPreviewState],
  );
  const basePreviewData = baseSmartOnePage.effectiveData;
  const comparePreviewData =
    aiSmartOnePage?.effectiveData || aiPreviewState?.data || null;
  const previewRenderSmartState =
    activeTool === "ai" && aiSmartOnePage ? aiSmartOnePage : baseSmartOnePage;
  const previewRenderData = previewRenderSmartState.effectiveData;
  const previewFitKey = useMemo(() => {
    if (!initialized) return `${initialResume.id}:0`;
    if (isTranslateCompareMode && aiPreviewState) {
      return `${initialResume.id}:compare:${aiPreviewState.draftId || "preview"}`;
    }
    return `${initialResume.id}:single`;
  }, [
    aiPreviewState,
    initialResume.id,
    initialized,
    isTranslateCompareMode,
  ]);

  const {
    editorPanelWidth,
    handleEditorPanelResizeStart,
    handleEditorPanelResizeMove,
    handleEditorPanelResizeEnd,
  } = useEditorPanelWidth({
    builderScopeRef,
  });

  const {
    previewScale,
    previewScrollSpaceHeight,
    previewReady: previewAutoFitReady,
    verticalPadding: previewVerticalPadding,
    onZoomIn: handlePreviewZoomIn,
    onZoomOut: handlePreviewZoomOut,
    onCenter: handlePreviewCenter,
    onFit: fitPreviewToHeight,
    onPreviewPointerEnter: handlePreviewPointerEnter,
    onPreviewPointerDown: handlePreviewPointerDown,
    onPreviewPointerLeave: handlePreviewPointerLeave,
    resetPreviewReady: resetPreviewReady,
  } = usePreviewWorkspaceControls({
    initialized,
    previewFitKey,
    previewContentRef,
    previewViewportRef,
  });

  const handlePreviewNavigate = useCallback(
    (target: PreviewNavigationTarget) => {
      focusRequestCounterRef.current += 1;
      setEditorFocusRequest({
        ...target,
        requestId: focusRequestCounterRef.current,
      });
    },
    [],
  );

  const handleHeightDebugSnapshot = useCallback(
    (snapshot: HeightDebugSnapshot | null) => {
      setHeightDebugSnapshotState({
        resumeId: initialResume.id,
        snapshot,
      });
    },
    [initialResume.id],
  );

  const heightDebugSnapshot =
    heightDebugSnapshotState.resumeId === initialResume.id
      ? heightDebugSnapshotState.snapshot
      : null;

  const previewDocument = useMemo(() => {
    if (isTranslateCompareMode && aiPreviewState) {
      return (
        <div className="resume-ai-compare-stage">
          <div className="resume-ai-compare-column">
            <div className="resume-ai-compare-label">原简历</div>
            <ResumeReactivePreview
              data={basePreviewData}
              onNavigate={handlePreviewNavigate}
            />
          </div>
          <div className="resume-ai-compare-column">
            <div className="resume-ai-compare-label">翻译简历</div>
            <ResumeReactivePreview
              data={comparePreviewData || aiPreviewState.data}
              onNavigate={handlePreviewNavigate}
            />
          </div>
        </div>
      );
    }

    return (
      <ResumeReactivePreview
        data={previewRenderData}
        onNavigate={handlePreviewNavigate}
        onHeightDebugSnapshot={handleHeightDebugSnapshot}
      />
    );
  }, [
    aiPreviewState,
    basePreviewData,
    comparePreviewData,
    handleHeightDebugSnapshot,
    handlePreviewNavigate,
    isTranslateCompareMode,
    previewRenderData,
  ]);

  const handleSidePanelScroll = useCallback(() => {
    setSidePanelScrolling(true);
    if (sidePanelScrollTimerRef.current) {
      window.clearTimeout(sidePanelScrollTimerRef.current);
    }
    sidePanelScrollTimerRef.current = window.setTimeout(() => {
      setSidePanelScrolling(false);
      sidePanelScrollTimerRef.current = null;
    }, 680);
  }, []);

  const handleSelectTool = useCallback((tool: BuilderTool) => {
    setActiveTool(tool);
  }, []);

  const handleCloseTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  useEffect(() => {
    if (activeTool !== "ai" && aiPreviewState) {
      clearAIPreviewOverlay();
    }
  }, [activeTool, aiPreviewState, clearAIPreviewOverlay]);

  useEffect(() => {
    resetAIPreview();
    resetPreviewReady();
  }, [initialResume.id, resetAIPreview, resetPreviewReady]);

  useEffect(() => {
    setShareVisibility(initialResume.shareVisibility || "private");
    setShareWithRecruiters(Boolean(initialResume.shareWithRecruiters));
  }, [
    initialResume.id,
    initialResume.shareVisibility,
    initialResume.shareWithRecruiters,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadingToastId = window.sessionStorage.getItem(
      "resume:editor-loading-toast-id",
    );
    if (loadingToastId) {
      toast.dismiss(loadingToastId);
      window.sessionStorage.removeItem("resume:editor-loading-toast-id");
    }

    const key = "resume:just-created-id";
    const justCreatedId = window.sessionStorage.getItem(key);
    if (justCreatedId && justCreatedId === initialResume.id) {
      toast.success("简历创建成功");
      window.sessionStorage.removeItem(key);
      return;
    }

    const guestEntryKey = "resume:guest-editor-entry";
    if (
      window.sessionStorage.getItem(guestEntryKey) === "1" &&
      initialResume.id.startsWith("guest-")
    ) {
      toast.message("当前为游客模式，登录后可保存和管理简历");
      window.sessionStorage.removeItem(guestEntryKey);
    }
  }, [initialResume.id]);

  const handleBackFromEditor = useCallback(() => {
    router.push(isGuestDraft ? "/builder/templates" : "/dashboard");
  }, [isGuestDraft, router]);

  const ensureAuthForAction = useCallback(async () => {
    if (!isGuestDraft) return true;

    if (auth.authenticated) {
      setAuthModalOpen(false);
      return true;
    }

    const authed = await ensureAuthenticated();
    if (authed) {
      setAuthModalOpen(false);
      return true;
    }

    setAuthModalOpen(true);
    return false;
  }, [auth.authenticated, ensureAuthenticated, isGuestDraft]);

  const { cacheDraftBeforeLoginRedirect } = useAuthRedirectDraft({
    resumeId: initialResume.id,
    resumeTitle,
    resumeTitleRef,
    setResumeTitle,
    initialized,
    setSelectedDataSourceId,
    updateResumeData,
  });

  const handleGuestResumeCreated = useCallback(
    (resumeId: string) => {
      router.replace(`/builder/editor/${resumeId}`);
    },
    [router],
  );

  const updateShareSettings = useCallback(
    async (
      nextShareVisibility: "private" | "public",
      nextShareWithRecruiters: boolean,
    ) => {
      if (isGuestDraft) {
        toast.message("请先保存简历后再设置分享");
        return;
      }

      const authed = await ensureAuthForAction();
      if (!authed) return;

      setShareSaving(true);
      try {
        const response = await fetch(
          `/api/resumes/${encodeURIComponent(initialResume.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shareVisibility: nextShareVisibility,
              shareWithRecruiters:
                nextShareVisibility === "public"
                  ? nextShareWithRecruiters
                  : false,
            }),
          },
        );

        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ error: "分享设置更新失败" }));
          throw new Error(payload.error || "分享设置更新失败");
        }

        setShareVisibility(nextShareVisibility);
        setShareWithRecruiters(
          nextShareVisibility === "public"
            ? nextShareWithRecruiters
            : false,
        );
        toast.success("分享设置已更新");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "分享设置更新失败",
        );
      } finally {
        setShareSaving(false);
      }
    },
    [ensureAuthForAction, initialResume.id, isGuestDraft],
  );

  const handleChangeShareVisibility = useCallback(
    (nextShareVisibility: "private" | "public") => {
      const nextShareWithRecruiters =
        nextShareVisibility === "public" ? shareWithRecruiters : false;
      void updateShareSettings(nextShareVisibility, nextShareWithRecruiters);
    },
    [shareWithRecruiters, updateShareSettings],
  );

  const handleToggleShareWithRecruiters = useCallback(
    (nextValue: boolean) => {
      const normalized = shareVisibility === "public" ? nextValue : false;
      void updateShareSettings(shareVisibility, normalized);
    },
    [shareVisibility, updateShareSettings],
  );

  const handleCopyShareLink = useCallback(async () => {
    if (isGuestDraft) {
      toast.message("请先保存简历后再复制分享链接");
      return;
    }

    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/resume/${encodeURIComponent(
      initialResume.id,
    )}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("分享链接已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }, [initialResume.id, isGuestDraft]);

  const { handleManualSave } = useManualSave({
    ensureAuthForAction,
    saveResumeTitle,
    isGuestDraft,
    resumeTitleRef,
    onGuestResumeCreated: handleGuestResumeCreated,
  });

  const { handleFill } = useDataSourceFill({
    ensureAuthForAction,
    selectedDataSourceId,
    applyDataSource,
  });

  useEffect(() => {
    if (initialized && storeResumeId === initialResume.id) {
      return;
    }

    const normalized = normalizeResumeContent(initialResume.content, {
      dataSource:
        dataSources.find(
          (source) => source.id === initialResume.dataSourceId,
        ) || null,
      templateId: initialResume.templateId,
      withBackup: true,
    });
    initialize({
      resumeId: initialResume.id,
      data: normalized.data,
      dataSources,
      selectedDataSourceId:
        initialResume.dataSourceId || dataSources[0]?.id || "",
    });
  }, [
    dataSources,
    initialResume.content,
    initialResume.dataSourceId,
    initialResume.id,
    initialResume.templateId,
    initialize,
    initialized,
    storeResumeId,
  ]);

  // useEffect(() => {
  //   if (typeof document === 'undefined') return
  //   document.body.classList.add('resume-builder-mono')
  //   return () => {
  //     document.body.classList.remove('resume-builder-mono')
  //     document.body.classList.remove('resume-editor-panel-resizing')
  //   }
  // }, [])

  useEffect(() => {
    return () => {
      if (sidePanelScrollTimerRef.current) {
        window.clearTimeout(sidePanelScrollTimerRef.current);
      }
    };
  }, []);

  const { exporting, handleDownloadImage, handleDownloadPdf } = useResumeExport(
    {
      previewContentRef,
      resumeTitleRef,
      fallbackTitle: initialResume.title,
      pageFormat: previewRenderData.metadata.page.format,
      ensureAuthForAction,
    },
  );

  const toolPanelContent =
    activeTool === null ? null : activeTool === "fill" ? (
      <div className="resume-workbench-stack">
        <FillToolPanel
          dataSources={dataSources}
          selectedDataSourceId={selectedDataSourceId}
          fillStrategy={fillStrategy}
          onDataSourceChange={setSelectedDataSourceId}
          onFillStrategyChange={setFillStrategy}
          onFill={(strategy) => {
            void handleFill(strategy);
          }}
        />
      </div>
    ) : activeTool === "ai" ? (
      <AIChatPanel
        resumeId={initialResume.id}
        resumeTitle={resumeTitle}
        isGuestDraft={isGuestDraft}
        resolvedDraftId={resolvedDraftId}
        onClose={handleCloseTool}
        onPreviewDraftInCanvas={handlePreviewDraftInCanvas}
        onCardPreviewRequest={(payload) => {
          void handleCardPreviewRequest(payload);
        }}
      />
    ) : activeTool === "height-debug" ? (
      <div className="resume-workbench-stack">
        <HeightDebugPanel snapshot={heightDebugSnapshot} />
      </div>
    ) : (
      <div className="resume-workbench-stack">
        <LayoutAndStylePanel
          pane={activeTool}
          smartOnePage={baseSmartOnePage}
        />
      </div>
    );

  const resumeCompleteness = useMemo(
    () => computeResumeCompleteness(data),
    [data],
  );
  const isAutoFillCompletenessBand = useMemo(() => {
    const score = resumeCompleteness.score;
    return score >= 0 && score <= 35;
  }, [resumeCompleteness.score]);
  const editorPanelContent = (
    <IntegratedSectionsEditor
      focusRequest={editorFocusRequest}
      completeness={resumeCompleteness}
      scrollContainerRef={sidePanelScrollRef}
      completenessAction={isAutoFillCompletenessBand ? "auto-fill" : "ai-diagnosis"}
      onOpenAIDiagnosis={() =>
        handleSelectTool(isAutoFillCompletenessBand ? "fill" : "ai")
      }
      renderBasicInfoEditor={() => <BasicInfoSectionEditor />}
      renderSectionEditorBody={(sectionId) => (
        <SectionEditorBody sectionId={sectionId} />
      )}
    />
  );

  return (
    <div className="h-full overflow-hidden">
      <div
        ref={builderScopeRef}
        className="resume-builder-scope h-full flex flex-col overflow-hidden"
      >
        <ResumeBuilderToolbar
          resumeTitle={resumeTitle}
          saveStatus={<SaveStatusTag />}
          saveLoading={isSavingTitle || saveState.status === "saving"}
          shareVisibility={shareVisibility}
          shareWithRecruiters={shareWithRecruiters}
          shareSaving={shareSaving}
          onBack={() => void handleBackFromEditor()}
          onResumeTitleChange={setResumeTitle}
          onResumeTitleBlur={() => void saveResumeTitle()}
          downloadLoading={exporting}
          onChangeShareVisibility={handleChangeShareVisibility}
          onToggleShareWithRecruiters={handleToggleShareWithRecruiters}
          onCopyShareLink={() => {
            void handleCopyShareLink();
          }}
          onDownloadPng={() => void handleDownloadImage("png")}
          onDownloadJpg={() => void handleDownloadImage("jpg")}
          onDownloadPdf={() => void handleDownloadPdf()}
          onSave={() => void handleManualSave()}
        />
        <ResumeWorkbench
          editorPanelWidth={editorPanelWidth}
          activeTool={activeTool}
          sidePanelScrolling={sidePanelScrolling}
          onSelectTool={handleSelectTool}
          onCloseTool={handleCloseTool}
          onSidePanelScroll={handleSidePanelScroll}
          toolPanelContent={toolPanelContent}
          editorContent={editorPanelContent}
          onEditorPanelResizeStart={handleEditorPanelResizeStart}
          onEditorPanelResizeMove={handleEditorPanelResizeMove}
          onEditorPanelResizeEnd={handleEditorPanelResizeEnd}
          previewContent={previewDocument}
          previewContentRef={previewContentRef}
          previewViewportRef={previewViewportRef}
          previewScale={previewScale}
          previewScrollSpaceHeight={previewScrollSpaceHeight}
          verticalPadding={previewVerticalPadding}
          previewReady={previewAutoFitReady}
          aiPreviewVisible={activeTool === "ai" && Boolean(activeAIDraftId)}
          aiPreviewActionLoading={aiPreviewActionLoading}
          onRunPreviewDraftAction={(action) => {
            void runPreviewDraftAction(action);
          }}
          onPreviewPointerEnter={handlePreviewPointerEnter}
          onPreviewPointerDown={handlePreviewPointerDown}
          onPreviewPointerLeave={handlePreviewPointerLeave}
          onZoomIn={handlePreviewZoomIn}
          onZoomOut={handlePreviewZoomOut}
          onCenter={handlePreviewCenter}
          onFit={() => {
            void fitPreviewToHeight();
          }}
        />
        <AuthRequiredModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          redirectPath={
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/builder/templates"
          }
          onBeforeLogin={cacheDraftBeforeLoginRedirect}
        />
      </div>
    </div>
  );
}
