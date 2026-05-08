from django.contrib import admin
from .models import User, Project, Task

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role']

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    filter_horizontal = ['members']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'assigned_to', 'status', 'due_date']
    list_filter = ['status', 'project']
    fields = ['title', 'description', 'project', 'assigned_to', 'status', 'due_date', 'note', 'attachment']
