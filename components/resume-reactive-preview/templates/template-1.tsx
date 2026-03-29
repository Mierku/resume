import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Cake,
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
import templateStyles from './styles/template-1.module.scss'

const renderTemplate1: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)
  const visible = sectionIds
  const sidebar: string[] = []
  const main: string[] = []
  visible.forEach(sectionId => {
    if (['skills', 'languages', 'interests', 'profiles', 'certifications', 'awards', 'publications'].includes(sectionId)) {
      sidebar.push(sectionId)
    } else {
      main.push(sectionId)
    }
  })

  const sidebarInfo: Array<{ icon: LucideIcon; value: string; fieldKey: string }> = [
    { icon: CalendarDays, value: facts.age, fieldKey: 'birthDate' },
    { icon: Cake, value: facts.birthDate, fieldKey: 'birthDate' },
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

  const intentionItems = [
    { label: '求职意向', value: facts.position, fieldKey: 'intentionPosition' },
    { label: '意向城市', value: facts.targetCity, fieldKey: 'intentionCity' },
    { label: '期望薪资', value: facts.salary, fieldKey: 'intentionSalary' },
    { label: '入职时间', value: facts.availability, fieldKey: 'intentionAvailability' },
  ].filter(item => helpers.hasMeaningfulText(item.value))

  return (
    <div className={styles.template1}>
      <aside className={styles.t1Sidebar}>
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' }, styles.t1AvatarWrap)}>
          <Avatar data={data} className={styles.t1Avatar} square sizePt={66} />
        </div>

        <div className={styles.t1SidebarInfo}>
          {sidebarInfo.map(item => (
            <div
              key={`${item.icon.displayName || item.icon.name}-${item.value}`}
              {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t1SidebarInfoItem)}
            >
              <span className={styles.t1SidebarInfoIcon}>
                <item.icon size={12} />
              </span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.t1SidebarSections}>
          {helpers.renderSectionList(data, sidebar, {
            headingVariant: 'sidebar',
            itemVariant: 'compact',
            sectionHeadingClassName: styles.t1SidebarHeading,
            sectionClassName: styles.t1SidebarSection,
            onNavigate,
          })}
        </div>
      </aside>

      <main className={styles.t1Main}>
        <div className={styles.t1MainHeader}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
          {intentionItems.length > 0 ? (
            <div className={styles.t1IntentGrid}>
              {intentionItems.map(item => (
                <div
                  key={item.label}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: item.fieldKey }, styles.t1IntentItem)}
                >
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.templateMain}>
          {helpers.renderSectionList(data, main, {
            headingVariant: 'icon-line',
            itemVariant: 'compact',
            sectionHeadingClassName: styles.t1MainHeading,
            onNavigate,
          })}
        </div>
      </main>
    </div>
  )
}

export default renderTemplate1
