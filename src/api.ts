import { API_BASE } from './config'
import type {
  AcademicCollege,
  AcademicDepartment,
  AcademicQuestion,
  AcademicSubject,
  AcademicSubjectSummary,
  AcademicYear,
  AcademicsOverview,
  BootstrapResult,
  Course,
  CourseListItem,
  CourseWritePayload,
  CourseModule,
  CurriculumCourse,
  Enrollment,
  Instructor,
  StaffProfile,
  Lesson,
  LessonWritePayload,
  LoginResponse,
  ModuleWritePayload,
  Paper,
  Resource,
  Student,
  AcademicCourse,
  AcademicCourseDetail,
  CourseUploadResult,
  SubjectImportResult,
  AppCatalogSyncResult,
} from './types'

const TOKEN_KEY = 'exam_admin_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json')

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = (await res.json()) as { message?: string | string[] }
      msg = typeof j.message === 'string' ? j.message : JSON.stringify(j.message ?? j)
    } catch {
      /* ignore */
    }
    throw new Error(msg || `Request failed (${res.status})`)
  }

  const ct = res.headers.get('content-type')
  if (ct?.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

// --- Auth -----------------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// --- Students -------------------------------------------------------------

export async function fetchStudents(): Promise<Student[]> {
  return request<Student[]>('/students')
}

export async function fetchStudent(id: string): Promise<Student> {
  return request<Student>(`/students/${id}`)
}

export async function fetchStudentAvatar(id: string): Promise<Blob | null> {
  const token = getStoredToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_BASE}/students/${id}/avatar`, { headers })
  if (!res.ok) return null
  return res.blob()
}

// --- Instructors ------------------------------------------------------------

export async function fetchInstructors(): Promise<Instructor[]> {
  return request<Instructor[]>('/instructors')
}

export async function fetchMyProfile(): Promise<StaffProfile> {
  return request<StaffProfile>('/users/me')
}

export async function updateMyProfile(body: {
  name: string
  whatsappNumber: string
}): Promise<StaffProfile> {
  return request<StaffProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

// --- Papers (Exam Evaluation) --------------------------------------------

export async function fetchPapers(): Promise<Paper[]> {
  return request<Paper[]>('/papers')
}

export async function fetchPaper(id: string): Promise<Paper> {
  return request<Paper>(`/papers/${id}`)
}

export async function reviewPaper(
  id: string,
  feedback: unknown,
  approve: boolean,
): Promise<Paper> {
  return request<Paper>(`/papers/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ feedback, approve }),
  })
}

export async function fetchAuthorizedImageBlob(
  paperId: string,
  index: number,
): Promise<string> {
  const token = getStoredToken()
  const res = await fetch(
    `${API_BASE}/papers/${paperId}/images/${index}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )
  if (!res.ok) throw new Error('Failed to load image')
  const b = await res.blob()
  return URL.createObjectURL(b)
}

// --- LMS: Courses ---------------------------------------------------------

export async function fetchCourses(): Promise<CourseListItem[]> {
  return request<CourseListItem[]>('/courses')
}

export async function fetchCourse(id: string): Promise<Course> {
  return request<Course>(`/courses/${id}`)
}

export async function fetchCurriculum(id: string): Promise<CurriculumCourse> {
  return request<CurriculumCourse>(`/courses/${id}/curriculum`)
}

export async function createCourse(body: CourseWritePayload): Promise<Course> {
  return request<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCourse(
  id: string,
  body: Partial<CourseWritePayload>,
): Promise<Course> {
  return request<Course>(`/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteCourse(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/courses/${id}`, { method: 'DELETE' })
}

// --- LMS: Modules ---------------------------------------------------------

export async function fetchModules(courseId: string): Promise<CourseModule[]> {
  return request<CourseModule[]>(`/courses/${courseId}/modules`)
}

export async function createModule(
  courseId: string,
  body: ModuleWritePayload,
): Promise<CourseModule> {
  return request<CourseModule>(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateModule(
  id: string,
  body: Partial<ModuleWritePayload>,
): Promise<CourseModule> {
  return request<CourseModule>(`/modules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteModule(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/modules/${id}`, { method: 'DELETE' })
}

export async function reorderModules(
  courseId: string,
  moduleIds: string[],
): Promise<CourseModule[]> {
  return request<CourseModule[]>(`/courses/${courseId}/modules/reorder`, {
    method: 'POST',
    body: JSON.stringify({ moduleIds }),
  })
}

// --- LMS: Lessons ---------------------------------------------------------

export async function fetchLessons(moduleId: string): Promise<Lesson[]> {
  return request<Lesson[]>(`/modules/${moduleId}/lessons`)
}

export async function createLesson(
  moduleId: string,
  body: LessonWritePayload,
): Promise<Lesson> {
  return request<Lesson>(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateLesson(
  id: string,
  body: Partial<LessonWritePayload>,
): Promise<Lesson> {
  return request<Lesson>(`/lessons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteLesson(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/lessons/${id}`, { method: 'DELETE' })
}

export async function reorderLessons(
  moduleId: string,
  lessonIds: string[],
): Promise<Lesson[]> {
  return request<Lesson[]>(`/modules/${moduleId}/lessons/reorder`, {
    method: 'POST',
    body: JSON.stringify({ lessonIds }),
  })
}

// --- LMS: Resources -------------------------------------------------------

export async function fetchResources(filter: {
  courseId?: string
  moduleId?: string
  lessonId?: string
}): Promise<Resource[]> {
  const qs = new URLSearchParams()
  if (filter.courseId) qs.set('courseId', filter.courseId)
  if (filter.moduleId) qs.set('moduleId', filter.moduleId)
  if (filter.lessonId) qs.set('lessonId', filter.lessonId)
  const query = qs.toString()
  return request<Resource[]>(`/resources${query ? `?${query}` : ''}`)
}

export async function createResource(body: {
  courseId: string
  moduleId?: string
  lessonId?: string
  kind: 'link' | 'note'
  title: string
  description?: string
  url?: string
  body?: string
  order?: number
}): Promise<Resource> {
  return request<Resource>('/resources', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function uploadResource(args: {
  courseId: string
  moduleId?: string
  lessonId?: string
  title: string
  description?: string
  file: File
}): Promise<Resource> {
  const fd = new FormData()
  fd.append('courseId', args.courseId)
  if (args.moduleId) fd.append('moduleId', args.moduleId)
  if (args.lessonId) fd.append('lessonId', args.lessonId)
  fd.append('title', args.title)
  if (args.description) fd.append('description', args.description)
  fd.append('file', args.file)
  return request<Resource>('/resources/upload', {
    method: 'POST',
    body: fd,
  })
}

export async function updateResource(
  id: string,
  body: Partial<{
    title: string
    description: string
    url: string
    body: string
    order: number
  }>,
): Promise<Resource> {
  return request<Resource>(`/resources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteResource(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/resources/${id}`, { method: 'DELETE' })
}

export function resourceFileUrl(id: string): string {
  return `${API_BASE}/resources/${id}/file`
}

// --- LMS: Enrollments ----------------------------------------------------

export async function fetchCourseEnrollments(
  courseId: string,
): Promise<Enrollment[]> {
  return request<Enrollment[]>(`/courses/${courseId}/enrollments`)
}

export async function adminEnroll(
  studentId: string,
  courseId: string,
): Promise<Enrollment> {
  return request<Enrollment>('/enrollments/admin', {
    method: 'POST',
    body: JSON.stringify({ studentId, courseId }),
  })
}

export async function removeEnrollment(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/enrollments/${id}`, { method: 'DELETE' })
}

// --- Academics ------------------------------------------------------------

export async function fetchAcademicsOverview(): Promise<AcademicsOverview> {
  return request<AcademicsOverview>('/academics/overview')
}

export async function bootstrapAcademics(): Promise<BootstrapResult> {
  return request<BootstrapResult>('/academics/bootstrap', { method: 'POST' })
}

export async function syncAppCatalog(): Promise<AppCatalogSyncResult> {
  return request<AppCatalogSyncResult>('/academics/sync-app-catalog', {
    method: 'POST',
  })
}

export async function fetchAcademicDepartments(): Promise<AcademicDepartment[]> {
  return request<AcademicDepartment[]>('/academics/departments')
}

export async function createAcademicDepartment(
  body: Pick<AcademicDepartment, 'slug' | 'name'> &
    Partial<Pick<AcademicDepartment, 'nameBn' | 'sortOrder'>>,
): Promise<AcademicDepartment> {
  return request<AcademicDepartment>('/academics/departments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateAcademicDepartment(
  slug: string,
  body: Partial<Pick<AcademicDepartment, 'slug' | 'name' | 'nameBn' | 'sortOrder'>>,
): Promise<AcademicDepartment> {
  return request<AcademicDepartment>(`/academics/departments/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteAcademicDepartment(slug: string): Promise<void> {
  await request(`/academics/departments/${slug}`, { method: 'DELETE' })
}

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  return request<AcademicYear[]>('/academics/years')
}

export async function createAcademicYear(
  body: Pick<AcademicYear, 'slug' | 'label'> &
    Partial<Pick<AcademicYear, 'labelBn' | 'sortOrder'>>,
): Promise<AcademicYear> {
  return request<AcademicYear>('/academics/years', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateAcademicYear(
  slug: string,
  body: Partial<Pick<AcademicYear, 'slug' | 'label' | 'labelBn' | 'sortOrder'>>,
): Promise<AcademicYear> {
  return request<AcademicYear>(`/academics/years/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteAcademicYear(slug: string): Promise<void> {
  await request(`/academics/years/${slug}`, { method: 'DELETE' })
}

export async function fetchAcademicColleges(): Promise<AcademicCollege[]> {
  return request<AcademicCollege[]>('/academics/colleges')
}

export async function createAcademicCollege(
  body: Pick<AcademicCollege, 'slug' | 'name'> &
    Partial<Pick<AcademicCollege, 'nameBn' | 'district' | 'sortOrder'>>,
): Promise<AcademicCollege> {
  return request<AcademicCollege>('/academics/colleges', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateAcademicCollege(
  slug: string,
  body: Partial<
    Pick<AcademicCollege, 'slug' | 'name' | 'nameBn' | 'district' | 'sortOrder'>
  >,
): Promise<AcademicCollege> {
  return request<AcademicCollege>(`/academics/colleges/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteAcademicCollege(slug: string): Promise<void> {
  await request(`/academics/colleges/${slug}`, { method: 'DELETE' })
}

export async function fetchAcademicSubjects(params?: {
  departmentId?: string
  yearId?: string
}): Promise<AcademicSubjectSummary[]> {
  const q = new URLSearchParams()
  if (params?.departmentId) q.set('departmentId', params.departmentId)
  if (params?.yearId) q.set('yearId', params.yearId)
  const suffix = q.toString() ? `?${q}` : ''
  return request<AcademicSubjectSummary[]>(`/academics/subjects${suffix}`)
}

export async function fetchAcademicSubject(slug: string): Promise<AcademicSubject> {
  return request<AcademicSubject>(`/academics/subjects/${slug}`)
}

export async function updateAcademicSubject(
  slug: string,
  body: Partial<AcademicSubject>,
): Promise<AcademicSubject> {
  return request<AcademicSubject>(`/academics/subjects/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteAcademicSubject(slug: string): Promise<void> {
  await request(`/academics/subjects/${slug}`, { method: 'DELETE' })
}

export async function fetchAcademicCourses(): Promise<AcademicCourse[]> {
  return request<AcademicCourse[]>('/academics/courses')
}

export async function fetchAcademicCourse(code: string): Promise<AcademicCourseDetail> {
  return request<AcademicCourseDetail>(`/academics/courses/${encodeURIComponent(code)}`)
}

export async function updateAcademicCourse(
  code: string,
  body: Partial<
    Pick<
      AcademicCourseDetail,
      | 'title'
      | 'titleBn'
      | 'marks'
      | 'credits'
      | 'classHours'
      | 'examDuration'
      | 'orientation'
      | 'description'
      | 'introduction'
      | 'objectives'
      | 'outcomes'
      | 'prescribedTexts'
      | 'outline'
      | 'labDetails'
      | 'books'
      | 'status'
    >
  >,
): Promise<AcademicCourseDetail> {
  return request<AcademicCourseDetail>(`/academics/courses/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function uploadAcademicCourse(input: {
  file: File
  yearId: string
  departmentIds: string[]
  status: 'draft' | 'ready'
}): Promise<CourseUploadResult> {
  const fd = new FormData()
  fd.append('file', input.file)
  fd.append('yearId', input.yearId)
  fd.append('departmentIds', JSON.stringify(input.departmentIds))
  fd.append('status', input.status)
  return request<CourseUploadResult>('/academics/courses/upload', {
    method: 'POST',
    body: fd,
  })
}

export async function deleteAcademicCourse(code: string): Promise<{ deleted: boolean }> {
  return request(`/academics/courses/${encodeURIComponent(code)}`, { method: 'DELETE' })
}

export async function linkAcademicCourse(
  code: string,
  body: { yearId: string; departmentIds: string[]; status?: 'draft' | 'ready' },
): Promise<{ created: number; linked: number }> {
  return request(`/academics/courses/${encodeURIComponent(code)}/link`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function importSyllabusFile(file: File): Promise<SubjectImportResult> {
  const fd = new FormData()
  fd.append('file', file)
  return request<SubjectImportResult>(
    '/academics/subjects/import?createMissingStructure=true',
    { method: 'POST', body: fd },
  )
}

export async function fetchAcademicQuestions(params?: {
  departmentId?: string
  yearId?: string
  subjectSlug?: string
}): Promise<AcademicQuestion[]> {
  const q = new URLSearchParams()
  if (params?.departmentId) q.set('departmentId', params.departmentId)
  if (params?.yearId) q.set('yearId', params.yearId)
  if (params?.subjectSlug) q.set('subjectSlug', params.subjectSlug)
  const suffix = q.toString() ? `?${q}` : ''
  return request<AcademicQuestion[]>(`/academics/questions${suffix}`)
}

export async function createAcademicQuestion(
  body: Omit<AcademicQuestion, '_id' | 'slug' | 'departmentId' | 'yearId' | 'updatedAt'> & {
    slug?: string
  },
): Promise<AcademicQuestion> {
  return request<AcademicQuestion>('/academics/questions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteAcademicQuestion(slug: string): Promise<void> {
  await request(`/academics/questions/${slug}`, { method: 'DELETE' })
}
