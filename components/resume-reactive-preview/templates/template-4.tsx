import type { PreviewNavigationTarget, TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-4.module.scss'

const renderTemplate4: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)

  const intentionItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'target-city', value: facts.targetCity, target: { sectionId: 'intention', fieldKey: 'intentionCity' } },
    { key: 'salary', value: facts.salary, target: { sectionId: 'intention', fieldKey: 'intentionSalary' } },
    { key: 'availability', value: facts.availability, target: { sectionId: 'intention', fieldKey: 'intentionAvailability' } },
  ]
  const profileItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'birth', value: facts.birthDate, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'age', value: facts.age, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'gender', value: facts.gender, target: { sectionId: 'basics', fieldKey: 'gender' } },
    { key: 'marital', value: facts.maritalStatus, target: { sectionId: 'basics', fieldKey: 'maritalStatus' } },
    { key: 'ethnicity', value: facts.ethnicity, target: { sectionId: 'basics', fieldKey: 'ethnicity' } },
    { key: 'political', value: facts.politicalStatus, target: { sectionId: 'basics', fieldKey: 'politicalStatus' } },
  ]
  const profileExtraItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'location', value: personalLocation, target: { sectionId: 'basics', fieldKey: helpers.resolveLocationFieldKey(data) } },
    { key: 'height', value: facts.height, target: { sectionId: 'basics', fieldKey: 'heightCm' } },
    { key: 'weight', value: facts.weight, target: { sectionId: 'basics', fieldKey: 'weightKg' } },
    { key: 'experience', value: facts.experience, target: { sectionId: 'basics', fieldKey: 'workYears' } },
  ]
  const contactItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'phone', value: data.basics.phone, target: { sectionId: 'basics', fieldKey: 'phone' } },
    { key: 'email', value: data.basics.email, target: { sectionId: 'basics', fieldKey: 'email' } },
    { key: 'website', value: facts.website, target: { sectionId: 'basics', fieldKey: helpers.resolveWebsiteFieldKey(data) } },
  ]

  return (
    <div className={styles.template4}>
      <div className={styles.t4Header}>
        <div className={styles.t4TitleLine}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
        </div>
        {intentionItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(intentionItems, onNavigate)}</p> : null}
        {profileItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(profileItems, onNavigate)}</p> : null}
        {profileExtraItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(profileExtraItems, onNavigate)}</p> : null}
        {contactItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(contactItems, onNavigate)}</p> : null}
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t4Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.templateMain}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'text-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t4Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate4
