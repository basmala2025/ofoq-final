import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminDataService, User, Course } from '../../services/admin';
import { Router } from '@angular/router';
const storedId = localStorage.getItem('userId');
@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-management.html', // Link to your HTML file
  styleUrls: ['./admin-management.css']
})
export class AdminManagement {
  // Service & Form Builder Injection
  public dataService = inject(AdminDataService); // Public to allow direct access from HTML
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // UI State Signals
  activeTab = signal<'users' | 'courses'>('users');
  selectedRoleFilter = signal<string>('all');

  // Modals Visibility
  showUserModal = signal<boolean>(false);
  showCourseModal = signal<boolean>(false);

  // Currently selected items for editing/viewing
  editingUser = signal<User | null>(null);
  editingCourse = signal<Course | null>(null);
  viewingUser = signal<User | null>(null);

  // Forms
  userForm!: FormGroup;
  courseForm!: FormGroup;

  // Filter Categories
  roles = [
    { id: 'all', label: 'All Members' },
    { id: 'Student', label: 'Students' },
    { id: 'Professor', label: 'Professors' },
    { id: 'TA', label: 'Teaching Assistants' },
    { id: 'Admin', label: 'Admins' }
  ];

searchQuery = signal<string>('');

filteredUsers = computed(() => {
  const filter = this.selectedRoleFilter();
  const query = this.searchQuery().toLowerCase().trim();
  const allUsers = this.dataService.users();

  return allUsers.filter(u => {
    const matchesRole = filter === 'all' || u.role === filter;

    const matchesSearch = u.fullName.toLowerCase().includes(query) ||
                          u.email.toLowerCase().includes(query);

    return matchesRole && matchesSearch;
  });
});

onSearch(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  this.searchQuery.set(value);
}

  // Filtered lists for professors and TAs
  professors = computed(() => this.dataService.users().filter(u => u.role === 'Professor'));
  tas = computed(() => this.dataService.users().filter(u => u.role === 'TA'));

  constructor() {
    this.initForms();
  }

  // Initialize Reactive Forms
  private initForms() {
    this.userForm = this.fb.group({
      fullName: [''], // Using fullName to match the PUT request requirements
      email: ['', [Validators.required, Validators.email]],
      role: ['Student', Validators.required]
    });

    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      professorIds: [[]], // Array of strings for assigned professors
      taIds: [[]]         // Array of strings for assigned TAs
    });
  }

  // ================= TABS & MODALS LOGIC =================

  // Switch between Users and Courses management tabs
  switchTab(tab: 'users' | 'courses') {
    this.activeTab.set(tab);
  }

  // Open modal for creating a new user or course
  openCreateModal() {
    if (this.activeTab() === 'users') {
      this.editingUser.set(null);
      this.userForm.reset({ role: 'Student' });
      this.showUserModal.set(true);
    } else {
      this.editingCourse.set(null);
      this.courseForm.reset({ professorIds: [], taIds: [] });
      this.showCourseModal.set(true);
    }
  }

  // ================= USERS LOGIC =================

  // Open modal to edit existing user data
  openEditUser(user: User) {
    this.editingUser.set(user);
    this.userForm.patchValue({
      fullName: user.fullName, // Mapping to the correct property
      email: user.email,
      role: user.role
    });
    this.showUserModal.set(true);
  }

  // Handle user deletion with confirmation
  deleteUser(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.dataService.deleteUser(userId).subscribe();
    }
  }

currentAdmin = computed(() => {
    const allUsers = this.dataService.users();
    const myId = localStorage.getItem('userId');

    if (!myId) return null;

    return allUsers.find(u => u.userId === myId) || null;
  });
  // View specific user details in a summary/modal
  viewUserDetails(user?: User) {
  if (user) {
    this.viewingUser.set(user);
  } else {
    this.viewingUser.set(this.currentAdmin() || null);
  }
}

  // Handle User Form submission (Invite or Update)
  submitUser() {
    if (this.userForm.invalid) return;

    const formValue = this.userForm.value; // Expected: { fullName, email, role }
    const currentUser = this.editingUser();

    if (currentUser) {
      // Edit Mode - Send PUT request
      this.dataService.updateUser(currentUser.userId, formValue).subscribe(() => {
        this.showUserModal.set(false);
      });
    } else {
      // Create Mode - Send Invite via Admin ID
      const currentAdminId = "666d6b51-219a-43bd-a180-65a281ee1acb";

      this.dataService.inviteUser(formValue.email, formValue.role, currentAdminId).subscribe(() => {
        this.showUserModal.set(false);
      });
    }
  }

  // ================= COURSES LOGIC =================

  // Open modal to edit existing course data
  openEditCourse(course: Course) {
    this.editingCourse.set(course);
    this.courseForm.patchValue({
      title: course.title,
      code: course.code,
      description: course.description,
      professorIds: course.professorIds || [],
      taIds: course.taIds || []
    });
    this.showCourseModal.set(true);
  }

  // Delete course based on ID
  deleteCourse(id: string | undefined) {
    if (id && confirm('Are you sure you want to delete this course?')) {
      this.dataService.deleteCourse(id).subscribe();
    }
  }

  // Handle Course Form submission (Create or Update)
  submitCourse() {
    if (this.courseForm.invalid) return;

    const formValue = this.courseForm.value;
    const currentCourse = this.editingCourse();
    console.log('Course Payload:', this.courseForm.value);

    if (currentCourse && currentCourse.courseId) {
      // Edit Mode - Send PUT request
      this.dataService.updateCourse(currentCourse.courseId, formValue).subscribe(() => {
        this.showCourseModal.set(false);
      });
    } else {
      // Create Mode - Send POST request
      this.dataService.createCourse(formValue).subscribe(() => {
        this.showCourseModal.set(false);
      });
    }
  }

  // === Course Staff Selection Logic (Custom UI Array Handlers) ===

  // Toggle selection of Professor/TA in the course form
  toggleSelection(staffId: string, formControlName: 'professorIds' | 'taIds') {
    const currentArray: string[] = this.courseForm.get(formControlName)?.value || [];
    const index = currentArray.indexOf(staffId);

    if (index === -1) {
      // Add to selection
      this.courseForm.patchValue({ [formControlName]: [...currentArray, staffId] });
    } else {
      // Remove from selection
      const newArray = currentArray.filter(id => id !== staffId);
      this.courseForm.patchValue({ [formControlName]: newArray });
    }
  }

  // Check if a specific staff member is currently selected in the form
  isStaffSelected(staffId: string, formControlName: 'professorIds' | 'taIds'): boolean {
    const currentArray: string[] = this.courseForm.get(formControlName)?.value || [];
    return currentArray.includes(staffId);
  }

  // Get display names for assigned staff based on their IDs
  getStaffNames(ids: string[] | undefined): string {
    if (!ids || ids.length === 0) return 'Not Assigned';
    const allUsers = this.dataService.users();

    // Map IDs to full names using userId for lookup
    return ids.map(id => allUsers.find(u => u.userId === id)?.fullName || 'Unknown').join(', ');
  }

  // ================= HELPERS FOR HTML TEMPLATE =================

  // Return CSS class based on user role
  getRoleClass(role: string): string {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Professor': return 'role-prof';
      case 'TA': return 'role-ta';
      default: return 'role-student';
    }
  }

  // Return formatted display text for roles
  getRoleText(role: string | undefined): string {
    if (!role) return 'Unknown';
    if (role === 'TA') return 'Teaching Assistant';
    return role;
  }

  // Retrieve course IDs associated with a specific user
  getUserCourses(user: User | null | undefined): string[] {
    if (!user) return [];

    // Filter courses where the user is listed as a professor or TA
    return this.dataService.courses()
      .filter(c =>
        (c.professorIds && c.professorIds.includes(user.userId)) ||
        (c.taIds && c.taIds.includes(user.userId))
      )
      .map(c => c.courseId as string);
  }

  // Helper to get course title by ID
  getCourseTitle(courseId: string): string {
    return this.dataService.courses().find(c => c.courseId === courseId)?.title || 'Unknown Course';
  }

  // Helper to get course code by ID
  getCourseCode(courseId: string): string {
    return this.dataService.courses().find(c => c.courseId === courseId)?.code || '';
  }

  // Logout function
  onLogout() {
    console.log('Logging out...');

    // 1. Remove Token and user data from storage
    localStorage.removeItem('token');

    // (Optional) Clear all storage if needed:
    // localStorage.clear();

    // 2. Redirect user to Login page
    this.router.navigate(['/login']);
  }
}
