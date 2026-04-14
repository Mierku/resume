import { Fragment, type CSSProperties } from 'react'
import { Globe, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react'
import type { ReactiveSectionVariant, ResumeData } from '@/lib/resume/types'
import { isRenderableSkillItem, resolveSkillsVariant, type ResolvedSkillsVariant } from '@/lib/resume/skills'
import type { TemplateModuleRenderer } from './types'
import {
  buildComposedBlocks,
  resolveComposedRowGap,
  type ComposedRow,
  type ComposedSectionBlock,
} from './composed-block-engine'
import { resolveComposedRuntimeContext, resolveTemplate5SidebarPercent } from './composed-runtime-context'
import { renderTemplateHeaderBlock } from './headers'
import { renderSkills1 } from './skills/skills-1'
import { renderSkills2 } from './skills/skills-2'
import { renderSkills3 } from './skills/skills-3'
import { renderSkills4 } from './skills/skills-4'
import styles from './styles/composed-template-renderer.module.scss'

const PRIMARY_LEFT_FIELD_KEYS = new Set([
  'company',
  'name',
  'school',
  'organization',
  'title',
  'language',
  'network',
])

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

interface SectionRowEntry {
  row: ComposedRow
  rowIndex: number
  marginTop: number
}

interface SectionRowGroup {
  key: string
  itemId?: string
  entries: SectionRowEntry[]
}

function buildSectionRowGroups(rows: ComposedRow[], paragraphGap: number) {
  const groups: SectionRowGroup[] = []

  rows.forEach((row, rowIndex) => {
    const previousRow = rowIndex > 0 ? rows[rowIndex - 1] || null : null
    const marginTop = resolveComposedRowGap(previousRow, row, paragraphGap)
    const entry: SectionRowEntry = { row, rowIndex, marginTop }
    const itemId = normalizeText(row.itemId)

    if (itemId) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.itemId === itemId) {
        lastGroup.entries.push(entry)
        return
      }
      groups.push({
        key: `${itemId}-${rowIndex}`,
        itemId,
        entries: [entry],
      })
      return
    }

    groups.push({
      key: `row-${rowIndex}`,
      entries: [entry],
    })
  })

  return groups
}

function renderSectionBlock(
  block: ComposedSectionBlock,
  options: {
    data: ResumeData
    sectionVariant: ReactiveSectionVariant
    skillsVariant: ResolvedSkillsVariant
    showHeader?: boolean
    isLast: boolean
    onNavigate: Parameters<TemplateModuleRenderer>[0]['onNavigate']
    helpers: Parameters<TemplateModuleRenderer>[1]
  },
) {
  const { data, sectionVariant, skillsVariant, showHeader = true, isLast, onNavigate, helpers } = options
  const marginBottom = isLast ? 0 : block.style.marginBottom
  const shellStyle: CSSProperties = {
    padding: `${block.style.paddingY}px ${block.style.paddingX}px`,
    border: `${block.style.borderWidth}px solid ${block.style.borderColor}`,
    borderRadius: `${block.style.borderRadius}px`,
    background: block.style.backgroundColor,
    boxShadow: block.style.boxShadow,
    marginBottom: `${marginBottom}px`,
  }
  const seenFirstLabelByItemId = new Set<string>()
  const rowGroups = buildSectionRowGroups(block.rows, block.style.paragraphGap)
  const introGroups = rowGroups.filter(group => !group.itemId)
  const skillItems = block.sectionId === 'skills' ? data.sections.skills.items.filter(isRenderableSkillItem) : []

  const renderRow = ({ row, rowIndex, marginTop }: SectionRowEntry) => {
    const rowStyle: CSSProperties = {
      color: block.style.bodyColor,
      fontSize: `${block.style.bodyFontSize}px`,
      lineHeight: block.style.bodyLineHeight,
      marginTop: `${marginTop}px`,
    }

    if (row.kind === 'text') {
      return (
        <p
          key={`${block.id}-${rowIndex}`}
          style={rowStyle}
          {...helpers.getPreviewActionProps(onNavigate, {
            sectionId: block.sectionId,
            itemId: row.itemId,
            fieldKey: row.fieldKey,
          }, styles.paragraph)}
        >
          {row.text}
        </p>
      )
    }

    const hasCenter = helpers.hasMeaningfulText(row.center || '')
    const hasRight = helpers.hasMeaningfulText(row.right || '')
    const templateColumns =
      row.layout === 'triplet'
        ? 'minmax(0, 1fr) auto minmax(0, 1fr)'
        : row.layout === 'pair'
          ? 'minmax(0, 1fr) auto'
          : 'minmax(0, 1fr)'
    const isPrimaryLeftField = Boolean(row.fieldKeys?.left && PRIMARY_LEFT_FIELD_KEYS.has(row.fieldKeys.left))
    const isFirstLabelByItemId = Boolean(row.itemId && !seenFirstLabelByItemId.has(row.itemId))
    const isFirstLabelRow = isPrimaryLeftField || isFirstLabelByItemId
    if (isFirstLabelRow && row.itemId) {
      seenFirstLabelByItemId.add(row.itemId)
    }
    return (
      <div
        key={`${block.id}-${rowIndex}`}
        className={styles.tripletRow}
        data-layout={row.layout}
        style={{
          ...rowStyle,
          columnGap: `${block.style.inlineGap}px`,
          gridTemplateColumns: templateColumns,
        }}
      >
        <span
          {...helpers.getPreviewActionProps(onNavigate, {
            sectionId: block.sectionId,
            itemId: row.itemId,
            fieldKey: row.fieldKeys?.left,
          }, helpers.cx(styles.tripletLeft, isFirstLabelRow && styles.firstLabel))}
        >
          {row.left}
        </span>
        {hasCenter ? (
          <span
            {...helpers.getPreviewActionProps(onNavigate, {
              sectionId: block.sectionId,
              itemId: row.itemId,
              fieldKey: row.fieldKeys?.center,
            }, styles.tripletCenter)}
          >
            {row.center}
          </span>
        ) : null}
        {hasRight ? (
          <span
            {...helpers.getPreviewActionProps(onNavigate, {
              sectionId: block.sectionId,
              itemId: row.itemId,
              fieldKey: row.fieldKeys?.right,
            }, styles.tripletRight)}
          >
            {row.right}
          </span>
        ) : null}
      </div>
    )
  }

  const defaultRowsContent = rowGroups.map(group => {
    if (!group.itemId) {
      return <Fragment key={`${block.id}-group-${group.key}`}>{group.entries.map(entry => renderRow(entry))}</Fragment>
    }

    return (
      <div key={`${block.id}-group-${group.key}`} className={styles.itemGroup} data-item-id={group.itemId}>
        {group.entries.map(entry => renderRow(entry))}
      </div>
    )
  })

  let skillVariantContent: ReturnType<typeof renderSkills1> | null = null
  if (block.sectionId === 'skills' && skillItems.length > 0) {
    const variantProps = {
      items: skillItems,
      sectionId: block.sectionId,
      onNavigate,
      helpers,
    }

    if (skillsVariant === 'skills-1') {
      skillVariantContent = renderSkills1(variantProps)
    } else if (skillsVariant === 'skills-2') {
      skillVariantContent = renderSkills2(variantProps)
    } else if (skillsVariant === 'skills-3') {
      skillVariantContent = renderSkills3(variantProps)
    } else {
      skillVariantContent = renderSkills4(variantProps)
    }
  }

  const skillsVariantBodyStyle: CSSProperties = {
    color: block.style.bodyColor,
    fontSize: `${block.style.bodyFontSize}px`,
    lineHeight: block.style.bodyLineHeight,
  }

  return (
    <section
      key={block.id}
      style={shellStyle}
      data-composed-block-id={block.id}
      {...helpers.getPreviewActionProps(onNavigate, { sectionId: block.sectionId }, helpers.cx(styles.section, styles.interactive))}
    >
      {showHeader ? sectionVariant === 'section-3' ? (
        <div className={styles.sectionHeaderCrimson} style={{ marginBottom: `${block.style.sectionHeaderGap}px` }}>
          <div
            className={styles.sectionBadge}
            style={{
              padding: `${block.style.sectionHeaderPaddingY}px ${block.style.sectionHeaderPaddingX}px`,
            }}
          >
            <h2
              className={styles.sectionTitle}
              style={{
                color: '#ffffff',
                fontSize: `${block.style.titleFontSize}px`,
                lineHeight: block.style.titleLineHeight,
              }}
            >
              {block.title}
            </h2>
          </div>
          <div className={styles.sectionLine} />
        </div>
      ) : sectionVariant === 'section-2' ? (
        <div
          className={styles.sectionHeaderCenteredLine}
          style={{
            marginBottom: `${block.style.sectionHeaderGap}px`,
            padding: `${block.style.sectionHeaderPaddingY}px 0`,
          }}
        >
          <div className={styles.sectionLine} />
          <h2
            className={helpers.cx(styles.sectionTitle, styles.sectionTitleCentered)}
            style={{
              color: block.style.titleColor,
              fontSize: `${block.style.titleFontSize}px`,
              lineHeight: block.style.titleLineHeight,
            }}
          >
            {block.title}
          </h2>
          <div className={styles.sectionLine} />
        </div>
      ) : (
        <div
          className={styles.sectionHeader}
          style={{
            marginBottom: `${block.style.sectionHeaderGap}px`,
            padding: `${block.style.sectionHeaderPaddingY}px ${block.style.sectionHeaderPaddingX}px`,
          }}
        >
          <h2
            className={styles.sectionTitle}
            style={{
              color: block.style.titleColor,
              fontSize: `${block.style.titleFontSize}px`,
              lineHeight: block.style.titleLineHeight,
            }}
          >
            {block.title}
          </h2>
        </div>
      ) : null}
      <div className={styles.rows}>
        {skillVariantContent ? (
          <>
            {introGroups.map(group => (
              <Fragment key={`${block.id}-intro-${group.key}`}>
                {group.entries.map(entry => renderRow(entry))}
              </Fragment>
            ))}
            <div
              className={[
                styles.skillsVariantShell,
                introGroups.length > 0 ? styles.skillsVariantShellWithIntro : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={skillsVariantBodyStyle}
            >
              {skillVariantContent}
            </div>
          </>
        ) : defaultRowsContent}
      </div>
    </section>
  )
}

const renderComposedTemplate: TemplateModuleRenderer = ({ data, pageIndex, sectionIds, pageBlocks, onNavigate }, helpers) => {
  const { layoutSpec, headerVariant, sectionVariant, preset } = resolveComposedRuntimeContext(data)
  const skillsVariant = resolveSkillsVariant(data.metadata.design.skillsVariant)
  const allBlocks = buildComposedBlocks(data, sectionIds, preset)
  const heroBlock = allBlocks.find(block => block.kind === 'hero') || null
  const blockById = new Map(allBlocks.map(block => [block.id, block]))
  const renderedSectionBlocks =
    pageBlocks && pageBlocks.length > 0
      ? pageBlocks
          .map(pageBlock => {
            const resolvedBlock = blockById.get(pageBlock.blockId)
            if (!resolvedBlock || resolvedBlock.kind !== 'section') return null
            return {
              block: {
                ...resolvedBlock,
                rows: resolvedBlock.rows.slice(pageBlock.rowStart, pageBlock.rowEnd),
              },
              continuedFromPreviousPage: pageBlock.continuedFromPreviousPage,
            }
          })
          .filter((entry): entry is { block: ComposedSectionBlock; continuedFromPreviousPage: boolean } => Boolean(entry))
      : allBlocks
          .filter((block): block is ComposedSectionBlock => block.kind === 'section')
          .map(block => ({
            block,
            continuedFromPreviousPage: false,
          }))
  const sectionBlocks = renderedSectionBlocks

  if (layoutSpec.layout === 'left-aside') {
    const blockCount = sectionBlocks.length
    const sidebarWidth = resolveTemplate5SidebarPercent(Number(data.metadata.layout.sidebarWidth || layoutSpec.sidebarPercent || 26))
    const basicsName = normalizeText(data.basics.name) || '未命名候选人'
    const basicsHeadline = normalizeText(data.basics.intentionPosition || data.basics.headline)
    const website = normalizeText(data.basics.website.label || data.basics.website.url)
    const location = normalizeText(data.basics.location || data.basics.nativePlace)
    const contactRows: Array<{ key: string; icon: LucideIcon; value: string; fieldKey: string }> = [
      { key: 'phone', icon: Phone, value: normalizeText(data.basics.phone), fieldKey: 'phone' },
      { key: 'email', icon: Mail, value: normalizeText(data.basics.email), fieldKey: 'email' },
      {
        key: 'location',
        icon: MapPin,
        value: location,
        fieldKey: location === normalizeText(data.basics.nativePlace) ? 'nativePlace' : 'location',
      },
      { key: 'website', icon: Globe, value: website, fieldKey: helpers.resolveWebsiteFieldKey(data) },
    ].filter(item => helpers.hasMeaningfulText(item.value))

    const intentionRows = [
      { key: 'city', label: '期望城市', value: normalizeText(data.basics.intentionCity), fieldKey: 'intentionCity' },
      { key: 'salary', label: '期望薪资', value: normalizeText(data.basics.intentionSalary), fieldKey: 'intentionSalary' },
      {
        key: 'availability',
        label: '到岗时间',
        value: normalizeText(data.basics.intentionAvailability),
        fieldKey: 'intentionAvailability',
      },
    ].filter(item => helpers.hasMeaningfulText(item.value))

    return (
      <div className={styles.asideRoot} style={{ ['--template-aside-sidebar-width' as string]: `${sidebarWidth}%` }}>
        <aside className={styles.asideSidebar}>
          <div className={styles.asideSidebarContent}>
            {!data.picture.hidden ? (
              <div
                {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' }, styles.asideAvatarWrap)}
              >
                {helpers.Avatar({
                  data,
                  className: styles.asideAvatar,
                  sizePt: 58,
                })}
              </div>
            ) : null}

            <h1
              {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' }, styles.asideName)}
            >
              {basicsName}
            </h1>
            {helpers.hasMeaningfulText(basicsHeadline) ? (
              <p
                {...helpers.getPreviewActionProps(
                  onNavigate,
                  { sectionId: 'basics', fieldKey: data.basics.intentionPosition ? 'intentionPosition' : 'headline' },
                  styles.asideHeadline,
                )}
              >
                {basicsHeadline}
              </p>
            ) : null}

            {contactRows.length > 0 ? (
              <section className={styles.asideInfoGroup}>
                <h3 className={styles.asideInfoTitle}>联系方式</h3>
                <div className={styles.asideContactList}>
                  {contactRows.map(item => (
                    <div
                      key={item.key}
                      {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.asideContactItem)}
                    >
                      <item.icon size={12} />
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {intentionRows.length > 0 ? (
              <section className={styles.asideInfoGroup}>
                <h3 className={styles.asideInfoTitle}>求职意向</h3>
                <div className={styles.asideIntentionList}>
                  {intentionRows.map(item => (
                    <div
                      key={item.key}
                      {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: item.fieldKey }, styles.asideIntentionItem)}
                    >
                      {item.label}：{item.value}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </aside>

        <main className={styles.asideMain} data-composed-flow="true">
          {sectionBlocks.map(({ block, continuedFromPreviousPage }, index) =>
            renderSectionBlock(block, {
              data,
              sectionVariant,
              skillsVariant,
              showHeader: !continuedFromPreviousPage,
              isLast: index === blockCount - 1,
              onNavigate,
              helpers,
            }),
          )}
        </main>
      </div>
    )
  }

  return (
    <div
      className={styles.singleRoot}
      style={{
        padding: 'var(--page-margin-y) var(--page-margin-x)',
      }}
    >
      <div className={styles.singleFlow} data-composed-flow="true">
        {heroBlock && pageIndex === 0
          ? renderTemplateHeaderBlock({
              variant: headerVariant,
              block: heroBlock,
              data,
              marginBottom: sectionBlocks.length === 0 ? 0 : heroBlock.style.marginBottom,
              onNavigate,
              helpers,
            })
          : null}
        {sectionBlocks.map(({ block, continuedFromPreviousPage }, index) =>
          renderSectionBlock(block, {
            data,
            sectionVariant,
            skillsVariant,
            showHeader: !continuedFromPreviousPage,
            isLast: index === sectionBlocks.length - 1,
            onNavigate,
            helpers,
          }),
        )}
      </div>
    </div>
  )
}

export default renderComposedTemplate
