from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import User, Project, Task
from .serializers import UserSerializer, ProjectSerializer, TaskSerializer
from django.contrib.auth import authenticate, login, logout
from rest_framework.views import APIView

# Frontend View
def dashboard(request):
    return render(request, 'dashboard.html')

# API Views
class AuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        action = request.data.get('action')
        if action == 'register':
            serializer = UserSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                login(request, user)
                return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif action == 'login':
            username = request.data.get('username')
            password = request.data.get('password')
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                return Response(UserSerializer(user).data)
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        elif action == 'logout':
            logout(request)
            return Response({'success': 'Logged out'})

from datetime import date
from rest_framework.exceptions import PermissionDenied

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

from django.db.models import Q

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return Project.objects.all()
        return Project.objects.filter(Q(members=self.request.user) | Q(tasks__assigned_to=self.request.user)).distinct()

    def perform_create(self, serializer):
        if self.request.user.role != 'ADMIN':
            raise PermissionDenied("Only admins can create projects.")
        project = serializer.save()
        project.members.add(self.request.user)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['project', 'status', 'assigned_to']

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return Task.objects.all()
        # Members see tasks in projects they are part of, or tasks explicitly assigned to them
        return Task.objects.filter(Q(project__members=self.request.user) | Q(assigned_to=self.request.user)).distinct()

    def perform_create(self, serializer):
        if self.request.user.role != 'ADMIN':
            raise PermissionDenied("Only admins can create tasks.")
        serializer.save()

    def perform_update(self, serializer):
        # Members can only update status
        if self.request.user.role != 'ADMIN':
            if 'title' in self.request.data or 'description' in self.request.data:
                raise PermissionDenied("Members can only update task status.")
        serializer.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.filter_queryset(self.get_queryset())
        total = qs.count()
        done = qs.filter(status='DONE').count()
        overdue = qs.filter(due_date__lt=date.today()).exclude(status='DONE').count()
        
        # 'To Do' is now everything that is not done and not overdue
        todo = total - done - overdue
        
        return Response({
            'total': total,
            'todo': todo,
            'done': done,
            'overdue': overdue
        })
