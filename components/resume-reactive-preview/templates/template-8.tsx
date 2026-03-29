import type { TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-8.module.scss'

const renderTemplate8: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)
  const locationFieldKey = helpers.resolveLocationFieldKey(data)
  const ageText = helpers.hasMeaningfulText(facts.age) ? `${facts.age}岁` : facts.birthDate
  const visibleSectionIdSet = new Set(sectionIds)

  const infoLines = [
    [
      {
        key: 'intention-position',
        value: helpers.hasMeaningfulText(facts.position) ? `求职意向：${facts.position}` : '',
        target: { sectionId: 'intention', fieldKey: 'intentionPosition' },
      },
      { key: 'intention-city', value: facts.targetCity, target: { sectionId: 'intention', fieldKey: 'intentionCity' } },
      { key: 'intention-salary', value: facts.salary, target: { sectionId: 'intention', fieldKey: 'intentionSalary' } },
      {
        key: 'intention-availability',
        value: facts.availability,
        target: { sectionId: 'intention', fieldKey: 'intentionAvailability' },
      },
    ],
    [
      { key: 'age', value: ageText, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
      { key: 'gender', value: facts.gender, target: { sectionId: 'basics', fieldKey: 'gender' } },
      { key: 'location', value: personalLocation, target: { sectionId: 'basics', fieldKey: locationFieldKey } },
      { key: 'experience', value: facts.experience, target: { sectionId: 'basics', fieldKey: 'workYears' } },
    ],
    [
      { key: 'phone', value: data.basics.phone, target: { sectionId: 'basics', fieldKey: 'phone' } },
      { key: 'email', value: data.basics.email, target: { sectionId: 'basics', fieldKey: 'email' } },
      { key: 'website', value: facts.website, target: { sectionId: 'basics', fieldKey: helpers.resolveWebsiteFieldKey(data) } },
    ],
  ]

  const renderInfoLine = (
    lineKey: string,
    items: Array<{ key: string; value: string; target: { sectionId: string; itemId?: string; fieldKey?: string } }>,
  ) => {
    const visibleItems = items.filter(item => helpers.hasMeaningfulText(item.value))
    if (visibleItems.length === 0) return null

    return (
      <div className={styles.t8InfoLine} key={lineKey}>
        {visibleItems.map(item => (
          <span key={item.key} {...helpers.getPreviewActionProps(onNavigate, item.target)}>
            {item.value}
          </span>
        ))}
      </div>
    )
  }

  const educationSection = data.sections.education
  const visibleEducationItems = educationSection.items.filter(item =>
    helpers.hasRenderableStandardItem('education', item as unknown as Record<string, unknown>),
  )
  const educationHasIntro = helpers.stripHtml(educationSection.intro || '').length > 0
  const shouldRenderEducation =
    visibleSectionIdSet.has('education') &&
    !educationSection.hidden &&
    (visibleEducationItems.length > 0 || educationHasIntro)

  const experienceSection = data.sections.experience
  const visibleExperienceItems = experienceSection.items.filter(item =>
    helpers.hasRenderableStandardItem('experience', item as unknown as Record<string, unknown>),
  )
  const experienceHasIntro = helpers.stripHtml(experienceSection.intro || '').length > 0
  const shouldRenderExperience =
    visibleSectionIdSet.has('experience') &&
    !experienceSection.hidden &&
    (visibleExperienceItems.length > 0 || experienceHasIntro)

  const skillsSection = data.sections.skills
  const visibleSkillItems = skillsSection.items.filter(item => !item.hidden && helpers.hasMeaningfulText(item.name))
  const skillBars = visibleSkillItems
    .map(item => {
      const proficiency = String(item.proficiency || '').trim()
      const percent = helpers.resolveTemplate8SkillPercent(item.level, proficiency)
      return {
        id: String(item.id || ''),
        name: item.name,
        percent,
        levelText: helpers.resolveTemplate8SkillLabel(proficiency, percent),
      }
    })
    .slice(0, 4)
  const skillsHasIntro = helpers.stripHtml(skillsSection.intro || '').length > 0
  const shouldRenderSkills =
    visibleSectionIdSet.has('skills') &&
    !skillsSection.hidden &&
    (skillsHasIntro || skillBars.length > 0)

  const summaryContent = helpers.stripHtml(data.summary.content || '')
  const shouldRenderSummary = visibleSectionIdSet.has('summary') && !data.summary.hidden && summaryContent.length > 0

  const handledSectionIds = new Set<string>(['education', 'experience', 'skills', 'summary'])
  const remainingSectionIds = sectionIds.filter(sectionId => !handledSectionIds.has(sectionId))

  return (
    <div className={styles.template8}>
      <div className={styles.t8Header}>
        <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
        <div className={styles.t8BasicInfo}>{infoLines.map((items, index) => renderInfoLine(`line-${index + 1}`, items))}</div>
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' }, styles.t8AvatarWrap)}>
          <Avatar data={data} className={styles.t8Avatar} square sizePt={72} />
        </div>
      </div>

      {shouldRenderEducation ? (
        <section className={styles.t8Section}>
          <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education' }, styles.t8SectionTitle)}>
            {helpers.resolveStandardSectionTitle(data, 'education')}
          </div>
          {educationHasIntro
            ? helpers.renderRichText(educationSection.intro, styles.t8SectionIntro, onNavigate, { sectionId: 'education', fieldKey: 'intro' })
            : null}
          {visibleEducationItems.map(item => {
            const degreeText = `${item.degree || ''}${item.area ? `（${item.area}）` : ''}`.trim()
            return (
              <article
                key={item.id}
                {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education', itemId: item.id, fieldKey: 'school' }, styles.t8ExpItem)}
              >
                <div className={styles.t8ExpHeader}>
                  <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education', itemId: item.id, fieldKey: 'period' })}>{item.period}</span>
                  <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education', itemId: item.id, fieldKey: 'school' })}>{item.school}</span>
                  <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education', itemId: item.id, fieldKey: 'degree' })}>{degreeText}</span>
                </div>
                {helpers.hasMeaningfulText(item.grade) ? (
                  <div
                    {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'education', itemId: item.id, fieldKey: 'grade' }, styles.t8ExpSubHeader)}
                  >
                    专业成绩：{item.grade}
                  </div>
                ) : null}
                {helpers.renderRichText(item.description || '', styles.t8ExpContent, onNavigate, {
                  sectionId: 'education',
                  itemId: item.id,
                  fieldKey: 'description',
                })}
              </article>
            )
          })}
        </section>
      ) : null}

      {shouldRenderExperience ? (
        <section className={styles.t8Section}>
          <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'experience' }, styles.t8SectionTitle)}>
            {helpers.resolveStandardSectionTitle(data, 'experience')}
          </div>
          {experienceHasIntro
            ? helpers.renderRichText(experienceSection.intro, styles.t8SectionIntro, onNavigate, {
                sectionId: 'experience',
                fieldKey: 'intro',
              })
            : null}
          {visibleExperienceItems.map(item => (
            <article
              key={item.id}
              {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'experience', itemId: item.id, fieldKey: 'company' }, styles.t8ExpItem)}
            >
              <div className={styles.t8ExpHeader}>
                <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'experience', itemId: item.id, fieldKey: 'period' })}>{item.period}</span>
                <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'experience', itemId: item.id, fieldKey: 'company' })}>{item.company}</span>
                <span {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'experience', itemId: item.id, fieldKey: 'position' })}>{item.position}</span>
              </div>
              {helpers.renderRichText(item.description || '', styles.t8ExpContent, onNavigate, {
                sectionId: 'experience',
                itemId: item.id,
                fieldKey: 'description',
              })}
            </article>
          ))}
        </section>
      ) : null}

      {shouldRenderSkills ? (
        <section className={styles.t8Section}>
          <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'skills' }, styles.t8SectionTitle)}>
            {helpers.resolveStandardSectionTitle(data, 'skills')}
          </div>
          {skillsHasIntro ? helpers.renderRichText(skillsSection.intro, styles.t8SkillDesc, onNavigate, { sectionId: 'skills', fieldKey: 'intro' }) : null}
          {skillBars.length > 0 ? (
            <div className={styles.t8SkillGrid}>
              {skillBars.map(skill => (
                <div
                  key={skill.id}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'skills', itemId: skill.id, fieldKey: 'level' }, styles.t8SkillBarItem)}
                >
                  <span className={styles.t8SkillName}>{skill.name}</span>
                  <div className={styles.t8BarBg}>
                    <span className={styles.t8BarFill} style={{ width: `${skill.percent}%` }} />
                  </div>
                  <span className={styles.t8SkillLevel}>{skill.levelText}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {shouldRenderSummary ? (
        <section className={styles.t8Section}>
          <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'summary' }, styles.t8SectionTitle)}>{data.summary.title || '自我评价'}</div>
          {helpers.renderRichText(data.summary.content, styles.t8SelfEval, onNavigate, { sectionId: 'summary', fieldKey: 'content' })}
        </section>
      ) : null}

      {remainingSectionIds.length > 0
        ? helpers.renderSectionList(data, remainingSectionIds, {
            headingVariant: 'text-line',
            itemVariant: 'compact',
            sectionClassName: styles.t8FallbackSection,
            sectionHeadingClassName: styles.t8FallbackHeading,
            onNavigate,
          })
        : null}
    </div>
  )
}

export default renderTemplate8
