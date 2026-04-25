import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ModulePage } from '@/pages/ModulePage';
import { ProjectPage } from '@/pages/ProjectPage';
import { ProjectsListPage } from '@/pages/ProjectsListPage';
import { RegisterPage } from '@/pages/RegisterPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <ProjectsListPage /> },
      { path: '/p/:projectId', element: <ProjectPage /> },
      { path: '/p/:projectId/m/:moduleId', element: <ModulePage /> },
    ],
  },
]);
