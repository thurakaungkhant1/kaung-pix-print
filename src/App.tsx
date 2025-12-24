import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import LoadingScreen from "@/components/LoadingScreen";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Photo = lazy(() => import("./pages/Photo"));
const Favourite = lazy(() => import("./pages/Favourite"));
const Account = lazy(() => import("./pages/Account"));
const AIChat = lazy(() => import("./pages/AIChat"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const PhotoDetail = lazy(() => import("./pages/PhotoDetail"));
const CategoryProducts = lazy(() => import("./pages/CategoryProducts"));
const GamePage = lazy(() => import("./pages/GamePage"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Exchange = lazy(() => import("./pages/Exchange"));
const Cart = lazy(() => import("./pages/Cart"));
const PointHistory = lazy(() => import("./pages/PointHistory"));
const TopEarners = lazy(() => import("./pages/TopEarners"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));

const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ProductsManage = lazy(() => import("./pages/admin/ProductsManage"));
const ProductNew = lazy(() => import("./pages/admin/ProductNew"));
const DiamondPackages = lazy(() => import("./pages/admin/DiamondPackages"));
const DiamondPackageForm = lazy(() => import("./pages/admin/DiamondPackageForm"));
const PhotosManage = lazy(() => import("./pages/admin/PhotosManage"));
const PhotoNew = lazy(() => import("./pages/admin/PhotoNew"));
const OrdersManage = lazy(() => import("./pages/admin/OrdersManage"));
const UsersManage = lazy(() => import("./pages/admin/UsersManage"));
const WithdrawalSettings = lazy(() => import("./pages/admin/WithdrawalSettings"));
const WithdrawalItemsManage = lazy(() => import("./pages/admin/WithdrawalItemsManage"));
const PremiumUsersManage = lazy(() => import("./pages/admin/PremiumUsersManage"));
const PremiumPlansManage = lazy(() => import("./pages/admin/PremiumPlansManage"));
const PremiumRequestsManage = lazy(() => import("./pages/admin/PremiumRequestsManage"));
const ReportsManage = lazy(() => import("./pages/admin/ReportsManage"));

const queryClient = new QueryClient();

// Suspense fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  const [showLoading, setShowLoading] = useState(true);

  if (showLoading) {
    return <LoadingScreen onLoadComplete={() => setShowLoading(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/photo"
                  element={
                    <ProtectedRoute>
                      <Photo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/favourite"
                  element={
                    <ProtectedRoute>
                      <Favourite />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-chat"
                  element={
                    <ProtectedRoute>
                      <AIChat />
                    </ProtectedRoute>
                  }
                />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/photo/:id" element={<PhotoDetail />} />
                <Route
                  path="/category/:category"
                  element={
                    <ProtectedRoute>
                      <CategoryProducts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game"
                  element={
                    <ProtectedRoute>
                      <GamePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <ProtectedRoute>
                      <Terms />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contact"
                  element={
                    <ProtectedRoute>
                      <Contact />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/products"
                  element={
                    <ProtectedAdminRoute>
                      <ProductsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/products/new"
                  element={
                    <ProtectedAdminRoute>
                      <ProductNew />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/diamond-packages"
                  element={
                    <ProtectedAdminRoute>
                      <DiamondPackages />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/diamond-packages/new"
                  element={
                    <ProtectedAdminRoute>
                      <DiamondPackageForm />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/diamond-packages/edit/:id"
                  element={
                    <ProtectedAdminRoute>
                      <DiamondPackageForm />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/photos"
                  element={
                    <ProtectedAdminRoute>
                      <PhotosManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/photos/new"
                  element={
                    <ProtectedAdminRoute>
                      <PhotoNew />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedAdminRoute>
                      <OrdersManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedAdminRoute>
                      <UsersManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/withdrawal-settings"
                  element={
                    <ProtectedAdminRoute>
                      <WithdrawalSettings />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/withdrawal-items"
                  element={
                    <ProtectedAdminRoute>
                      <WithdrawalItemsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/premium-users"
                  element={
                    <ProtectedAdminRoute>
                      <PremiumUsersManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/premium-plans"
                  element={
                    <ProtectedAdminRoute>
                      <PremiumPlansManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/premium-requests"
                  element={
                    <ProtectedAdminRoute>
                      <PremiumRequestsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedAdminRoute>
                      <ReportsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/exchange"
                  element={
                    <ProtectedRoute>
                      <Exchange />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/point-history"
                  element={
                    <ProtectedRoute>
                      <PointHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/top-earners"
                  element={
                    <ProtectedRoute>
                      <TopEarners />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <PublicProfile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;