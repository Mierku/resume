export const DATA_SOURCE_STICKY_TOP = 16

export const DATA_SOURCE_SECTION_IDS = {
  settings: 'data-source-settings',
  basics: 'data-source-basics',
  intention: 'data-source-intention',
  education: 'data-source-education',
  work: 'data-source-work',
  projects: 'data-source-projects',
  campusExperience: 'data-source-campus-experience',
  awards: 'data-source-awards',
  languages: 'data-source-languages',
  computerSkills: 'data-source-computer-skills',
  certificates: 'data-source-certificates',
  skills: 'data-source-skills',
  selfEvaluation: 'data-source-self-evaluation',
  hobbies: 'data-source-hobbies',
  summary: 'data-source-summary',
} as const

export const DATA_SOURCE_SECTION_NAV = [
  { id: DATA_SOURCE_SECTION_IDS.settings, label: '基本设置' },
  { id: DATA_SOURCE_SECTION_IDS.basics, label: '基本信息' },
  { id: DATA_SOURCE_SECTION_IDS.intention, label: '求职意向' },
  { id: DATA_SOURCE_SECTION_IDS.education, label: '教育经历' },
  { id: DATA_SOURCE_SECTION_IDS.work, label: '工作经历' },
  { id: DATA_SOURCE_SECTION_IDS.projects, label: '项目经历' },
  { id: DATA_SOURCE_SECTION_IDS.campusExperience, label: '在校经历' },
  { id: DATA_SOURCE_SECTION_IDS.awards, label: '获奖情况' },
  { id: DATA_SOURCE_SECTION_IDS.languages, label: '外语能力' },
  { id: DATA_SOURCE_SECTION_IDS.computerSkills, label: '计算机技能' },
  { id: DATA_SOURCE_SECTION_IDS.certificates, label: '资格证书' },
  { id: DATA_SOURCE_SECTION_IDS.skills, label: '技能' },
  { id: DATA_SOURCE_SECTION_IDS.selfEvaluation, label: '自我评价' },
  { id: DATA_SOURCE_SECTION_IDS.hobbies, label: '兴趣爱好' },
  { id: DATA_SOURCE_SECTION_IDS.summary, label: '个人简介' },
] as const
