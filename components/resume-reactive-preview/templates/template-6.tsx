import {
  BadgeCheck,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  Globe,
  Heart,
  Mail,
  MapPin,
  Phone,
  Ruler,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-6.module.scss'

const renderTemplate6: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)

  const intentFields = [
    { label: '求职意向', value: facts.position, fieldKey: 'intentionPosition' },
    { label: '意向城市', value: facts.targetCity, fieldKey: 'intentionCity' },
    { label: '期望薪资', value: facts.salary, fieldKey: 'intentionSalary' },
    { label: '入职时间', value: facts.availability, fieldKey: 'intentionAvailability' },
  ].filter(item => helpers.hasMeaningfulText(item.value))

  const infoItems: Array<{ icon: LucideIcon; value: string; fieldKey: string }> = [
    { icon: Cake, value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: CalendarDays, value: facts.age, fieldKey: 'birthDate' },
    { icon: UserRound, value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, value: personalLocation, fieldKey: helpers.resolveLocationFieldKey(data) },
    { icon: Ruler, value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, value: facts.website, fieldKey: helpers.resolveWebsiteFieldKey(data) },
  ].filter(item => helpers.hasMeaningfulText(item.value))

  return (
    <div className={styles.template6}>
      <div className={styles.t6Header}>
        <div className={styles.t6HeaderMain}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
          {intentFields.length > 0 ? (
            <div className={styles.t6IntentGrid}>
              {intentFields.map(item => (
                <div
                  key={item.label}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: item.fieldKey }, styles.t6IntentItem)}
                >
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {infoItems.length > 0 ? (
          <div className={styles.t6InfoGrid}>
            {infoItems.map(item => (
              <div
                key={`${item.icon.displayName || item.icon.name}-${item.value}`}
                {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t6InfoItem)}
              >
                <item.icon size={12} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t6Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.t6Body}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'icon-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t6Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate6
