import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'

export const Login = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.Login })),
)
export const Register = lazy(() =>
  import('@/pages/Register').then((m) => ({ default: m.Register })),
)
export const OrgInvite = lazy(() =>
  import('@/pages/OrgInvite').then((m) => ({ default: m.OrgInvite })),
)
export const ForgotPassword = lazy(() =>
  import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
)
export const ChangePassword = lazy(() =>
  import('@/pages/ChangePassword').then((m) => ({ default: m.ChangePassword })),
)
export const NotFound = lazy(() =>
  import('@/pages/NotFound').then((m) => ({ default: m.NotFound })),
)
export const Home = lazy(() =>
  import('@/pages/Home').then((m) => ({ default: m.Home })),
)
export const Profile = lazy(() =>
  import('@/pages/Profile').then((m) => ({ default: m.Profile })),
)
export const Social = lazy(() =>
  import('@/pages/Social').then((m) => ({ default: m.Social })),
)
export const PrivacySettings = lazy(() =>
  import('@/pages/PrivacySettings').then((m) => ({
    default: m.PrivacySettings,
  })),
)
export const ChangeProfile = lazy(() =>
  import('@/pages/ChangeProfile').then((m) => ({ default: m.ChangeProfile })),
)
export const Bulletin = lazy(() =>
  import('@/pages/Bulletin').then((m) => ({ default: m.Bulletin })),
)
export const Discover = lazy(() =>
  import('@/pages/Discover').then((m) => ({ default: m.Discover })),
)
export const BlogPlaza = lazy(() =>
  import('@/pages/BlogPlaza').then((m) => ({ default: m.BlogPlaza })),
)
export const AllActivities = lazy(() =>
  import('@/pages/AllActivities').then((m) => ({ default: m.AllActivities })),
)
export const Contest = lazy(() =>
  import('@/pages/Contest').then((m) => ({ default: m.Contest })),
)
export const ContestDetails = lazy(() =>
  import('@/pages/ContestDetails').then((m) => ({ default: m.ContestDetails })),
)

export const QuestionBank = lazy(() =>
  import('@/pages/QuestionBank').then((m) => ({ default: m.QuestionBank })),
)
export const QuestionBankDetail = lazy(() =>
  import('@/pages/QuestionBankDetail').then((m) => ({
    default: m.QuestionBankDetail,
  })),
)
export const ProblemsetHome = lazy(() =>
  import('@/pages/problemset/ProblemsetHome').then((m) => ({
    default: m.ProblemsetHome,
  })),
)
export const ProblemsetDetail = lazy(() =>
  import('@/pages/problemset/ProblemsetDetail').then((m) => ({
    default: m.ProblemsetDetail,
  })),
)
export const ProblemsetAddManual = lazy(() =>
  import('@/pages/problemset/ProblemsetAddManual').then((m) => ({
    default: m.ProblemsetAddManual,
  })),
)
export const ProblemContentEdit = lazy(() =>
  import('@/pages/ProblemContentEdit').then((m) => ({
    default: m.ProblemContentEdit,
  })),
)
export const ProblemSolutionEdit = lazy(() =>
  import('@/pages/ProblemSolutionEdit').then((m) => ({
    default: m.ProblemSolutionEdit,
  })),
)
export const ProblemSolutionView = lazy(() =>
  import('@/pages/ProblemSolutionView').then((m) => ({
    default: m.ProblemSolutionView,
  })),
)
export const DashboardOrgStatistics = lazy(() =>
  import('@/pages/dashboard/Statistics').then((m) => ({
    default: m.DashboardOrgStatistics,
  })),
)
export const DashboardSiteData = lazy(() =>
  import('@/pages/dashboard/SiteData').then((m) => ({
    default: m.DashboardSiteData,
  })),
)
export const DashboardOrgPeople = lazy(() =>
  import('@/pages/dashboard/OrgPeople').then((m) => ({
    default: m.DashboardOrgPeople,
  })),
)
export const DashboardSiteUser = lazy(() =>
  import('@/pages/dashboard/User').then((m) => ({
    default: m.DashboardSiteUser,
  })),
)
export const DashboardOrgBulletinManage = lazy(() =>
  import('@/pages/dashboard/BulletinManage').then((m) => ({
    default: m.DashboardOrgBulletinManage,
  })),
)
export const DashboardSiteNotices = lazy(() =>
  import('@/pages/dashboard/SiteNotices').then((m) => ({
    default: m.DashboardSiteNotices,
  })),
)
export const DashboardProblemProgress = lazy(() =>
  import('@/pages/dashboard/ProblemProgress').then((m) => ({
    default: m.DashboardProblemProgress,
  })),
)
export const DashboardProblemEditReview = lazy(() =>
  import('@/pages/dashboard/ProblemEditReview').then((m) => ({
    default: m.DashboardProblemEditReview,
  })),
)
export const DashboardSiteSettings = lazy(() =>
  import('@/pages/dashboard/SiteSettings').then((m) => ({
    default: m.DashboardSiteSettings,
  })),
)
export const DashboardOps = lazy(() =>
  import('@/pages/dashboard/Ops').then((m) => ({
    default: m.DashboardOps,
  })),
)
export const DashboardOrgSettings = lazy(() =>
  import('@/pages/dashboard/OrgSettings').then((m) => ({
    default: m.DashboardOrgSettings,
  })),
)
export const DashboardOrgsManage = lazy(() =>
  import('@/pages/dashboard/OrgsManage').then((m) => ({
    default: m.DashboardOrgsManage,
  })),
)
export const DashboardReportsManage = lazy(() =>
  import('@/pages/dashboard/ReportsManage').then((m) => ({
    default: m.DashboardReportsManage,
  })),
)
export const DashboardBlogAdmin = lazy(() =>
  import('@/pages/dashboard/BlogAdmin').then((m) => ({
    default: m.DashboardBlogAdmin,
  })),
)
export const DashboardRolesManage = lazy(() =>
  import('@/pages/dashboard/RolesManage').then((m) => ({
    default: m.DashboardRolesManage,
  })),
)
export const OrgHub = lazy(() =>
  import('@/pages/OrgHub').then((m) => ({ default: m.OrgHub })),
)
export const About = lazy(() =>
  import('@/pages/About').then((m) => ({ default: m.About })),
)
export const ToolsHub = lazy(() =>
  import('@/pages/tools/ToolsHub').then((m) => ({ default: m.ToolsHub })),
)
export const PasteCreate = lazy(() =>
  import('@/pages/tools/PasteCreate').then((m) => ({ default: m.PasteCreate })),
)
export const PasteView = lazy(() =>
  import('@/pages/tools/PasteView').then((m) => ({ default: m.PasteView })),
)
export const CodeToImage = lazy(() =>
  import('@/pages/tools/CodeToImage').then((m) => ({ default: m.CodeToImage })),
)
export const BlogLayout = lazy(() =>
  import('@/layouts/BlogLayout').then((m) => ({ default: m.BlogLayout })),
)
export const BlogAdminLayout = lazy(() =>
  import('@/layouts/BlogAdminLayout').then((m) => ({
    default: m.BlogAdminLayout,
  })),
)
export const BlogHome = lazy(() =>
  import('@/pages/blog/BlogHome').then((m) => ({ default: m.BlogHome })),
)
export const BlogArticlePage = lazy(() =>
  import('@/pages/blog/BlogArticle').then((m) => ({
    default: m.BlogArticlePage,
  })),
)
export const BlogManage = lazy(() =>
  import('@/pages/blog/BlogManage').then((m) => ({ default: m.BlogManage })),
)
export const BlogEditor = lazy(() =>
  import('@/pages/blog/BlogEditor').then((m) => ({ default: m.BlogEditor })),
)
export const BlogAnalyticsPage = lazy(() =>
  import('@/pages/blog/BlogAnalytics').then((m) => ({
    default: m.BlogAnalyticsPage,
  })),
)
export const BlogCategoriesPage = lazy(() =>
  import('@/pages/blog/BlogCategories').then((m) => ({
    default: m.BlogCategoriesPage,
  })),
)
export const BlogSettingsPage = lazy(() =>
  import('@/pages/blog/BlogSettings').then((m) => ({
    default: m.BlogSettingsPage,
  })),
)
export const BlogCategoriesPublicPage = lazy(() =>
  import('@/pages/blog/BlogCategoriesPublic').then((m) => ({
    default: m.BlogCategoriesPublicPage,
  })),
)
export const BlogArchivesPage = lazy(() =>
  import('@/pages/blog/BlogArchives').then((m) => ({
    default: m.BlogArchivesPage,
  })),
)
export const BlogAboutPage = lazy(() =>
  import('@/pages/blog/BlogAbout').then((m) => ({ default: m.BlogAboutPage })),
)
export const BlogFriendsPage = lazy(() =>
  import('@/pages/blog/BlogFriends').then((m) => ({
    default: m.BlogFriendsPage,
  })),
)
