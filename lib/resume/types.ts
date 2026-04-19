import { getTemplateDefaultPrimaryColor } from '@/lib/constants'
import { RECOMMENDED_RESUME_FONT_FAMILY } from './fonts'
import { SYSTEM_PAGE_GAP_X_PT, SYSTEM_PAGE_GAP_Y_PT } from './page-layout'



export const REACTIVE_TEMPLATE_IDS = [
  'template-1',
  'template-2',
  'template-3',
  'template-4',
  'template-5',
] as const

export type ReactiveTemplateId = (typeof REACTIVE_TEMPLATE_IDS)[number]
export const REACTIVE_HEADER_VARIANTS = ['header-1', 'header-2', 'header-3', 'header-4', 'header-5'] as const
export type ReactiveHeaderVariant = (typeof REACTIVE_HEADER_VARIANTS)[number]
export const REACTIVE_SECTION_VARIANTS = ['section-1', 'section-2', 'section-3', 'section-4'] as const
export type ReactiveSectionVariant = (typeof REACTIVE_SECTION_VARIANTS)[number]
export const REACTIVE_SKILLS_VARIANTS = ['skills-1', 'skills-2', 'skills-3', 'skills-4'] as const
export type ReactiveSkillsVariant = (typeof REACTIVE_SKILLS_VARIANTS)[number] | 'auto'

export type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type StandardSectionType =
  | 'profiles'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'interests'
  | 'awards'
  | 'certifications'
  | 'publications'
  | 'volunteer'
  | 'references'

export type CustomSectionType = StandardSectionType | 'summary' | 'cover-letter'

export interface UrlLink {
  url: string
  label: string
}

export interface PictureConfig {
  hidden: boolean
  url: string
  size: number
  rotation: number
  aspectRatio: number
  borderRadius: number
  borderColor: string
  borderWidth: number
  shadowColor: string
  shadowWidth: number
}

export interface CustomField {
  id: string
  icon: string
  text: string
  link: string
}

export interface BasicsData {
  name: string
  headline: string
  gender: string
  birthDate: string
  convertBirthToAge: boolean
  workYears: string
  email: string
  phone: string
  maritalStatus: string
  ethnicity: string
  nativePlace: string
  politicalStatus: string
  heightCm: string
  weightKg: string
  location: string
  intentionPosition: string
  intentionCity: string
  intentionSalary: string
  intentionAvailability: string
  website: UrlLink
  customFields: CustomField[]
}

export interface SummaryData {
  title: string
  columns: number
  hidden: boolean
  content: string
}

export interface BaseItem {
  id: string
  hidden: boolean
  options?: {
    showLinkInTitle?: boolean
  }
}

export interface ProfileItem extends BaseItem {
  icon: string
  network: string
  username: string
  website: UrlLink
}

export interface ExperienceItem extends BaseItem {
  company: string
  position: string
  location: string
  period: string
  website: UrlLink
  description: string
}

export interface EducationItem extends BaseItem {
  school: string
  degree: string
  area: string
  grade: string
  location: string
  period: string
  website: UrlLink
  description: string
}

export interface ProjectItem extends BaseItem {
  name: string
  period: string
  website: UrlLink
  description: string
}

export interface SkillItem extends BaseItem {
  icon: string
  name: string
  proficiency: string
  level: number
  keywords: string[]
}

export interface LanguageItem extends BaseItem {
  language: string
  fluency: string
  level: number
}

export interface InterestItem extends BaseItem {
  icon: string
  name: string
  keywords: string[]
}

export interface AwardItem extends BaseItem {
  title: string
  awarder: string
  date: string
  website: UrlLink
  description: string
}

export interface CertificationItem extends BaseItem {
  title: string
  issuer: string
  date: string
  website: UrlLink
  description: string
}

export interface PublicationItem extends BaseItem {
  title: string
  publisher: string
  date: string
  website: UrlLink
  description: string
}

export interface VolunteerItem extends BaseItem {
  organization: string
  location: string
  period: string
  website: UrlLink
  description: string
}

export interface ReferenceItem extends BaseItem {
  name: string
  position: string
  website: UrlLink
  phone: string
  description: string
}

export interface SummaryItem extends BaseItem {
  content: string
}

export interface CoverLetterItem extends BaseItem {
  recipient: string
  content: string
}

export type StandardSectionItemMap = {
  profiles: ProfileItem
  experience: ExperienceItem
  education: EducationItem
  projects: ProjectItem
  skills: SkillItem
  languages: LanguageItem
  interests: InterestItem
  awards: AwardItem
  certifications: CertificationItem
  publications: PublicationItem
  volunteer: VolunteerItem
  references: ReferenceItem
}

export type CustomSectionItemMap = StandardSectionItemMap & {
  summary: SummaryItem
  'cover-letter': CoverLetterItem
}

export type SectionItem<T extends StandardSectionType = StandardSectionType> = StandardSectionItemMap[T]

export type CustomSectionItem<T extends CustomSectionType = CustomSectionType> = CustomSectionItemMap[T]

export interface StandardSection<T extends StandardSectionType = StandardSectionType> {
  title: string
  intro: string
  columns: number
  hidden: boolean
  items: SectionItem<T>[]
}

export type SectionsData = {
  [K in StandardSectionType]: StandardSection<K>
}

export interface CustomSection<T extends CustomSectionType = CustomSectionType> {
  id: string
  type: T
  title: string
  columns: number
  hidden: boolean
  items: CustomSectionItem<T>[]
}

export interface PageLayout {
  fullWidth: boolean
  main: string[]
  sidebar: string[]
}

export interface LayoutData {
  sidebarWidth: number
  pages: PageLayout[]
}

export type ResumePageFormat = 'a4' | 'letter' | 'free-form'

export function normalizeResumePageFormat(value: unknown): ResumePageFormat {
  if (value === 'letter') return 'letter'
  return value === 'free-form' ? 'free-form' : 'a4'
}

export interface PageData {
  gapX: number
  gapY: number
  marginX: number
  marginY: number
  format: ResumePageFormat
  smartOnePageEnabled: boolean
}

export interface LevelDesign {
  icon: string
  type: 'hidden' | 'circle' | 'square' | 'rectangle' | 'rectangle-full' | 'progress-bar' | 'icon'
}

export interface ColorDesign {
  primary: string
  text: string
  background: string
}

export interface TypographyItem {
  fontFamily: string
  fontWeights: FontWeight[]
  fontSize: number
  lineHeight: number
}

export interface TypographyData {
  body: TypographyItem
  heading: TypographyItem
}

export interface MetadataData {
  template: ReactiveTemplateId
  layout: LayoutData
  page: PageData
  design: {
    headerVariant: ReactiveHeaderVariant | 'auto'
    sectionVariant: ReactiveSectionVariant | 'auto'
    skillsVariant: ReactiveSkillsVariant
    level: LevelDesign
    colors: ColorDesign
  }
  typography: TypographyData
  notes: string
}

export interface ResumeData {
  picture: PictureConfig
  basics: BasicsData
  summary: SummaryData
  sections: SectionsData
  customSections: CustomSection[]
  metadata: MetadataData
}

export interface ResumeContentV2 {
  version: 2
  builder: 'reactive-core'
  data: ResumeData
  legacyBackup?: unknown
  migratedAt?: string
}

export function isReactiveTemplateId(value: string): value is ReactiveTemplateId {
  return (REACTIVE_TEMPLATE_IDS as readonly string[]).includes(value)
}

export const STANDARD_SECTION_IDS: StandardSectionType[] = [
  'profiles',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'interests',
  'awards',
  'certifications',
  'publications',
  'volunteer',
  'references',
]

export function createDefaultResumeData(template: ReactiveTemplateId = 'template-1'): ResumeData {
  return {
    picture: {
      hidden: false,
      url: '',
      size: 110,
      rotation: 0,
      aspectRatio: 1,
      borderRadius: 2,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowWidth: 0,
    },
    basics: {
      name: '',
      headline: '',
      gender: '',
      birthDate: '',
      convertBirthToAge: false,
      workYears: '',
      email: '',
      phone: '',
      maritalStatus: '',
      ethnicity: '',
      nativePlace: '',
      politicalStatus: '',
      heightCm: '',
      weightKg: '',
      location: '',
      intentionPosition: '',
      intentionCity: '',
      intentionSalary: '',
      intentionAvailability: '',
      website: { url: '', label: '' },
      customFields: [],
    },
    summary: {
      title: '',
      columns: 1,
      hidden: false,
      content: '',
    },
    sections: {
      profiles: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      experience: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      education: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      projects: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      skills: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      languages: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      interests: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      awards: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      certifications: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      publications: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      volunteer: { title: '', intro: '', columns: 1, hidden: false, items: [] },
      references: { title: '', intro: '', columns: 1, hidden: false, items: [] },
    },
    customSections: [],
    metadata: {
      template,
      layout: {
        sidebarWidth: 29,
        pages: [
          {
            fullWidth: true,
            main: [
              'experience',
              'projects',
              'education',
              'summary',
              'skills',
            ],
            sidebar: [],
          },
        ],
      },
      page: {
        gapX: SYSTEM_PAGE_GAP_X_PT,
        gapY: SYSTEM_PAGE_GAP_Y_PT,
        marginX: 14,
        marginY: 12,
        format: 'a4',
        smartOnePageEnabled: false,
      },
      design: {
        headerVariant: 'auto',
        sectionVariant: 'auto',
        skillsVariant: 'auto',
        colors: {
          primary: getTemplateDefaultPrimaryColor(template),
          text: 'rgba(31, 41, 55, 1)',
          background: 'rgba(249, 250, 251, 1)',
        },
        level: {
          icon: 'star',
          type: 'circle',
        },
      },
      typography: {
        body: {
          fontFamily: RECOMMENDED_RESUME_FONT_FAMILY,
          fontWeights: ['400', '500'],
          fontSize: 10,
          lineHeight: 1.5,
        },
        heading: {
          fontFamily: RECOMMENDED_RESUME_FONT_FAMILY,
          fontWeights: ['600'],
          fontSize: 14,
          lineHeight: 1.5,
        },
      },
      notes: '',
    },
  }
}

export function createDefaultResumeContentV2(template: ReactiveTemplateId = 'template-1'): ResumeContentV2 {
  return {
    version: 2,
    builder: 'reactive-core',
    data: createDefaultResumeData(template),
    migratedAt: new Date().toISOString(),
  }
}
