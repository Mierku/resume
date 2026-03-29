import { Globe, Mail, Phone, type LucideIcon } from 'lucide-react'
import type { PreviewNavigationTarget, TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-5.module.scss'

const renderTemplate5: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)

  const profileItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: facts.age ? 'age' : 'birth', value: facts.age || facts.birthDate, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'gender', value: facts.gender, target: { sectionId: 'basics', fieldKey: 'gender' } },
    { key: 'marital', value: facts.maritalStatus, target: { sectionId: 'basics', fieldKey: 'maritalStatus' } },
    { key: 'ethnicity', value: facts.ethnicity, target: { sectionId: 'basics', fieldKey: 'ethnicity' } },
    { key: 'political', value: facts.politicalStatus, target: { sectionId: 'basics', fieldKey: 'politicalStatus' } },
  ]
  const profileExtraItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'height', value: facts.height, target: { sectionId: 'basics', fieldKey: 'heightCm' } },
    { key: 'weight', value: facts.weight, target: { sectionId: 'basics', fieldKey: 'weightKg' } },
    { key: 'location', value: personalLocation, target: { sectionId: 'basics', fieldKey: helpers.resolveLocationFieldKey(data) } },
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'experience', value: facts.experience, target: { sectionId: 'basics', fieldKey: 'workYears' } },
  ]
  const contactItems: Array<{ icon: LucideIcon; label: string; value: string; fieldKey: string }> = [
    { icon: Phone, label: '电话', value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, label: '邮箱', value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, label: '网站', value: facts.website, fieldKey: helpers.resolveWebsiteFieldKey(data) },
  ].filter(item => helpers.hasMeaningfulText(item.value))

  return (
    <div className={styles.template5}>
      <div className={styles.t5Header}>
        <div className={styles.t5HeaderMain}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
          {profileItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(profileItems, onNavigate)}</p> : null}
          {profileExtraItems.some(item => helpers.hasMeaningfulText(item.value)) ? <p>{helpers.renderInlineTargetList(profileExtraItems, onNavigate)}</p> : null}
          {contactItems.length > 0 ? (
            <div className={styles.t5Contact}>
              {contactItems.map(item => (
                <span
                  key={item.label}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey })}
                >
                  <item.icon size={11} />
                  {item.label}：{item.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t5Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.t5Body}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'text-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t5Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate5
