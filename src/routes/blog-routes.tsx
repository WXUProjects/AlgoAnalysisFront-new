import type { RouteObject } from 'react-router-dom'
import { RouteErrorFallback } from '@/components/error-boundary'
import { Lazy } from '@/routes/lazy'
import {
  BlogAboutPage,
  BlogAdminLayout,
  BlogAnalyticsPage,
  BlogArchivesPage,
  BlogArticlePage,
  BlogCategoriesPage,
  BlogCategoriesPublicPage,
  BlogEditor,
  BlogFriendsPage,
  BlogHome,
  BlogLayout,
  BlogManage,
  BlogSettingsPage,
} from '@/routes/lazy-pages'

/** 博客管理壳 + 公开阅读壳 */
export const blogRoutes: RouteObject[] = [
  // Manage is a standalone shell (new tab from public blog)
  {
    path: '/blog/:username/manage',
    element: (
      <Lazy>
        <BlogAdminLayout />
      </Lazy>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      // 无路径分组：子页崩溃隔离在博客管理壳内容区
      {
        errorElement: <RouteErrorFallback />,
        children: [
          {
            index: true,
            element: (
              <Lazy>
                <BlogManage />
              </Lazy>
            ),
          },
          {
            path: 'new',
            element: (
              <Lazy>
                <BlogEditor />
              </Lazy>
            ),
          },
          {
            path: 'edit/:id',
            element: (
              <Lazy>
                <BlogEditor />
              </Lazy>
            ),
          },
          {
            path: 'analytics',
            element: (
              <Lazy>
                <BlogAnalyticsPage />
              </Lazy>
            ),
          },
          {
            path: 'categories',
            element: (
              <Lazy>
                <BlogCategoriesPage />
              </Lazy>
            ),
          },
          {
            path: 'settings',
            element: (
              <Lazy>
                <BlogSettingsPage />
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
  // Public reading shell (Chirpy / 简约)
  {
    path: '/blog/:username',
    element: (
      <Lazy>
        <BlogLayout />
      </Lazy>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      // 无路径分组：文章/列表崩溃隔离在博客阅读壳内容区
      {
        errorElement: <RouteErrorFallback />,
        children: [
          {
            index: true,
            element: (
              <Lazy>
                <BlogHome />
              </Lazy>
            ),
          },
          {
            path: 'categories',
            element: (
              <Lazy>
                <BlogCategoriesPublicPage />
              </Lazy>
            ),
          },
          {
            path: 'archives',
            element: (
              <Lazy>
                <BlogArchivesPage />
              </Lazy>
            ),
          },
          {
            path: 'about',
            element: (
              <Lazy>
                <BlogAboutPage />
              </Lazy>
            ),
          },
          {
            path: 'friends',
            element: (
              <Lazy>
                <BlogFriendsPage />
              </Lazy>
            ),
          },
          {
            path: ':slug',
            element: (
              <Lazy>
                <BlogArticlePage />
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
]
