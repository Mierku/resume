import { BriefcaseBusiness, Mail } from 'lucide-react'
import type { TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-2.module.scss'

const renderTemplate2: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)
  const basicFields = [
    { label: '姓 名', value: data.basics.name || '沉浸式网申', fieldKey: 'name', sectionId: 'basics' },
    { label: '出生年月', value: facts.birthDate, fieldKey: 'birthDate', sectionId: 'basics' },
    { label: '年 龄', value: facts.age, fieldKey: 'birthDate', sectionId: 'basics' },
    { label: '性 别', value: facts.gender, fieldKey: 'gender', sectionId: 'basics' },
    { label: '婚姻状况', value: facts.maritalStatus, fieldKey: 'maritalStatus', sectionId: 'basics' },
    { label: '民 族', value: facts.ethnicity, fieldKey: 'ethnicity', sectionId: 'basics' },
    { label: '政治面貌', value: facts.politicalStatus, fieldKey: 'politicalStatus', sectionId: 'basics' },
    { label: '身 高', value: facts.height, fieldKey: 'heightCm', sectionId: 'basics' },
    { label: '体 重', value: facts.weight, fieldKey: 'weightKg', sectionId: 'basics' },
    { label: '籍 贯', value: personalLocation, fieldKey: helpers.resolveLocationFieldKey(data), sectionId: 'basics' },
    { label: '工作年限', value: facts.experience, fieldKey: 'workYears', sectionId: 'basics' },
    { label: '求职岗位', value: facts.position, fieldKey: 'intentionPosition', sectionId: 'intention' },
    { label: '电 话', value: data.basics.phone, fieldKey: 'phone', sectionId: 'basics' },
    { label: '邮 箱', value: data.basics.email, fieldKey: 'email', sectionId: 'basics' },
    { label: '网 站', value: facts.website, fieldKey: helpers.resolveWebsiteFieldKey(data), sectionId: 'basics' },
  ].filter(item => item.label === '姓 名' || helpers.hasMeaningfulText(String(item.value || '')))

  return (
    <div className={styles.template2}>
      <div className={styles.t2Header}>
        <div className={styles.t2HeaderTitle}>
          <h1>个人简历</h1>
          <span className={styles.t2HeaderDivider} />
          <div className={styles.t2HeaderSubtitle}>
            <span>细心从每一个细节开始</span>
            <strong>求职简历</strong>
          </div>
        </div>

        <div className={styles.t2HeaderActions}>
          <span className={styles.t2ActionIcon}>
            <Mail size={12} />
          </span>
          <span className={styles.t2ActionIcon}>
            <BriefcaseBusiness size={12} />
          </span>
        </div>
      </div>

      <div className={styles.t2Ribbon}>
        <span className={styles.t2RibbonLabel}>基本信息</span>
      </div>

      <section className={styles.t2Basics}>
        <div className={styles.t2BasicsGrid}>
          {basicFields.map(item => (
            <div
              key={item.label}
              {...helpers.getPreviewActionProps(onNavigate, { sectionId: item.sectionId, fieldKey: item.fieldKey }, styles.t2BasicItem)}
            >
              <span>{item.label}：</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t2Avatar} square sizePt={58} />
        </div>
      </section>

      <div className={styles.templateMain}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'striped',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t2Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate2
