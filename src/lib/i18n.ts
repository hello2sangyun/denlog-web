import { useStore } from '@/store/useStore';

type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

export const translations: Translations = {
  en: {
    // Sidebar
    'nav.inbox': 'Inbox',
    'nav.today': 'Today',
    'nav.upcoming': 'Upcoming',
    'nav.people': 'People',
    'nav.cabinet': 'Cabinet',
    'nav.completed': 'Completed',
    'nav.allTasks': 'All Tasks',
    'nav.unfiled': 'No Folder',
    'nav.newTask': 'Add Task',
    'nav.meetings': 'Meetings',
    'nav.integrations': 'Integrations',
    'nav.settings': 'Settings',

    // Headers & Main Actions
    'header.searchTasks': 'Search tasks, people, meetings...',
    'header.searchRecordings': 'Search recordings...',
    'action.record': 'Record',
    'action.list': 'List',
    'action.board': 'Board',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.loading': 'Loading...',
    'action.move': 'Move',
    'action.complete': 'Complete',
    'action.selected': ' selected',

    // Settings
    'settings.title': 'Settings',
    'settings.account': 'Account',
    'settings.general': 'General',
    'settings.appearance': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.reminders': 'Reminder Settings',
    'settings.integrations': 'Integrations',
    'settings.support': 'Help & Feedback',
    
    'settings.displayLanguage': 'Display Language',
    'settings.aiSensitivity': 'AI Sensitivity',
    'settings.aiSensitivity.desc': 'Adjust how aggressively the AI extracts tasks from your integrations.',
    'settings.startWeekOn': 'Start Week On',
    'settings.startWeekOn.monday': 'Monday',
    'settings.startWeekOn.sunday': 'Sunday',
    'settings.aiSensitivity.low': 'Low',
    'settings.aiSensitivity.medium': 'Medium',
    'settings.aiSensitivity.high': 'High',
    
    'settings.pushNotifications': 'Push Notifications',
    'settings.pushNotifications.desc': 'Receive notifications for @mentions, comments, and due tasks.',
    'settings.comments': 'Comments',
    'settings.comments.desc': 'Notify me when someone comments on my tasks.',
    'settings.mentions': '@Mentions',
    'settings.mentions.desc': 'Notify me when someone mentions me.',
    'settings.dueToday': 'Due Today',
    'settings.dueToday.desc': 'Notify me about tasks due today.',
    'settings.dueSoon': 'Due Soon',
    'settings.dueSoon.desc': 'Notify me 2 days before tasks are due.',
    'settings.overdue': 'Overdue',
    'settings.overdue.desc': 'Notify me about overdue tasks daily.',

    // Empty States
    'empty.allCaughtUp': 'All done today! 🎉',
    'empty.allCaughtUpDesc': 'No tasks for today',
    'empty.noUpcoming': 'No upcoming tasks',
    'empty.noUpcomingDesc': 'Tasks with a due date will appear here',
    'empty.noRecordings': 'No meeting records',
    'empty.noRecordingsDesc': 'Record a meeting or voice memo to see AI transcripts and tasks here.',
    'empty.noResultsFor': 'No results for',

    'filter.all': 'All',
    'filter.solo': 'Solo',
    'filter.team': 'Team',
    'filter.call': 'Call',
    'filter.shared': 'Shared',
    'filter.tomorrow': 'Tomorrow',
    'filter.thisWeek': 'This Week',
    'filter.nextWeek': 'Next Week',
    'filter.later': 'Later',

    'todo.selectAll': 'Select All',
    'todo.deselectAll': 'Deselect All',

    // Create Todo Dialog
    'createTodo.title': 'Add Task',
    'createTodo.placeholder': 'Enter task title',
    'createTodo.memo': 'Add notes...',
    'createTodo.setReminder': 'Set Reminder',
    'createTodo.searchFriends': 'Search friends, people...',
    'createTodo.tags': 'Tags',
    'createTodo.addTag': 'Add tag and press Enter',
    'createTodo.createBtn': 'Add Task',
    'createTodo.creatingBtn': 'Loading...',

    // Details & Actions
    'detail.markComplete': 'Mark Complete',
    'detail.markIncomplete': 'Mark Incomplete',
    'detail.delete': 'Delete',
    'detail.addDesc': 'Add notes...',
    'detail.addComment': 'Add a comment...',
    'detail.search': 'Search',
    'detail.empty': 'No Priority',

    // Modals
    'modal.recordMeeting': 'Record a Meeting',
    'modal.soloRecording': 'Voice Input',
    'modal.soloDesc': 'Record your personal notes, ideas, or to-dos.',
    'modal.teamMeeting': 'Meetings',
    'modal.teamDesc': 'Record and share meetings with your team members.',
    'modal.start': 'Start Meeting',
    'modal.selectLanguage': 'Select Language',
    'modal.chooseMode': 'Choose how you want to record',
    'modal.langDesc': 'Tasks will be generated in your selected language',
  },
  ko: {
    // Sidebar
    'nav.inbox': '인박스',
    'nav.today': '오늘',
    'nav.upcoming': '예정',
    'nav.people': '친구',
    'nav.cabinet': '캐비넷',
    'nav.completed': '완료됨',
    'nav.allTasks': '모든 작업',
    'nav.unfiled': '폴더 없음',
    'nav.newTask': '할 일 추가',
    'nav.meetings': '회의',
    'nav.integrations': '연동 채널',
    'nav.settings': '설정',

    // Headers & Main Actions
    'header.searchTasks': '할 일, 사람, 회의 검색...',
    'header.searchRecordings': '녹음 검색...',
    'action.record': '녹음',
    'action.list': '리스트',
    'action.board': '보드',
    'action.save': '저장',
    'action.cancel': '취소',
    'action.delete': '삭제',
    'action.loading': '불러오는 중...',
    'action.move': '이동',
    'action.complete': '완료',
    'action.selected': '개 선택됨',

    // Settings
    'settings.title': '설정',
    'settings.account': '계정',
    'settings.general': '일반',
    'settings.appearance': '테마',
    'settings.notifications': '알림 설정',
    'settings.reminders': '리마인더 설정',
    'settings.integrations': '연동 채널',
    'settings.support': '도움말/피드백',
    
    'settings.displayLanguage': '언어 설정',
    'settings.aiSensitivity': 'AI 민감도',
    'settings.aiSensitivity.desc': '연동된 앱에서 AI가 작업을 추출하는 강도를 조절합니다.',
    'settings.startWeekOn': '한 주의 시작',
    'settings.startWeekOn.monday': '월요일',
    'settings.startWeekOn.sunday': '일요일',
    'settings.aiSensitivity.low': '낮음',
    'settings.aiSensitivity.medium': '보통',
    'settings.aiSensitivity.high': '높음',

    'settings.pushNotifications': '푸시 알림',
    'settings.pushNotifications.desc': '멘션, 댓글, 마감일 관련 알림을 받습니다.',
    'settings.comments': '댓글',
    'settings.comments.desc': '내 작업에 댓글이 달릴 때 알림을 받습니다.',
    'settings.mentions': '@멘션',
    'settings.mentions.desc': '누군가 나를 멘션할 때 알림을 받습니다.',
    'settings.dueToday': '오늘 마감',
    'settings.dueToday.desc': '오늘 마감인 작업 알림을 받습니다.',
    'settings.dueSoon': '마감 임박',
    'settings.dueSoon.desc': '마감 2일 전에 알림을 받습니다.',
    'settings.overdue': '기한 초과',
    'settings.overdue.desc': '마감일이 지난 작업에 대해 매일 알림을 받습니다.',

    // Empty States
    'empty.allCaughtUp': '오늘 할 일 완료! 🎉',
    'empty.allCaughtUpDesc': '오늘 할 일이 없어요',
    'empty.noUpcoming': '예정된 할 일이 없어요',
    'empty.noUpcomingDesc': '마감일을 설정하면 여기서 볼 수 있어요',
    'empty.noRecordings': '회의 기록이 없어요',
    'empty.noRecordingsDesc': '회의나 음성 메모를 녹음하면 AI가 텍스트와 할 일을 추출해드려요.',
    'empty.noResultsFor': '다음에 대한 결과 없음:',

    'filter.all': '전체',
    'filter.solo': '솔로',
    'filter.team': '팀',
    'filter.call': '통화',
    'filter.shared': '공유됨',
    'filter.tomorrow': '내일',
    'filter.thisWeek': '이번 주',
    'filter.nextWeek': '다음 주',
    'filter.later': '나중에',

    'todo.selectAll': '전체 선택',
    'todo.deselectAll': '전체 해제',

    // Create Todo Dialog
    'createTodo.title': '할 일 추가',
    'createTodo.placeholder': '할 일을 입력하세요',
    'createTodo.memo': '메모를 입력하세요',
    'createTodo.setReminder': '리마인더 설정',
    'createTodo.searchFriends': '친구 검색...',
    'createTodo.tags': '태그',
    'createTodo.addTag': '태그 입력 후 Enter',
    'createTodo.createBtn': '할 일 추가',
    'createTodo.creatingBtn': '불러오는 중...',

    // Details & Actions
    'detail.markComplete': '완료 처리',
    'detail.markIncomplete': '미완료로 변경',
    'detail.delete': '삭제',
    'detail.addDesc': '메모를 입력하세요',
    'detail.addComment': '댓글 추가...',
    'detail.search': '검색',
    'detail.empty': '우선순위 없음',

    // Modals
    'modal.recordMeeting': '회의 시작',
    'modal.soloRecording': '음성으로 추가',
    'modal.soloDesc': '개인적인 메모, 아이디어, 할 일 등을 녹음하세요.',
    'modal.teamMeeting': '회의',
    'modal.teamDesc': '팀원들과 회의 내용을 녹음하고 공유하세요.',
    'modal.start': '회의 시작',
    'modal.selectLanguage': '언어 설정',
    'modal.chooseMode': '녹음 방식을 선택해주세요',
    'modal.langDesc': '선택한 언어로 할 일이 생성됩니다',
  }
};

export function useTranslation() {
  const language = useStore((state) => state.language);
  
  const t = (key: string): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || key;
  };

  return { t, language };
}
