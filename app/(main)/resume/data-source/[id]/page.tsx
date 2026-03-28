'use client'

import { type CSSProperties, useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Message,
  Spin,
} from '@/components/ui/radix-adapter'
import { IconArrowLeft } from '@/components/ui/radix-icons'
import { AuthRequiredModal } from '@/components/ui/Modal'
import { toast } from '@/lib/toast'
import {
  BasicInfoSection,
  IntentionSection,
  EducationSection,
  WorkSection,
  ProjectSection,
  CampusExperienceSection,
  AwardsSection,
  LanguagesSection,
  ComputerSkillsSection,
  CertificatesSection,
  type Education,
  type Work,
  type Project,
  type CampusExperience,
  type Award,
  type Language,
  type ComputerSkill,
  type Certificate,
} from '@/components/data-source'
import {
  DATA_SOURCE_SECTION_IDS,
  DATA_SOURCE_SECTION_NAV,
  DATA_SOURCE_STICKY_TOP,
} from '@/components/data-source/section-meta'

const FormItem = Form.Item
const TextArea = Input.TextArea
const { Option } = Select
type DataSourceSectionId = (typeof DATA_SOURCE_SECTION_NAV)[number]['id']

interface DataSourceForm {
  name: string
  langMode: 'zh' | 'en'
  basics: Record<string, string>
  intention: Record<string, string>
  education: Education[]
  work: Work[]
  projects: Project[]
  campusExperience: CampusExperience[]
  awards: Award[]
  languages: Language[]
  computerSkills: ComputerSkill[]
  certificates: Certificate[]
  family: Array<Record<string, unknown>>
  publications: Array<Record<string, unknown>>
  patents: Array<Record<string, unknown>>
  selfEvaluation: string
  hobbies: string
  portfolio: Array<Record<string, unknown>>
  competitions: Array<Record<string, unknown>>
  skills: string
  summaryZh: string
  summaryEn: string
}

const emptyForm: DataSourceForm = {
  name: '',
  langMode: 'zh',
  basics: {},
  intention: {},
  education: [],
  work: [],
  projects: [],
  campusExperience: [],
  awards: [],
  languages: [],
  computerSkills: [],
  certificates: [],
  family: [],
  publications: [],
  patents: [],
  selfEvaluation: '',
  hobbies: '',
  portfolio: [],
  competitions: [],
  skills: '',
  summaryZh: '',
  summaryEn: '',
}

export default function DataSourceEditPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const isNew = params.id === 'new'
  const [formRef] = Form.useForm()

  const [form, setForm] = useState<DataSourceForm>(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<DataSourceSectionId>(DATA_SOURCE_SECTION_NAV[0].id)
  const [blockedByAuth, setBlockedByAuth] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (isNew) return

    const loadDataSource = async () => {
      try {
        const res = await fetch(`/api/data-sources/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          const ds = data.dataSource
          setForm({
            name: ds.name,
            langMode: ds.langMode,
            basics: ds.basics || {},
            intention: ds.intention || {},
            education: ds.education || [],
            work: ds.work || [],
            projects: ds.projects || [],
            campusExperience: ds.campusExperience || [],
            awards: ds.awards || [],
            languages: ds.languages || [],
            computerSkills: ds.computerSkills || [],
            certificates: ds.certificates || [],
            family: ds.family || [],
            publications: ds.publications || [],
            patents: ds.patents || [],
            selfEvaluation: ds.selfEvaluation || '',
            hobbies: ds.hobbies || '',
            portfolio: ds.portfolio || [],
            competitions: ds.competitions || [],
            skills: Array.isArray(ds.skills) ? ds.skills.join(', ') : ds.skills || '',
            summaryZh: ds.summaryZh || '',
            summaryEn: ds.summaryEn || '',
          })
        } else if (res.status === 401) {
          setBlockedByAuth(true)
          Message.warning('登录后可访问该数据源')
          setShowAuthModal(true)
        } else {
          toast.error('数据源不存在')
          router.push('/resume/data-source')
        }
      } catch {
        toast.error('加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadDataSource()
  }, [isNew, params.id, router])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return

    const scrollContainer = document.querySelector<HTMLElement>('[data-resume-scroll-container="true"]')

    const updateActiveSection = () => {
      const containerTop = scrollContainer?.getBoundingClientRect().top || 0
      const threshold = containerTop + DATA_SOURCE_STICKY_TOP + 24
      let nextSection: DataSourceSectionId = DATA_SOURCE_SECTION_NAV[0].id

      for (const section of DATA_SOURCE_SECTION_NAV) {
        const element = document.getElementById(section.id)
        if (!element) continue

        if (element.getBoundingClientRect().top <= threshold) {
          nextSection = section.id
          continue
        }

        break
      }

      setActiveSection(previous => (previous === nextSection ? previous : nextSection))
    }

    updateActiveSection()
    scrollContainer?.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      scrollContainer?.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [loading])

  const handleSave = async () => {
    if (!form.name) {
      Message.error('请填写数据源名称')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        skills: form.skills.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      }

      const res = await fetch(
        isNew ? '/api/data-sources' : `/api/data-sources/${params.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (res.ok) {
        Message.success(isNew ? '创建成功' : '保存成功')
        if (isNew) {
          const data = await res.json()
          router.push(`/resume/data-source/${data.dataSource.id}`)
        }
      } else if (res.status === 401) {
        Message.warning('保存数据源需要登录后继续')
        setShowAuthModal(true)
      } else {
        const data = await res.json()
        Message.error(data.error || '保存失败')
      }
    } catch {
      Message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateBasics = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      basics: { ...prev.basics, [field]: value },
    }))
  }

  const updateIntention = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      intention: { ...prev.intention, [field]: value },
    }))
  }

  // Education handlers
  const addEducation = () => {
    setForm(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { id: Date.now().toString(), school: '', degree: '', major: '', startDate: '', endDate: '', description: '' },
      ],
    }))
  }

  const updateEducation = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      ),
    }))
  }

  const removeEducation = (index: number) => {
    setForm(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  // Work handlers
  const addWork = () => {
    setForm(prev => ({
      ...prev,
      work: [
        ...prev.work,
        { id: Date.now().toString(), company: '', position: '', startDate: '', endDate: '', description: '' },
      ],
    }))
  }

  const updateWork = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      work: prev.work.map((w, i) => 
        i === index ? { ...w, [field]: value } : w
      ),
    }))
  }

  const removeWork = (index: number) => {
    setForm(prev => ({
      ...prev,
      work: prev.work.filter((_, i) => i !== index),
    }))
  }

  // Project handlers
  const addProject = () => {
    setForm(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        { id: Date.now().toString(), name: '', description: '' },
      ],
    }))
  }

  const updateProject = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      projects: prev.projects.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      ),
    }))
  }

  const removeProject = (index: number) => {
    setForm(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }))
  }

  // Campus Experience handlers
  const addCampusExperience = () => {
    setForm(prev => ({
      ...prev,
      campusExperience: [
        ...prev.campusExperience,
        { id: Date.now().toString(), startDate: '', endDate: '', description: '' },
      ],
    }))
  }

  const updateCampusExperience = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      campusExperience: prev.campusExperience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      ),
    }))
  }

  const removeCampusExperience = (index: number) => {
    setForm(prev => ({
      ...prev,
      campusExperience: prev.campusExperience.filter((_, i) => i !== index),
    }))
  }

  // Awards handlers
  const addAward = () => {
    setForm(prev => ({
      ...prev,
      awards: [
        ...prev.awards,
        { id: Date.now().toString(), awardDate: '', awardName: '' },
      ],
    }))
  }

  const updateAward = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      awards: prev.awards.map((award, i) => 
        i === index ? { ...award, [field]: value } : award
      ),
    }))
  }

  const removeAward = (index: number) => {
    setForm(prev => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }))
  }

  // Language handlers
  const addLanguage = () => {
    setForm(prev => ({
      ...prev,
      languages: [
        ...prev.languages,
        { id: Date.now().toString(), language: '' },
      ],
    }))
  }

  const updateLanguage = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => 
        i === index ? { ...lang, [field]: value } : lang
      ),
    }))
  }

  const removeLanguage = (index: number) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }))
  }

  // Computer Skills handlers
  const addComputerSkill = () => {
    setForm(prev => ({
      ...prev,
      computerSkills: [
        ...prev.computerSkills,
        { id: Date.now().toString(), skillType: '' },
      ],
    }))
  }

  const updateComputerSkill = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      computerSkills: prev.computerSkills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      ),
    }))
  }

  const removeComputerSkill = (index: number) => {
    setForm(prev => ({
      ...prev,
      computerSkills: prev.computerSkills.filter((_, i) => i !== index),
    }))
  }

  // Certificate handlers
  const addCertificate = () => {
    setForm(prev => ({
      ...prev,
      certificates: [
        ...prev.certificates,
        { id: Date.now().toString(), obtainDate: '', certificateName: '' },
      ],
    }))
  }

  const updateCertificate = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      certificates: prev.certificates.map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      ),
    }))
  }

  const removeCertificate = (index: number) => {
    setForm(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size={40} />
      </div>
    )
  }

  if (blockedByAuth) {
    return (
      <>
        <div className="mx-auto max-w-[980px] px-6 py-14">
          <div className="rounded-[12px] border border-border bg-background/70 p-8 text-center">
            <p className="text-sm text-muted-foreground">登录后可编辑该数据源。</p>
            <div className="mt-4">
              <Link href={`/login?next=${encodeURIComponent(pathname || '/resume/data-source')}`}>
                <Button type="default" size="large">去登录</Button>
              </Link>
            </div>
          </div>
        </div>
        <AuthRequiredModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectPath={pathname || '/resume/data-source'}
        />
      </>
    )
  }

  const scrollToSection = (id: DataSourceSectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div
        className="mx-auto max-w-[1480px] px-6 pb-40 pt-8 md:pb-32"
        style={
          {
            '--editor-section-sticky-top': `${DATA_SOURCE_STICKY_TOP}px`,
          } as CSSProperties
        }
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          <div className="min-w-0 flex-1">
            <Form form={formRef} layout="vertical" autoComplete="off">
              <Card id={DATA_SOURCE_SECTION_IDS.settings} title="基本设置" layout="editor-section">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <FormItem label="数据源名称" required>
                    <Input
                      value={form.name}
                      onChange={value => setForm(prev => ({ ...prev, name: value }))}
                      placeholder="例如：前端开发、产品经理"
                    />
                  </FormItem>
                  <FormItem label="语言模式">
                    <Select
                      value={form.langMode}
                      onChange={value => setForm(prev => ({ ...prev, langMode: value as 'zh' | 'en' }))}
                    >
                      <Option value="zh">中文</Option>
                      <Option value="en">English</Option>
                    </Select>
                  </FormItem>
                </div>
              </Card>

              <BasicInfoSection data={form.basics} onChange={updateBasics} />
              <IntentionSection data={form.intention} onChange={updateIntention} />

              <EducationSection
                data={form.education}
                onChange={updateEducation}
                onAdd={addEducation}
                onRemove={removeEducation}
              />

              <WorkSection
                data={form.work}
                onChange={updateWork}
                onAdd={addWork}
                onRemove={removeWork}
              />

              <ProjectSection
                data={form.projects}
                onChange={updateProject}
                onAdd={addProject}
                onRemove={removeProject}
              />

              <CampusExperienceSection
                data={form.campusExperience}
                onChange={updateCampusExperience}
                onAdd={addCampusExperience}
                onRemove={removeCampusExperience}
              />

              <AwardsSection
                data={form.awards}
                onChange={updateAward}
                onAdd={addAward}
                onRemove={removeAward}
              />

              <LanguagesSection
                data={form.languages}
                onChange={updateLanguage}
                onAdd={addLanguage}
                onRemove={removeLanguage}
              />

              <ComputerSkillsSection
                data={form.computerSkills}
                onChange={updateComputerSkill}
                onAdd={addComputerSkill}
                onRemove={removeComputerSkill}
              />

              <CertificatesSection
                data={form.certificates}
                onChange={updateCertificate}
                onAdd={addCertificate}
                onRemove={removeCertificate}
              />

              <Card id={DATA_SOURCE_SECTION_IDS.skills} title="技能" layout="editor-section">
                <FormItem label="技能（逗号分隔）">
                  <Input
                    value={form.skills}
                    onChange={value => setForm(prev => ({ ...prev, skills: value }))}
                    placeholder="JavaScript, React, Node.js, TypeScript"
                  />
                </FormItem>
              </Card>

              <Card id={DATA_SOURCE_SECTION_IDS.selfEvaluation} title="自我评价" layout="editor-section">
                <FormItem label="自我评价">
                  <TextArea
                    value={form.selfEvaluation}
                    onChange={value => setForm(prev => ({ ...prev, selfEvaluation: value }))}
                    placeholder="简单介绍一下自己..."
                    rows={4}
                  />
                </FormItem>
              </Card>

              <Card id={DATA_SOURCE_SECTION_IDS.hobbies} title="兴趣爱好" layout="editor-section">
                <FormItem label="兴趣爱好">
                  <TextArea
                    value={form.hobbies}
                    onChange={value => setForm(prev => ({ ...prev, hobbies: value }))}
                    placeholder="阅读、运动、旅游..."
                    rows={3}
                  />
                </FormItem>
              </Card>

              <Card id={DATA_SOURCE_SECTION_IDS.summary} title="个人简介" layout="editor-section">
                <div style={{ display: 'grid', gap: '16px' }}>
                  <FormItem label="中文简介">
                    <TextArea
                      value={form.summaryZh}
                      onChange={value => setForm(prev => ({ ...prev, summaryZh: value }))}
                      placeholder="简单介绍一下自己..."
                      rows={4}
                    />
                  </FormItem>
                  <FormItem label="英文简介">
                    <TextArea
                      value={form.summaryEn}
                      onChange={value => setForm(prev => ({ ...prev, summaryEn: value }))}
                      placeholder="A brief introduction about yourself..."
                      rows={4}
                    />
                  </FormItem>
                </div>
              </Card>
            </Form>
          </div>

          <aside className="hidden w-[220px] flex-none lg:block lg:self-stretch">
            <div
              className="sticky rounded-[12px] border border-border bg-background/80 p-3 backdrop-blur"
              style={{ top: DATA_SOURCE_STICKY_TOP }}
            >
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                导航
              </div>
              <nav className="flex flex-col gap-1">
                {DATA_SOURCE_SECTION_NAV.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={[
                      'rounded-sm px-3 py-2 text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>

      <footer className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/94 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-[1480px] items-center justify-center gap-4 px-6 py-4">
          <Link href="/resume/data-source">
            <Button type="text" size="large" icon={<IconArrowLeft />} className="px-3">
              返回
            </Button>
          </Link>
          <Button
            type="default"
            size="large"
            onClick={handleSave}
            loading={saving}
            className="border-transparent shadow-none"
            style={{
              backgroundColor: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: '#03150a',
            }}
          >
            保存
          </Button>
        </div>
      </footer>
      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={pathname || '/resume/data-source'}
      />
    </>
  )
}
