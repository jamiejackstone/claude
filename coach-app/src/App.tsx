import React from "react";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SessionPlanProvider } from "./context/SessionPlanContext";
import { DrillProvider } from "./context/DrillContext";
import { ScheduleProvider } from "./context/ScheduleContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Drills from "./pages/Drills";
import Registration from "./pages/Registration";

function ProtectedRoute({ children, adminOnly = false, ownerOnly = false, headCoachAndAbove = false }: { children: React.ReactNode, adminOnly?: boolean, ownerOnly?: boolean, headCoachAndAbove?: boolean }) {
  const { user, authReady } = useAuth();
  // Wait for the Cloudflare Access identity check before deciding.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-yellow/30 border-t-brand-yellow rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (ownerOnly && user.role !== "OWNER") return <Navigate to="/" replace />;
  if (adminOnly && user.role !== "ADMINISTRATOR" && user.role !== "OWNER") return <Navigate to="/" replace />;
  if (headCoachAndAbove && user.role !== "HEAD_COACH" && user.role !== "ADMINISTRATOR" && user.role !== "OWNER") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route 
          path="reports" 
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="drills" 
          element={
            <ProtectedRoute headCoachAndAbove>
              <Drills />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin" 
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          } 
        />
      </Route>
    </>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <SessionPlanProvider>
          <DrillProvider>
            <RouterProvider router={router} />
          </DrillProvider>
        </SessionPlanProvider>
      </ScheduleProvider>
    </AuthProvider>
  );
}

