import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { AuthProvider, RedirectIfAuthed, RequireAdmin, RequireAuth } from '@/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppShell } from '@/layouts/AppShell'
import { ActivityPage } from '@/pages/ActivityPage'
import { AcademicsHubPage } from '@/features/academics/AcademicsHubPage'
import { QuestionBankPage } from '@/features/academics/QuestionBankPage'
import { StructurePage } from '@/features/academics/StructurePage'
import { SyllabusDetailPage } from '@/features/academics/SyllabusDetailPage'
import { CourseUploadPage } from '@/features/academics/CourseUploadPage'
import { AcademicCourseDetailPage } from '@/features/academics/AcademicCourseDetailPage'
import { SyllabusListPage } from '@/features/academics/SyllabusListPage'
import { CourseDetailPage } from '@/features/courses/CourseDetailPage'
import { CoursesListPage } from '@/features/courses/CoursesListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InstructorsPage } from '@/pages/InstructorsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PapersPage } from '@/pages/PapersPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StudentDetailPage } from '@/pages/StudentDetailPage'
import { StudentsPage } from '@/pages/StudentsPage'

function RouteBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <RouteBoundary>
                <DashboardPage />
              </RouteBoundary>
            }
          />

          <Route
            path="/papers"
            element={
              <RouteBoundary>
                <PapersPage />
              </RouteBoundary>
            }
          />
          <Route
            path="/papers/:id"
            element={
              <RouteBoundary>
                <PapersPage />
              </RouteBoundary>
            }
          />

          <Route
            path="/courses"
            element={
              <RouteBoundary>
                <CoursesListPage />
              </RouteBoundary>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <RouteBoundary>
                <CourseDetailPage />
              </RouteBoundary>
            }
          />

          <Route
            path="/academics"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <AcademicsHubPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/structure"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <StructurePage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/courses"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <CourseUploadPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/courses/:code"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <AcademicCourseDetailPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/syllabus"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <SyllabusListPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/syllabus/:slug"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <SyllabusDetailPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />
          <Route
            path="/academics/question-bank"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <QuestionBankPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />

          <Route
            path="/students"
            element={
              <RouteBoundary>
                <StudentsPage />
              </RouteBoundary>
            }
          />
          <Route
            path="/students/:id"
            element={
              <RouteBoundary>
                <StudentDetailPage />
              </RouteBoundary>
            }
          />

          <Route
            path="/instructors"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <InstructorsPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />

          <Route
            path="/reports"
            element={
              <RouteBoundary>
                <ReportsPage />
              </RouteBoundary>
            }
          />
          <Route
            path="/activity"
            element={
              <RouteBoundary>
                <ActivityPage />
              </RouteBoundary>
            }
          />
          <Route
            path="/profile"
            element={
              <RouteBoundary>
                <ProfilePage />
              </RouteBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAdmin>
                <RouteBoundary>
                  <SettingsPage />
                </RouteBoundary>
              </RequireAdmin>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
