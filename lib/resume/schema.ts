import { z } from 'zod'
import { SYSTEM_PAGE_GAP_X_PT, SYSTEM_PAGE_GAP_Y_PT } from './page-layout'
import { REACTIVE_HEADER_VARIANTS, REACTIVE_SECTION_VARIANTS, REACTIVE_SKILLS_VARIANTS, REACTIVE_TEMPLATE_IDS } from './types'

export const urlLinkSchema = z.object({
  url: z.string(),
  label: z.string(),
})

export const baseItemSchema = z.object({
  id: z.string(),
  hidden: z.boolean(),
  options: z
    .object({
      showLinkInTitle: z.boolean().optional(),
    })
    .optional(),
})

export const pictureSchema = z.object({
  hidden: z.boolean(),
  url: z.string(),
  size: z.number().min(32).max(512),
  rotation: z.number().min(0).max(360),
  aspectRatio: z.number().min(0.5).max(2.5),
  borderRadius: z.number().min(0).max(100),
  borderColor: z.string(),
  borderWidth: z.number().min(0),
  shadowColor: z.string(),
  shadowWidth: z.number().min(0),
})

export const basicsSchema = z.object({
  name: z.string(),
  headline: z.string(),
  gender: z.string().default(''),
  birthDate: z.string().default(''),
  convertBirthToAge: z.boolean().default(false),
  workYears: z.string().default(''),
  email: z.string(),
  phone: z.string(),
  maritalStatus: z.string().default(''),
  ethnicity: z.string().default(''),
  nativePlace: z.string().default(''),
  politicalStatus: z.string().default(''),
  heightCm: z.string().default(''),
  weightKg: z.string().default(''),
  location: z.string(),
  intentionPosition: z.string().default(''),
  intentionCity: z.string().default(''),
  intentionSalary: z.string().default(''),
  intentionAvailability: z.string().default(''),
  website: urlLinkSchema,
  customFields: z.array(
    z.object({
      id: z.string(),
      icon: z.string(),
      text: z.string(),
      link: z.string(),
    }),
  ),
})

export const summarySchema = z.object({
  title: z.string(),
  columns: z.number(),
  hidden: z.boolean(),
  content: z.string(),
})

export const profileItemSchema = baseItemSchema.extend({
  icon: z.string(),
  network: z.string(),
  username: z.string(),
  website: urlLinkSchema,
})

export const experienceItemSchema = baseItemSchema.extend({
  company: z.string(),
  position: z.string(),
  location: z.string(),
  period: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const educationItemSchema = baseItemSchema.extend({
  school: z.string(),
  degree: z.string(),
  area: z.string(),
  grade: z.string(),
  location: z.string(),
  period: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const projectItemSchema = baseItemSchema.extend({
  name: z.string(),
  period: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const skillItemSchema = baseItemSchema.extend({
  icon: z.string(),
  name: z.string(),
  proficiency: z.string(),
  level: z.number().min(0).max(5),
  keywords: z.array(z.string()),
})

export const languageItemSchema = baseItemSchema.extend({
  language: z.string(),
  fluency: z.string(),
  level: z.number().min(0).max(5),
})

export const interestItemSchema = baseItemSchema.extend({
  icon: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
})

export const awardItemSchema = baseItemSchema.extend({
  title: z.string(),
  awarder: z.string(),
  date: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const certificationItemSchema = baseItemSchema.extend({
  title: z.string(),
  issuer: z.string(),
  date: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const publicationItemSchema = baseItemSchema.extend({
  title: z.string(),
  publisher: z.string(),
  date: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const volunteerItemSchema = baseItemSchema.extend({
  organization: z.string(),
  location: z.string(),
  period: z.string(),
  website: urlLinkSchema,
  description: z.string(),
})

export const referenceItemSchema = baseItemSchema.extend({
  name: z.string(),
  position: z.string(),
  website: urlLinkSchema,
  phone: z.string(),
  description: z.string(),
})

export const customSectionTypeSchema = z.enum([
  'summary',
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
  'cover-letter',
])

export const customSectionItemSchema = z.union([
  baseItemSchema.extend({ recipient: z.string(), content: z.string() }),
  baseItemSchema.extend({ content: z.string() }),
  profileItemSchema,
  experienceItemSchema,
  educationItemSchema,
  projectItemSchema,
  skillItemSchema,
  languageItemSchema,
  interestItemSchema,
  awardItemSchema,
  certificationItemSchema,
  publicationItemSchema,
  volunteerItemSchema,
  referenceItemSchema,
])

const sectionBaseSchema = z.object({
  title: z.string(),
  intro: z.string().default(''),
  columns: z.number(),
  hidden: z.boolean(),
})

export const sectionsSchema = z.object({
  profiles: sectionBaseSchema.extend({ items: z.array(profileItemSchema) }),
  experience: sectionBaseSchema.extend({ items: z.array(experienceItemSchema) }),
  education: sectionBaseSchema.extend({ items: z.array(educationItemSchema) }),
  projects: sectionBaseSchema.extend({ items: z.array(projectItemSchema) }),
  skills: sectionBaseSchema.extend({ items: z.array(skillItemSchema) }),
  languages: sectionBaseSchema.extend({ items: z.array(languageItemSchema) }),
  interests: sectionBaseSchema.extend({ items: z.array(interestItemSchema) }),
  awards: sectionBaseSchema.extend({ items: z.array(awardItemSchema) }),
  certifications: sectionBaseSchema.extend({ items: z.array(certificationItemSchema) }),
  publications: sectionBaseSchema.extend({ items: z.array(publicationItemSchema) }),
  volunteer: sectionBaseSchema.extend({ items: z.array(volunteerItemSchema) }),
  references: sectionBaseSchema.extend({ items: z.array(referenceItemSchema) }),
})

export const pageLayoutSchema = z.object({
  fullWidth: z.boolean(),
  main: z.array(z.string()),
  sidebar: z.array(z.string()),
})

const HEADER_VARIANT_VALUES = ['auto', ...REACTIVE_HEADER_VARIANTS] as const
const SECTION_VARIANT_VALUES = ['auto', ...REACTIVE_SECTION_VARIANTS] as const
const SKILLS_VARIANT_VALUES = ['auto', ...REACTIVE_SKILLS_VARIANTS] as const

export const metadataSchema = z.object({
  template: z.enum(REACTIVE_TEMPLATE_IDS),
  layout: z.object({
    sidebarWidth: z.number().min(10).max(50),
    pages: z.array(pageLayoutSchema),
  }),
  page: z.object({
    gapX: z.number().min(0).default(SYSTEM_PAGE_GAP_X_PT),
    gapY: z.number().min(0).default(SYSTEM_PAGE_GAP_Y_PT),
    marginX: z.number().min(0),
    marginY: z.number().min(0),
    format: z.enum(['a4', 'letter', 'free-form']),
    locale: z.string(),
    smartOnePageEnabled: z.boolean().default(false),
  }),
  design: z.object({
    headerVariant: z.enum(HEADER_VARIANT_VALUES).default('auto'),
    sectionVariant: z.enum(SECTION_VARIANT_VALUES).default('auto'),
    skillsVariant: z.enum(SKILLS_VARIANT_VALUES).default('auto'),
    level: z.object({
      icon: z.string(),
      type: z.enum(['hidden', 'circle', 'square', 'rectangle', 'rectangle-full', 'progress-bar', 'icon']),
    }),
    colors: z.object({
      primary: z.string(),
      text: z.string(),
      background: z.string(),
    }),
  }),
  typography: z.object({
    body: z.object({
      fontFamily: z.string(),
      fontWeights: z.array(z.enum(['100', '200', '300', '400', '500', '600', '700', '800', '900'])),
      fontSize: z.number().min(10).max(18),
      lineHeight: z.number().min(0.5).max(4),
    }),
    heading: z.object({
      fontFamily: z.string(),
      fontWeights: z.array(z.enum(['100', '200', '300', '400', '500', '600', '700', '800', '900'])),
      fontSize: z.number().min(10).max(20),
      lineHeight: z.number().min(0.5).max(4),
    }),
  }),
  notes: z.string(),
})

export const customSectionSchema = z.object({
  id: z.string(),
  type: customSectionTypeSchema,
  title: z.string(),
  columns: z.number(),
  hidden: z.boolean(),
  items: z.array(customSectionItemSchema),
})

export const resumeDataSchema = z.object({
  picture: pictureSchema,
  basics: basicsSchema,
  summary: summarySchema,
  sections: sectionsSchema,
  customSections: z.array(customSectionSchema),
  metadata: metadataSchema,
})

export const resumeContentV2Schema = z.object({
  version: z.literal(2),
  builder: z.literal('reactive-core'),
  data: resumeDataSchema,
  legacyBackup: z.unknown().optional(),
  migratedAt: z.string().optional(),
})

export type ResumeContentV2Schema = z.infer<typeof resumeContentV2Schema>
