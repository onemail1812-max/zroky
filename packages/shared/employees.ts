/**
 * AI Employee definitions and shared schemas for Zroky
 */

export type EmployeeRole =
  | "executive_assistant"
  | "social_media_manager"
  | "seo_content_writer"
  | "ai_receptionist"
  | "legal_document_assistant"
  | "sales_outreach_coordinator"
  | "business_analyst"
  | "hr_coordinator";

export interface Ability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface Guideline {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface AIEmployee {
  id: string; // slug: aaliyah, shlok, perry, megan, reya, rico, babi, renee
  name: string;
  designation: string;
  role: EmployeeRole;
  avatarUrl?: string;
  bio: string;
  abilities: Ability[];
  guidelines: Guideline[];
  traits: string[];
  latestActivity: string;
  currentContext: string;
  lastActivityAt: string; // ISO string
  needsAction: boolean;
}

/**
 * Default abilities for AI employees
 */
export const defaultAbilities: Record<string, Ability[]> = {
  manager: [
    {
      id: "ability_planning",
      name: "Strategic Planning",
      description: "Develop and execute strategic initiatives",
      enabled: true,
    },
    {
      id: "ability_delegation",
      name: "Task Delegation",
      description: "Assign and manage team workloads",
      enabled: true,
    },
    {
      id: "ability_reporting",
      name: "Performance Reporting",
      description: "Generate and analyze performance metrics",
      enabled: true,
    },
    {
      id: "ability_mentoring",
      name: "Team Mentoring",
      description: "Provide guidance and coaching",
      enabled: true,
    },
  ],
  analyst: [
    {
      id: "ability_data_analysis",
      name: "Data Analysis",
      description: "Analyze complex datasets and trends",
      enabled: true,
    },
    {
      id: "ability_reporting",
      name: "Report Generation",
      description: "Create detailed analytical reports",
      enabled: true,
    },
    {
      id: "ability_forecasting",
      name: "Forecasting",
      description: "Predict future trends and outcomes",
      enabled: true,
    },
    {
      id: "ability_visualization",
      name: "Data Visualization",
      description: "Create charts and visual representations",
      enabled: true,
    },
  ],
  developer: [
    {
      id: "ability_coding",
      name: "Code Development",
      description: "Write and maintain application code",
      enabled: true,
    },
    {
      id: "ability_debugging",
      name: "Debugging",
      description: "Identify and fix code issues",
      enabled: true,
    },
    {
      id: "ability_testing",
      name: "Testing",
      description: "Create and execute test cases",
      enabled: true,
    },
    {
      id: "ability_documentation",
      name: "Documentation",
      description: "Write technical documentation",
      enabled: true,
    },
  ],
  designer: [
    {
      id: "ability_ux_design",
      name: "UX Design",
      description: "Design user experience and interfaces",
      enabled: true,
    },
    {
      id: "ability_prototyping",
      name: "Prototyping",
      description: "Create interactive prototypes",
      enabled: true,
    },
    {
      id: "ability_research",
      name: "User Research",
      description: "Conduct user research and testing",
      enabled: true,
    },
    {
      id: "ability_brand",
      name: "Brand Design",
      description: "Develop and maintain brand guidelines",
      enabled: true,
    },
  ],
  coordinator: [
    {
      id: "ability_scheduling",
      name: "Scheduling",
      description: "Organize and manage schedules",
      enabled: true,
    },
    {
      id: "ability_communication",
      name: "Communication",
      description: "Facilitate team communication",
      enabled: true,
    },
    {
      id: "ability_documentation",
      name: "Documentation",
      description: "Maintain project documentation",
      enabled: true,
    },
    {
      id: "ability_coordination",
      name: "Project Coordination",
      description: "Coordinate cross-functional projects",
      enabled: true,
    },
  ],
};

/**
 * Default guidelines structure for AI employees
 */
export const defaultGuidelines: Guideline[] = [
  {
    id: "guideline_communication",
    category: "Communication",
    title: "Professional Communication",
    description:
      "Always maintain professional tone and clear communication with team members",
    priority: "high",
  },
  {
    id: "guideline_deadlines",
    category: "Work",
    title: "Meet Deadlines",
    description: "Prioritize and meet all assigned deadlines",
    priority: "high",
  },
  {
    id: "guideline_quality",
    category: "Work",
    title: "Quality Standards",
    description: "Maintain high quality standards in all deliverables",
    priority: "high",
  },
  {
    id: "guideline_collaboration",
    category: "Team",
    title: "Team Collaboration",
    description: "Work effectively with team members and share knowledge",
    priority: "medium",
  },
  {
    id: "guideline_feedback",
    category: "Development",
    title: "Feedback Reception",
    description: "Be open to feedback and continuous improvement",
    priority: "medium",
  },
  {
    id: "guideline_documentation",
    category: "Work",
    title: "Documentation",
    description: "Document work progress and decisions regularly",
    priority: "medium",
  },
  {
    id: "guideline_innovation",
    category: "Development",
    title: "Innovation",
    description: "Look for opportunities to improve processes and outcomes",
    priority: "low",
  },
];

/**
 * AI Employee Definitions
 */
export const aiEmployees: AIEmployee[] = [
  {
    id: "aaliyah",
    name: "Aaliyah",
    designation: "Executive Assistant",
    role: "executive_assistant",
    avatarUrl: undefined,
    bio: "Your strategic right hand for all things scheduling, reminders, and executive support.",
    abilities: [],
    guidelines: [],
    traits: ["Strategic", "Organized", "Empathetic", "Proactive"],
    latestActivity: "Scheduled a meeting with the board.",
    currentContext: "Coordinating Q1 review.",
    lastActivityAt: new Date().toISOString(),
    needsAction: false,
  },
  {
    id: "shlok",
    name: "Shlok",
    designation: "Social Media Manager",
    role: "social_media_manager",
    avatarUrl: undefined,
    bio: "Crafts and manages your brand's social presence across all platforms.",
    abilities: [],
    guidelines: [],
    traits: ["Creative", "Trendy", "Analytical", "Responsive"],
    latestActivity: "Posted a campaign update on Twitter.",
    currentContext: "Monitoring engagement for #ZrokyLaunch.",
    lastActivityAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    needsAction: true,
  },
  {
    id: "perry",
    name: "Perry",
    designation: "SEO Content Writer",
    role: "seo_content_writer",
    avatarUrl: undefined,
    bio: "Writes and optimizes content to boost your search rankings.",
    abilities: [],
    guidelines: [],
    traits: ["Detail-oriented", "Researcher", "Efficient", "Clear"],
    latestActivity: "Drafted a new blog post on AI trends.",
    currentContext: "Editing product launch article.",
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    needsAction: false,
  },
  {
    id: "megan",
    name: "Megan",
    designation: "AI Receptionist",
    role: "ai_receptionist",
    avatarUrl: undefined,
    bio: "Greets, routes, and assists all visitors and callers to your workspace.",
    abilities: [],
    guidelines: [],
    traits: ["Welcoming", "Helpful", "Organized", "Attentive"],
    latestActivity: "Answered a call from a new client.",
    currentContext: "Preparing visitor badges.",
    lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    needsAction: false,
  },
  {
    id: "reya",
    name: "Reya",
    designation: "Legal Document Assistant",
    role: "legal_document_assistant",
    avatarUrl: undefined,
    bio: "Drafts, reviews, and manages all legal paperwork and compliance.",
    abilities: [],
    guidelines: [],
    traits: ["Precise", "Discreet", "Thorough", "Reliable"],
    latestActivity: "Reviewed NDA for new partner.",
    currentContext: "Updating contract templates.",
    lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    needsAction: true,
  },
  {
    id: "rico",
    name: "Rico",
    designation: "Sales Outreach Coordinator",
    role: "sales_outreach_coordinator",
    avatarUrl: undefined,
    bio: "Leads outbound sales efforts and manages prospect pipelines.",
    abilities: [],
    guidelines: [],
    traits: ["Persuasive", "Energetic", "Organized", "Goal-driven"],
    latestActivity: "Sent follow-up emails to 12 leads.",
    currentContext: "Qualifying new prospects.",
    lastActivityAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    needsAction: false,
  },
  {
    id: "babi",
    name: "Babi",
    designation: "Business Analyst",
    role: "business_analyst",
    avatarUrl: undefined,
    bio: "Analyzes business data and provides actionable insights.",
    abilities: [],
    guidelines: [],
    traits: ["Analytical", "Insightful", "Methodical", "Resourceful"],
    latestActivity: "Generated weekly performance report.",
    currentContext: "Reviewing Q4 metrics.",
    lastActivityAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    needsAction: false,
  },
  {
    id: "renee",
    name: "Renee",
    designation: "HR Coordinator",
    role: "hr_coordinator",
    avatarUrl: undefined,
    bio: "Manages hiring, onboarding, and employee relations.",
    abilities: [],
    guidelines: [],
    traits: ["Supportive", "Organized", "Discreet", "Empathetic"],
    latestActivity: "Completed onboarding for new hire.",
    currentContext: "Scheduling interviews.",
    lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    needsAction: false,
  },
];

/**
 * Helper functions
 */

export function getEmployeeById(id: string): AIEmployee | undefined {
  return aiEmployees.find((emp) => emp.id === id);
}

export function getEmployeeByName(name: string): AIEmployee | undefined {
  return aiEmployees.find((emp) => emp.name === name);
}

export function getEmployeesByRole(role: EmployeeRole): AIEmployee[] {
  return aiEmployees.filter((emp) => emp.role === role);
}

export function getDefaultAbilitiesForRole(role: EmployeeRole): Ability[] {
  return defaultAbilities[role] || [];
}

export function getGuidelinesByCategory(category: string): Guideline[] {
  return defaultGuidelines.filter((g) => g.category === category);
}
