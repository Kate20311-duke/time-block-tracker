import type { TimeBlockStatus } from "@/lib/constants";

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_COOKIE = "locale";

export type Dictionary = {
  app: {
    brand: string;
    metaDescription: string;
  };
  lang: {
    switcherAria: string;
    zh: string;
    en: string;
  };
  common: {
    create: string;
    edit: string;
    save: string;
    cancel: string;
    delete: string;
    submitting: string;
  };
  nav: {
    aria: string;
    home: string;
    categories: string;
    timeBlocks: string;
    calendar: string;
    dashboard: string;
    review: string;
  };
  home: {
    title: string;
    subtitle: string;
    quickLinks: string;
    startTracking: string;
    viewDashboard: string;
    cards: {
      categories: { title: string; description: string };
      timeBlocks: { title: string; description: string };
      calendar: { title: string; description: string };
      dashboard: { title: string; description: string };
    };
  };
  calendar: {
    title: string;
    subtitle: string;
    viewSwitcherAria: string;
    weekView: string;
    dayView: string;
    dateNavAria: string;
    prevDay: string;
    nextDay: string;
    prevWeek: string;
    nextWeek: string;
    thisWeek: string;
    today: string;
    empty: string;
    emptyWeek: string;
    editHintPrefix: string;
    editHintLink: string;
    editHintSuffix: string;
    edit: {
      panelAria: string;
    };
    drag: {
      saveFailed: string;
    };
    detail: {
      panelAria: string;
      close: string;
      notFound: string;
      editOnTimeBlocks: string;
    };
  };
  categories: {
    title: string;
    subtitle: string;
    newCategory: string;
    allCategories: string;
    name: string;
    color: string;
    description: string;
    descriptionOptional: string;
    empty: string;
    namePlaceholder: string;
    descriptionPlaceholder: string;
    timeBlockCount: string;
    cannotDelete: string;
    confirmDelete: string;
    success: { created: string; updated: string; deleted: string };
    errors: { hasTimeBlocks: string; deleteFailed: string; emptyName: string };
  };
  timeBlocks: {
    title: string;
    subtitle: string;
    newTimeBlock: string;
    allTimeBlocks: string;
    titleLabel: string;
    category: string;
    startTime: string;
    endTime: string;
    note: string;
    noteOptional: string;
    status: string;
    completion: string;
    completionRange: string;
    efficiency: string;
    efficiencyOptional: string;
    selectEfficiency: string;
    reviewNote: string;
    reviewNoteOptional: string;
    duration: string;
    empty: string;
    cannotEditNoCategories: string;
    needCategoryPrefix: string;
    needCategorySuffix: string;
    categoriesLink: string;
    selectCategory: string;
    titlePlaceholder: string;
    notePlaceholder: string;
    reviewNotePlaceholder: string;
    minutesUnit: string;
    confirmDelete: string;
    success: { created: string; updated: string; deleted: string };
    errors: {
      missingFields: string;
      invalidRange: string;
      invalidStatus: string;
      invalidCompletion: string;
      updateFailed: string;
      deleteFailed: string;
    };
  };
  dashboard: {
    title: string;
    subtitle: string;
    overview: string;
    today: string;
    thisWeek: string;
    byCategory: string;
    todayTotalRecordedTime: string;
    weekTotalRecordedTime: string;
    todayTimeBlocks: string;
    weekTimeBlocks: string;
    statusCounts: string;
    charts: string;
    categoryBreakdownChart: string;
    weeklyDailyTotalsChart: string;
    completionStatusChart: string;
    emptyChart: string;
    totalCategories: string;
    totalTimeBlocks: string;
    totalRecordedTime: string;
    completedRecords: string;
    plannedRecords: string;
    hoursUnit: string;
    blockCount: string;
    percentOfTotal: string;
    uncategorized: string;
    emptyCategories: string;
    noData: string;
  };
  review: {
    dayTitle: string;
    daySubtitle: string;
    weekTitle: string;
    weekSubtitle: string;
    selectDate: string;
    selectWeek: string;
    view: string;
    emptyDay: string;
    emptyWeek: string;
    summary: string;
    totalPlannedTime: string;
    estimatedCompletedTime: string;
    skippedTime: string;
    completionRate: string;
    averageCompletionLevel: string;
    categoryBreakdown: string;
    completionByCategory: string;
    dailyBreakdown: string;
    itemsToReview: string;
    incompleteOrSkipped: string;
    allBlocks: string;
    backToCalendar: string;
    backToDashboard: string;
  };
  status: Record<TimeBlockStatus, string>;
};
