import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileQuestion,
  FileText,
  GraduationCap,
  Home,
  Keyboard,
  LineChart,
  LogOut,
  Plus,
  Library,
  ScrollText,
  Search as SearchIcon,
  Settings,
  UserCog,
  Users,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { fetchCourses, fetchStudents } from '@/api'
import { useAuth } from '@/auth'
import type { Course, Student } from '@/types'

export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onShowShortcuts?: () => void
}) {
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const isAdmin = role === 'admin'
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    if (!open) return
    void fetchCourses()
      .then(setCourses)
      .catch(() => undefined)
    void fetchStudents()
      .then((s) => setStudents(s.slice(0, 8)))
      .catch(() => undefined)
  }, [open])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const go = useCallback(
    (path: string) => {
      navigate(path)
      close()
    },
    [navigate, close],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden border-border/70 p-0 shadow-[0_1px_2px_hsl(var(--brand-shadow)/0.05),0_30px_60px_-20px_hsl(var(--brand-shadow)/0.35)] sm:max-w-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          shouldFilter
          loop
          className="bg-popover"
          filter={(value, search) => {
            if (!search) return 1
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          <CommandInput placeholder="Type a command, page, or search…" />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6">
                <SearchIcon className="size-5 text-muted-foreground" />
                <p className="text-sm font-medium">No matches</p>
                <p className="text-xs text-muted-foreground">
                  Try a page name, action, or student ID
                </p>
              </div>
            </CommandEmpty>

            <CommandGroup heading="Navigate">
              <CommandItem value="dashboard" onSelect={() => go('/dashboard')}>
                <Home className="size-4 text-muted-foreground" /> Dashboard
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem value="papers" onSelect={() => go('/papers')}>
                <FileText className="size-4 text-muted-foreground" /> Papers
                <CommandShortcut>G P</CommandShortcut>
              </CommandItem>
              <CommandItem value="courses" onSelect={() => go('/courses')}>
                <BookOpen className="size-4 text-muted-foreground" /> Courses
                <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
              <CommandItem value="students" onSelect={() => go('/students')}>
                <Users className="size-4 text-muted-foreground" /> Students
                <CommandShortcut>G S</CommandShortcut>
              </CommandItem>
              {isAdmin ? (
                <>
                  <CommandItem
                    value="instructors"
                    onSelect={() => go('/instructors')}
                  >
                    <UserCog className="size-4 text-muted-foreground" /> Instructors
                    <CommandShortcut>G I</CommandShortcut>
                  </CommandItem>
                  <CommandItem value="academics overview" onSelect={() => go('/academics')}>
                    <GraduationCap className="size-4 text-muted-foreground" /> Academics
                    <CommandShortcut>G Y</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    value="academic structure colleges departments"
                    onSelect={() => go('/academics/structure')}
                  >
                    <Building2 className="size-4 text-muted-foreground" /> Academic structure
                  </CommandItem>
                  <CommandItem value="upload course academic courses" onSelect={() => go('/academics/courses')}>
                    <Library className="size-4 text-muted-foreground" /> Upload course
                  </CommandItem>
                  <CommandItem value="syllabus" onSelect={() => go('/academics/syllabus')}>
                    <ScrollText className="size-4 text-muted-foreground" /> Syllabus
                  </CommandItem>
                  <CommandItem
                    value="question bank"
                    onSelect={() => go('/academics/question-bank')}
                  >
                    <FileQuestion className="size-4 text-muted-foreground" /> Question bank
                  </CommandItem>
                </>
              ) : null}
              <CommandItem value="reports" onSelect={() => go('/reports')}>
                <LineChart className="size-4 text-muted-foreground" /> Reports
                <CommandShortcut>G R</CommandShortcut>
              </CommandItem>
              <CommandItem value="profile" onSelect={() => go('/profile')}>
                <UserCog className="size-4 text-muted-foreground" /> Profile
              </CommandItem>
              {isAdmin ? (
                <CommandItem value="settings" onSelect={() => go('/settings')}>
                  <Settings className="size-4 text-muted-foreground" /> Settings
                </CommandItem>
              ) : null}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                value="create-course new course"
                onSelect={() => go('/courses?new=1')}
              >
                <Plus className="size-4 text-muted-foreground" /> Create new
                course
              </CommandItem>
              <CommandItem
                value="review pending papers"
                onSelect={() => go('/papers?status=pending_review')}
              >
                <FileText className="size-4 text-muted-foreground" /> Review
                pending papers
              </CommandItem>
              {onShowShortcuts ? (
                <CommandItem
                  value="keyboard shortcuts"
                  onSelect={() => {
                    close()
                    onShowShortcuts()
                  }}
                >
                  <Keyboard className="size-4 text-muted-foreground" /> Keyboard
                  shortcuts
                  <CommandShortcut>?</CommandShortcut>
                </CommandItem>
              ) : null}
              <CommandItem
                value="sign out logout"
                onSelect={() => {
                  signOut()
                  close()
                }}
              >
                <LogOut className="size-4 text-muted-foreground" /> Sign out
              </CommandItem>
            </CommandGroup>

            {courses.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Jump to course">
                  {courses.slice(0, 8).map((c) => (
                    <CommandItem
                      key={c._id}
                      value={`course ${c.title} ${c.code ?? ''} ${c.subtitle ?? ''}`}
                      onSelect={() => go(`/courses/${c._id}`)}
                    >
                      <BookOpen className="size-4 text-muted-foreground" />
                      <span className="truncate">{c.title}</span>
                      {c.code ? (
                        <span className="ml-1 truncate text-xs text-muted-foreground">
                          · {c.code}
                        </span>
                      ) : null}
                      <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {students.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Jump to student">
                  {students.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`student ${s.name ?? ''} ${s.email ?? ''} ${s.id}`}
                      onSelect={() => go(`/students/${s.id}`)}
                    >
                      <Users className="size-4 text-muted-foreground" />
                      <span className="truncate">
                        {s.name ?? s.email ?? s.id}
                      </span>
                      <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
