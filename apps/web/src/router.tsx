import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProjectLayout } from '@/layouts/ProjectLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ModuleEmptyPage } from '@/pages/ModuleEmptyPage';
import { ModuleView } from '@/pages/ModuleView';
import { ProjectsListPage } from '@/pages/ProjectsListPage';
import { RegisterPage } from '@/pages/RegisterPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <ProjectsListPage /> },
      {
        path: '/p/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <ModuleEmptyPage /> },
          { path: 'm/:moduleId', element: <ModuleView /> },
        ],
      },
    ],
  },
]);
